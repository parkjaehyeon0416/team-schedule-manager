<?php

use App\Services\MonthlySummaryService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ★ v18.40 — 데이터 보정: 개인 일정(owner_id 있음)인데 주인이 투입 인원(schedule_users)에 없어서
 *   내 수입·공수 집계에서 빠져 있던 일정들에 주인을 붙이고, 해당 월 집계를 다시 계산한다.
 *   (앞으로는 ScheduleController가 등록/수정 때 자동으로 포함함)
 */
return new class extends Migration
{
    public function up(): void
    {
        $missing = DB::table('schedules')
            ->whereNotNull('owner_id')
            ->whereNull('deleted_at')
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('schedule_users')
                    ->whereColumn('schedule_users.schedule_id', 'schedules.id')
                    ->whereColumn('schedule_users.user_id', 'schedules.owner_id')
                    ->whereNull('schedule_users.deleted_at');
            })
            ->get(['id', 'owner_id', 'date']);

        $toRecalc = [];
        foreach ($missing as $s) {
            DB::table('schedule_users')->updateOrInsert(
                ['schedule_id' => $s->id, 'user_id' => $s->owner_id],
                ['deleted_at' => null, 'created_at' => now(), 'updated_at' => now()],
            );
            $toRecalc[$s->owner_id . '|' . substr((string) $s->date, 0, 7)] = true;
        }

        foreach (array_keys($toRecalc) as $key) {
            [$userId, $ym] = explode('|', $key);
            MonthlySummaryService::recalculate((int) $userId, $ym);
        }
    }

    public function down(): void
    {
        // 데이터 보정이라 되돌리지 않음
    }
};
