<?php

namespace App\Services;

use App\Models\MonthlySummary;
use App\Models\Schedule;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class MonthlySummaryService
{
    /**
     * ★ v18.66 — 예상 원천세 계산 규칙 (일정 1건 = 1회 지급분(하루치) 기준, 원 단위 미만 절사)
     *   - 지급액 = 일당 × 공수
     *   - 일용근로: 소득세 = (지급액 − 15만원) × 6% × (1 − 55% 근로소득세액공제) = × 2.7%
     *     (예전 식은 (일당 − 15만원) × 공수 였음 → 15만원 공제는 하루 지급액에서 빼는 게 맞아 수정.
     *      반공수 20만원 = 지급액 10만원 → 0원, 1.5공수 = 30만원 → (30만 − 15만) × 2.7%)
     *   - 프리랜서(사업소득 3.3%): 소득세 = 지급액 × 3%
     *   - 소액부징수: 소득세가 1,000원 미만이면 떼지 않음 → 0원 (지방소득세도 0원)
     *   - 지방소득세 = 소득세 × 10%
     *   - 예상 원천세 = 소득세 + 지방소득세 (프리랜서는 소액부징수가 아니면 3.3%와 같음)
     *   앱 app/src/utils/tax.ts(estimateWithholding)와 같은 식 — 한쪽을 바꾸면 같이 바꿀 것.
     */
    private const DAILY_DEDUCTION = 150000;   // 일용근로 하루 근로소득공제
    private const DAILY_RATE_PER_MILLE = 27;  // 6% × 45% = 2.7% → 1000분의 27
    private const FREELANCE_RATE_PERCENT = 3; // 사업소득 원천징수 3% (지방소득세 별도)
    private const SMALL_AMOUNT_LIMIT = 1000;  // 소액부징수 기준(소득세 1,000원 미만이면 0원)

    /** 예상 원천세 합계(소득세 + 지방소득세) — 기존 호출부 시그니처 유지 */
    public static function estimateTax(float $wage, float $units, string $employmentType): float
    {
        return (float) self::taxBreakdown($wage, $units, $employmentType)['total'];
    }

    /**
     * ★ v18.66 — 1회 지급분 원천세 내역
     * @return array{pay:int, income_tax:int, local_tax:int, total:int, exempt:bool}
     *   exempt = 소액부징수로 0원이 된 경우(계산상 소득세가 1~999원)
     */
    public static function taxBreakdown(float $wage, float $units, string $employmentType): array
    {
        // 소수 오차 없이 정수로 계산 — 일당은 소수 2자리, 공수는 소수 1자리까지 저장됨
        $payX1000 = (int) round($wage * 100) * (int) round($units * 10);
        $pay = intdiv(max(0, $payX1000), 1000); // 지급액(원 미만 절사)

        if ($employmentType === 'freelance') {
            $incomeTax = intdiv($pay * self::FREELANCE_RATE_PERCENT, 100);
        } else {
            $incomeTax = intdiv(max(0, $pay - self::DAILY_DEDUCTION) * self::DAILY_RATE_PER_MILLE, 1000);
        }

        $exempt = $incomeTax > 0 && $incomeTax < self::SMALL_AMOUNT_LIMIT;
        if ($incomeTax < self::SMALL_AMOUNT_LIMIT) {
            $incomeTax = 0;
        }
        $localTax = intdiv($incomeTax, 10);

        return [
            'pay'        => $pay,
            'income_tax' => $incomeTax,
            'local_tax'  => $localTax,
            'total'      => $incomeTax + $localTax,
            'exempt'     => $exempt,
        ];
    }

    /**
     * ★ v18.66 — 한 해 동안 월별 소득세/지방소득세 합계 (세무 자료 화면·PDF·엑셀의 내역 표시용)
     *   monthly_summaries엔 합계(estimated_tax)만 저장하므로, 내역은 일정에서 바로 계산(쿼리 1번).
     * @return array<string, array{income_tax:int, local_tax:int}>  키 = 'YYYY-MM'
     */
    public static function yearlyTaxBreakdown(int $userId, int $year): array
    {
        $rows = Schedule::query()
            ->join('schedule_users', 'schedules.id', '=', 'schedule_users.schedule_id')
            ->whereNull('schedules.deleted_at')
            ->whereNull('schedule_users.deleted_at')
            ->where('schedule_users.user_id', $userId)
            ->whereYear('schedules.date', $year)
            ->select([
                'schedules.date',
                'schedules.daily_wage',
                'schedules.work_units',
                'schedules.employment_type',
            ])
            ->get();

        $result = [];
        foreach ($rows as $s) {
            $ym = substr($s->date instanceof Carbon ? $s->date->format('Y-m-d') : (string) $s->date, 0, 7);
            $t = self::taxBreakdown(
                (float) ($s->daily_wage ?? 0),
                (float) ($s->work_units ?? 0),
                $s->employment_type ?? 'daily',
            );
            $result[$ym]['income_tax'] = ($result[$ym]['income_tax'] ?? 0) + $t['income_tax'];
            $result[$ym]['local_tax']  = ($result[$ym]['local_tax'] ?? 0) + $t['local_tax'];
        }

        return $result;
    }

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
                // ★ v18.66 — 빠져 있어서 프리랜서 일정도 늘 일용근로 식으로 계산되던 문제 수정
                'schedules.employment_type',
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

        // 4) 예상 원천세 계산 (기획서 3.8.1절)
        $estimatedTax = 0.0;
        //   ★ v18.66 — 일정(1회 지급분)마다 소득세 + 지방소득세(10%), 소액부징수 적용 — 위 taxBreakdown 참고, 앱 수입 상세와 같은 식
        //   (공수가 비어 있으면 수입 합계와 똑같이 0으로 봄 — 예전엔 세금만 1로 봐서 어긋났음)
        foreach ($schedules as $schedule) {
            $estimatedTax += self::estimateTax(
                (float) ($schedule->daily_wage ?? 0),
                (float) ($schedule->work_units ?? 0),
                $schedule->employment_type ?? 'daily',
            );
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
