<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\MonthlySummary;
use App\Models\Schedule;
use App\Models\User;
use App\Services\MonthlySummaryService;
use App\Services\XlsxBuilder;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

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
        if ($gate = $this->exportGate($request)) {
            return $gate;
        }
        $request->validate([
            'year' => 'required|integer|min:2020|max:2099',
        ]);

        return $this->renderPdf($request->user(), (int) $request->query('year'));
    }

    /**
     * ★ v18.36 — 앱 다운로드용 10분짜리 서명 링크 발급.
     *   앱엔 파일 저장 라이브러리가 없고 브라우저로 열면 인증 토큰을 못 실으므로,
     *   서명된 임시 주소를 만들어 앱이 브라우저로 열게 함(브라우저가 다운로드 폴더에 저장).
     * GET /api/tax-summary/pdf-link?year=2026
     */
    public function pdfLink(Request $request)
    {
        if ($gate = $this->exportGate($request)) {
            return $gate;
        }
        $request->validate([
            'year' => 'required|integer|min:2020|max:2099',
        ]);

        $path = URL::temporarySignedRoute('tax.pdf.signed', now()->addMinutes(10), [
            'user' => $request->user()->id,
            'year' => (int) $request->query('year'),
        ], absolute: false);

        return ApiResponse::success(['path' => $path], 'PDF 링크 발급 성공');
    }

    /**
     * ★ v18.36 — 서명 링크로 여는 PDF (인증 대신 signed 미들웨어가 접근 검증)
     * GET /api/files/tax/{user}/{year}/pdf
     */
    public function signedPdf(int $user, int $year)
    {
        $owner = User::find($user);
        if (!$owner) {
            return ApiResponse::error('존재하지 않는 사용자입니다.', 'ERR_NOT_FOUND', 404);
        }

        return $this->renderPdf($owner, $year);
    }

    private function renderPdf(User $user, int $year)
    {
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
     * CSV 자료 내보내기 — ★ DESIGN-CANVAS(TAX_EXPORT) 추가 (2026-10-02)
     * GET /api/tax-summary/export?from=2026-01&to=2026-09&items=income,wage,tax,schedule
     *   텍스트로 반환 → 앱이 OS 공유 시트로 저장/전달. (★ v18.40 엑셀은 아래 export-link로 진짜 .xlsx)
     */
    public function exportCsv(Request $request)
    {
        if ($gate = $this->exportGate($request)) {
            return $gate;
        }
        $data = $this->validateExport($request);
        [$summary, $schedules] = $this->buildExportRows($request->user()->id, $data);

        $lines = array_map(fn($r) => implode(',', $r), $summary);
        if ($schedules !== null) {
            $lines[] = '';
            $lines[] = '원본 일정';
            foreach ($schedules as $r) {
                $lines[] = implode(',', array_map(fn($v) => str_replace(',', ' ', (string) $v), $r));
            }
        }

        $csv = "ï»¿" . implode("
", $lines); // UTF-8 BOM — 엑셀에서 한글 깨짐 방지

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * ★ v18.40 — 엑셀(.xlsx) 다운로드용 10분짜리 서명 링크 (PDF와 같은 방식: 앱이 브라우저로 열어 저장)
     * GET /api/tax-summary/export-link?from=2026-01&to=2026-09&items=income,wage
     */
    public function exportLink(Request $request)
    {
        if ($gate = $this->exportGate($request)) {
            return $gate;
        }
        $data = $this->validateExport($request);

        $path = URL::temporarySignedRoute('tax.xlsx.signed', now()->addMinutes(10), [
            'user'  => $request->user()->id,
            'from'  => $data['from'],
            'to'    => $data['to'],
            'items' => $data['items'] ?? '',
        ], absolute: false);

        return ApiResponse::success(['path' => $path], '엑셀 링크 발급 성공');
    }

    /**
     * ★ v18.40 — 서명 링크로 여는 세무 자료 엑셀 (요약 시트 + 원본 일정 시트)
     * GET /api/files/tax/{user}/xlsx?from=..&to=..&items=..
     */
    public function signedXlsx(Request $request, int $user)
    {
        $owner = User::find($user);
        if (!$owner) {
            return ApiResponse::error('존재하지 않는 사용자입니다.', 'ERR_NOT_FOUND', 404);
        }

        $data = $this->validateExport($request);
        [$summary, $schedules] = $this->buildExportRows($owner->id, $data);

        $sheets = ['월별 요약' => $summary];
        if ($schedules !== null) {
            $sheets['원본 일정'] = $schedules;
        }

        return XlsxBuilder::download("세무자료_{$data['from']}_{$data['to']}.xlsx", $sheets);
    }

    private function validateExport(Request $request): array
    {
        return $request->validate([
            'from'  => 'required|date_format:Y-m',
            'to'    => 'required|date_format:Y-m',
            'items' => 'nullable|string',
        ]);
    }

    /**
     * 내보내기 공통 데이터 — [월별 요약 행들(첫 행은 헤더), 원본 일정 행들(선택 안 했으면 null)]
     */
    private function buildExportRows(int $userId, array $data): array
    {
        $items = !empty($data['items']) ? explode(',', $data['items']) : ['income', 'wage', 'tax'];

        [$fromYear, $fromMonth] = array_map('intval', explode('-', $data['from']));
        [$toYear, $toMonth] = array_map('intval', explode('-', $data['to']));

        $rows = [];
        for ($y = $fromYear; $y <= $toYear; $y++) {
            foreach ($this->buildYearlySummaries($userId, $y) as $row) {
                $ym = $y * 100 + $row['month'];
                if ($ym < $fromYear * 100 + $fromMonth || $ym > $toYear * 100 + $toMonth) {
                    continue;
                }
                $rows[] = $row;
            }
        }

        $header = ['연월'];
        if (in_array('wage', $items)) { $header[] = '공수'; $header[] = '작업일수'; }
        if (in_array('income', $items)) { $header[] = '총수입'; $header[] = '경비'; }
        if (in_array('tax', $items)) { $header[] = '예상원천세'; $header[] = '실수령액'; }

        $summary = [$header];
        foreach ($rows as $row) {
            $line = [$row['year_month']];
            if (in_array('wage', $items)) { $line[] = $row['total_work_units']; $line[] = $row['work_days']; }
            if (in_array('income', $items)) { $line[] = $row['total_income']; $line[] = $row['total_expenses']; }
            if (in_array('tax', $items)) { $line[] = $row['estimated_tax']; $line[] = $row['net_income']; }
            $summary[] = $line;
        }

        $schedules = null;
        if (in_array('schedule', $items)) {
            $list = Schedule::query()
                ->join('schedule_users', 'schedules.id', '=', 'schedule_users.schedule_id')
                ->whereNull('schedules.deleted_at')
                ->whereNull('schedule_users.deleted_at')
                ->where('schedule_users.user_id', $userId)
                ->whereBetween('schedules.date', ["{$data['from']}-01", "{$data['to']}-31"])
                ->orderBy('schedules.date')
                ->select('schedules.date', 'schedules.memo', 'schedules.daily_wage')
                ->get();

            $schedules = [['날짜', '메모', '금액']];
            foreach ($list as $s) {
                $schedules[] = [substr((string) $s->date, 0, 10), (string) $s->memo, $s->daily_wage];
            }
        }

        return [$summary, $schedules];
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

    /** ★ v18.47 — 세무 자료 내보내기(PDF·엑셀)는 개인 프로. 화면 보기(show)는 무료 */
    private function exportGate(Request $request)
    {
        if (\App\Services\PlanService::can($request->user(), 'tax_export')) {
            return null;
        }
        return ApiResponse::error(\App\Services\PlanService::upgradeMessage('tax_export'), 'ERR_PLAN_001', 403);
    }
}
