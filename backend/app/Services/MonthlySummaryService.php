<?php

namespace App\Services;

use App\Models\MonthlySummary;
use App\Models\Schedule;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class MonthlySummaryService
{
    /**
     * 원천징수 비율 (일용근로자 기준)
     * 기획서 3.8.1절: 일당에서 15만원 공제 후 2.7% 원천징수
     */
    private const TAX_RATE = 0.027;
    private const TAX_DEDUCTION = 150000;

    /**
     * 특정 사용자의 특정 월 집계를 처음부터 다시 계산해서 저장
     */
    public static function recalculate(int $userId, string $yearMonth): MonthlySummary
    {
        // 1) '2026-04' 문자열 → 월의 시작일/종료일
        $startOfMonth = Carbon::parse($yearMonth . '-01')->startOfMonth();
        $endOfMonth   = (clone $startOfMonth)->endOfMonth();

        // 2) 이 사용자가 참여한 + 이 월에 속한 schedules 전체 조회
        $schedules = Schedule::query()
            ->join('schedule_users', 'schedules.id', '=', 'schedule_users.schedule_id')
            ->whereNull('schedules.deleted_at')
            ->whereNull('schedule_users.deleted_at')
            ->where('schedule_users.user_id', $userId)
            ->whereBetween('schedules.date', [
                $startOfMonth->toDateString(),
                $endOfMonth->toDateString(),
            ])
            ->select([
                'schedules.id',
                'schedules.date',
                'schedules.site_id',
                'schedules.daily_wage',
                'schedules.work_units',
                'schedules.expenses',
            ])
            ->get();

        // 3) 집계 계산
        $totalWorkUnits = 0.0;
        $totalIncome    = 0.0;
        $totalExpenses  = 0.0;
        $workDays       = [];
        $siteIds        = [];

        foreach ($schedules as $schedule) {
            $wage  = (float) ($schedule->daily_wage ?? 0);
            $units = (float) ($schedule->work_units ?? 0);
            $exp   = (float) ($schedule->expenses ?? 0);

            $totalWorkUnits += $units;
            $totalIncome    += $wage * $units;
            $totalExpenses  += $exp;

            // ★ 수정 — date를 문자열로 확실히 변환 (Carbon 객체 방지)
            $dateKey = $schedule->date instanceof \Carbon\Carbon
                ? $schedule->date->format('Y-m-d')
                : (string) $schedule->date;

            $workDays[$dateKey] = true;

            if ($schedule->site_id) {
                $siteIds[$schedule->site_id] = true;
            }
        }

        // 4) 예상 소득세 계산 (기획서 3.8.1절)
        $estimatedTax = 0.0;
        foreach ($schedules as $schedule) {
            $wage  = (float) ($schedule->daily_wage ?? 0);
            $units = (float) ($schedule->work_units ?? 1);
            $taxable = max(0, $wage - self::TAX_DEDUCTION);
            $estimatedTax += $taxable * self::TAX_RATE * $units;
        }

        // 5) 실수령액
        $netIncome = $totalIncome - $totalExpenses - $estimatedTax;

        // 6) UPSERT
        $summary = MonthlySummary::updateOrCreate(
            [
                'user_id'    => $userId,
                'year_month' => $yearMonth,
            ],
            [
                'total_work_units'   => round($totalWorkUnits, 1),
                'total_income'       => round($totalIncome, 2),
                'total_expenses'     => round($totalExpenses, 2),
                'net_income'         => round($netIncome, 2),
                'work_days'          => count($workDays),
                'site_count'         => count($siteIds),
                'estimated_tax'      => round($estimatedTax, 2),
                'last_calculated_at' => now(),
            ]
        );

        return $summary;
    }
}
