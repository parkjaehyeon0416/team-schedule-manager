<?php

namespace App\Observers;

use App\Models\Schedule;
use App\Services\MonthlySummaryService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ScheduleObserver
{
    public function saved(Schedule $schedule): void
    {
        $this->recalculateForAllParticipants($schedule);
    }

    public function deleted(Schedule $schedule): void
    {
        $this->recalculateForAllParticipants($schedule);
    }

    public function restored(Schedule $schedule): void
    {
        $this->recalculateForAllParticipants($schedule);
    }

    private function recalculateForAllParticipants(Schedule $schedule): void
    {
        if (!$schedule->date) {
            return;
        }

        // ★ 수정 — Carbon 객체를 format()으로 문자열 변환
        //   ($casts에 'date' => 'date:Y-m-d'가 있어서 date가 Carbon 객체로 옵니다)
        $yearMonth = $schedule->date instanceof \Carbon\Carbon
            ? $schedule->date->format('Y-m')
            : substr((string) $schedule->date, 0, 7);

        $userIds = DB::table('schedule_users')
            ->where('schedule_id', $schedule->id)
            ->whereNull('deleted_at')
            ->pluck('user_id')
            ->unique();

        foreach ($userIds as $userId) {
            try {
                MonthlySummaryService::recalculate((int) $userId, $yearMonth);
            } catch (\Exception $e) {
                Log::error('ScheduleObserver 재계산 실패', [
                    'user_id'     => $userId,
                    'year_month'  => $yearMonth,
                    'schedule_id' => $schedule->id,
                    'error'       => $e->getMessage(),
                ]);
            }
        }
    }
}
