<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\NotificationSetting;
use App\Models\Schedule;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * ★ v18.38 — 일정 알림 발송 (5분마다 실행, routes/console.php에 등록)
 *
 * 일정마다 고른 알림 시간(reminder_time)이 되면 담당자에게 알림 피드 + 휴대폰 푸시를 보낸다.
 *   day_before_20 : 전날 오후 8시
 *   day_before_09 : 당일 오전 9시
 *   hour_before_1 : 시작 1시간 전 (시작 시간이 없으면 당일 오전 8시)
 *   none          : 보내지 않음
 * 한 번 보내면 reminder_sent_at을 기록 — 일정의 날짜/시간/알림설정을 바꾸면 다시 비워져서 새로 보냄.
 */
class SendScheduleReminders extends Command
{
    protected $signature = 'schedules:send-reminders';
    protected $description = '알림 시간이 된 일정의 담당자에게 일정 알림(피드+푸시) 발송';

    public function handle(): int
    {
        $now = now();

        $candidates = Schedule::with(['site:id,address,apt_name,dong,ho', 'workTypeRelation'])
            ->whereNull('reminder_sent_at')
            ->whereBetween('date', [$now->toDateString(), $now->copy()->addDay()->toDateString()])
            ->where(fn($q) => $q->whereNull('reminder_time')->orWhere('reminder_time', '!=', 'none'))
            ->get();

        $sent = 0;
        foreach ($candidates as $schedule) {
            $date = Carbon::parse($schedule->date)->startOfDay();
            $start = $schedule->start_time
                ? $date->copy()->setTimeFromTimeString($schedule->start_time)
                : $date->copy()->endOfDay();

            $target = match ($schedule->reminder_time ?? 'day_before_20') {
                'day_before_09' => $date->copy()->setTime(9, 0),
                'hour_before_1' => $schedule->start_time ? $start->copy()->subHour() : $date->copy()->setTime(8, 0),
                default         => $date->copy()->subDay()->setTime(20, 0),
            };

            // 아직 알림 시간이 안 됐거나, 일정이 이미 시작했으면(늦게 등록 등) 건너뜀
            if ($now->lt($target) || $now->gte($start)) {
                continue;
            }

            $recipients = $this->recipients($schedule);
            $body = $this->body($schedule, $date, $now);

            foreach ($recipients as $userId) {
                Notification::create([
                    'user_id'   => $userId,
                    'category'  => 'schedule',
                    'title'     => '일정 알림',
                    'body'      => $body,
                    'link_type' => 'schedule',
                    'link_id'   => $schedule->id,
                ]);
            }

            // Observer(공수 집계)를 돌릴 필요 없는 변경이라 조용히 저장
            $schedule->reminder_sent_at = $now;
            $schedule->saveQuietly();
            $sent++;
        }

        $this->info("일정 알림 {$sent}건 발송");
        return self::SUCCESS;
    }

    /** 배정된 인원 + 개인 일정 주인. 아무도 없으면 작성자. 일정 알림을 끈 사람은 제외. */
    private function recipients(Schedule $schedule): array
    {
        $ids = DB::table('schedule_users')->where('schedule_id', $schedule->id)->whereNull('deleted_at')->pluck('user_id')->all();
        if ($schedule->owner_id) {
            $ids[] = $schedule->owner_id;
        }
        if (empty($ids) && $schedule->created_by) {
            $ids[] = $schedule->created_by;
        }
        $ids = array_values(array_unique(array_map('intval', $ids)));

        $disabled = NotificationSetting::whereIn('user_id', $ids)
            ->where('schedule_reminder', false)
            ->pluck('user_id')->map(fn($v) => (int) $v)->all();

        return array_values(array_diff($ids, $disabled));
    }

    /** 예: "내일 09:00 · 판교테크원 101-1203 · 도배 일정이 있어요." */
    private function body(Schedule $schedule, Carbon $date, Carbon $now): string
    {
        $when = $date->isSameDay($now) ? '오늘' : '내일';
        if ($schedule->start_time) {
            $when .= ' ' . substr($schedule->start_time, 0, 5);
        }

        $site = $schedule->site;
        $place = $site
            ? (collect([$site->apt_name, $site->dong ? "{$site->dong}동" : null, $site->ho ? "{$site->ho}호" : null])->filter()->implode(' ') ?: $site->address)
            : ($schedule->address_detail ?: $schedule->address);

        $what = $schedule->title ?: ($schedule->workTypeRelation?->name ?? $schedule->work_type);

        return collect([$when, $place, $what])->filter()->implode(' · ') . ' 일정이 있어요.';
    }
}
