<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\MonthlySummary;
use App\Models\Schedule;
use App\Services\MonthlySummaryService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

/**
 * 수입·경비 정리 (세무사용) — ★ v17 신규
 *
 * 기획서 ServicePlan_v2_8 1-3절 #7 / 2-2절 #8 "수입·경비 정리 PDF (세무사용)".
 * 원래 로드맵은 1차 출시 이후(2026-11~2027-04, 5월 종합소득세 신고 시즌 맞춤)로
 * 잡혀 있었으나, monthly_summaries에 필요한 데이터(월별 수입/경비/원천징수 예상세액,
 * v10.1)가 이미 쌓여 있어 이번에 앞당겨 구현함. 연 단위로 월별 집계를 모아
 * 화면 조회 + PDF 다운로드(세무사에게 그대로 전달 가능한 형태)를 제공한다.
 */
class TaxSummaryController extends Controller
{
    /**
     * 연간 수입·경비 정리 조회 (화면용)
     * GET /api/tax-summary?year=2026
     */
    public function show(Request $request)
    {
        $request->validate([
            'year' => 'required|integer|min:2020|max:2099',
        ]);

        $user = $request->user();
        $year = (int) $request->query('year');

        $months = $this->buildYearlySummaries($user->id, $year);
        $totals = $this->sumTotals($months);

        return ApiResponse::success([
            'year'   => $year,
            'months' => $months,
            'totals' => $totals,
        ], '연간 수입·경비 정리 조회 성공');
    }

    /**
     * PDF 다운로드 (세무사용)
     * GET /api/tax-summary/pdf?year=2026
     */
    public function downloadPdf(Request $request)
    {
        $request->validate([
            'year' => 'required|integer|min:2020|max:2099',
        ]);

        $user = $request->user();
        $year = (int) $request->query('year');

        $months = $this->buildYearlySummaries($user->id, $year);
        $totals = $this->sumTotals($months);

        $pdf = Pdf::loadView('tax.summary', [
            'user'   => $user,
            'year'   => $year,
            'months' => $months,
            'totals' => $totals,
        ]);

        return $pdf->download($year . '년_수입경비정리_' . $user->name . '.pdf');
    }

    /**
     * 해당 연도 1~12월의 MonthlySummary를 모으되, 일정이 있는데 아직 캐시가 없는 달은
     * 그 자리에서 재계산해서 채운다(월별 수입 대시보드와 동일한 캐시 재사용 전략).
     */
    private function buildYearlySummaries(int $userId, int $year): array
    {
        $existing = MonthlySummary::where('user_id', $userId)
            ->where('year_month', 'like', $year . '-%')
            ->get()
            ->keyBy('year_month');

        $monthsWithSchedules = Schedule::query()
            ->join('schedule_users', 'schedules.id', '=', 'schedule_users.schedule_id')
            ->whereNull('schedules.deleted_at')
            ->whereNull('schedule_users.deleted_at')
            ->where('schedule_users.user_id', $userId)
            ->whereYear('schedules.date', $year)
            ->selectRaw("DATE_FORMAT(schedules.date, '%Y-%m') as ym")
            ->distinct()
            ->pluck('ym');

        $result = [];
        for ($m = 1; $m <= 12; $m++) {
            $yearMonth = sprintf('%04d-%02d', $year, $m);

            $summary = $existing->get($yearMonth);

            if (!$summary && $monthsWithSchedules->contains($yearMonth)) {
                $summary = MonthlySummaryService::recalculate($userId, $yearMonth);
            }

            $result[] = [
                'year_month'       => $yearMonth,
                'month'            => $m,
                'total_work_units' => (float) ($summary->total_work_units ?? 0),
                'total_income'     => (float) ($summary->total_income ?? 0),
                'total_expenses'   => (float) ($summary->total_expenses ?? 0),
                'estimated_tax'    => (float) ($summary->estimated_tax ?? 0),
                'net_income'       => (float) ($summary->net_income ?? 0),
                'work_days'        => (int) ($summary->work_days ?? 0),
            ];
        }

        return $result;
    }

    private function sumTotals(array $months): array
    {
        return [
            'total_work_units' => round(array_sum(array_column($months, 'total_work_units')), 1),
            'total_income'     => round(array_sum(array_column($months, 'total_income')), 2),
            'total_expenses'   => round(array_sum(array_column($months, 'total_expenses')), 2),
            'estimated_tax'    => round(array_sum(array_column($months, 'estimated_tax')), 2),
            'net_income'       => round(array_sum(array_column($months, 'net_income')), 2),
            'work_days'        => array_sum(array_column($months, 'work_days')),
        ];
    }
}
