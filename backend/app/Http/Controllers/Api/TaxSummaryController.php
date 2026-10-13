<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\MonthlySummary;
use App\Models\Schedule;
use App\Models\User;
use App\Services\MonthlySummaryService;
use App\Services\XlsxBuilder;
use App\Support\SafeSheet;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
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
    private const EXPORT_MAX_MONTHS = 24; // ★ v18.67 내보내기 기간 상한(개월)
    private const EXPORT_PER_HOUR = 20;   // ★ v18.67 사용자당 1시간 내보내기 횟수

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
        if ($limited = $this->exportThrottle($request->user()->id)) { // ★ v18.67
            return $limited;
        }

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
        if ($limited = $this->exportThrottle($owner->id)) { // ★ v18.67
            return $limited;
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
        [$data, $invalid] = $this->validateExport($request);
        if ($invalid) {
            return $invalid;
        }
        if ($limited = $this->exportThrottle($request->user()->id)) {
            return $limited;
        }
        [$summary, $schedules] = $this->buildExportRows($request->user()->id, $data);

        // ★ v18.67 보안 — 메모 등 사용자가 쓴 칸이 =·+·-·@로 시작하면 '를 붙여 수식 실행을 막고(SafeSheet),
        //   쉼표·따옴표·줄바꿈은 큰따옴표로 감쌈(예전엔 쉼표만 공백으로 바꿔서 수식이 그대로 들어갔음).
        //   BOM도 깨진 글자(ï»¿)로 나가던 것을 진짜 UTF-8 BOM으로 고침.
        $rows = $summary;
        if ($schedules !== null) {
            $rows[] = [];
            $rows[] = ['원본 일정'];
            array_push($rows, ...$schedules);
        }

        $csv = SafeSheet::csv($rows); // UTF-8 BOM — 엑셀에서 한글 깨짐 방지

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
        [$data, $invalid] = $this->validateExport($request);
        if ($invalid) {
            return $invalid;
        }

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

        [$data, $invalid] = $this->validateExport($request);
        if ($invalid) {
            return $invalid;
        }
        if ($limited = $this->exportThrottle($owner->id)) {
            return $limited;
        }
        [$summary, $schedules] = $this->buildExportRows($owner->id, $data);

        $sheets = ['월별 요약' => $summary];
        if ($schedules !== null) {
            $sheets['원본 일정'] = $schedules;
        }

        return XlsxBuilder::download("세무자료_{$data['from']}_{$data['to']}.xlsx", $sheets);
    }

    /**
     * ★ v18.67 보안 — 기간 상한 추가. 예전엔 from=0001-01&to=9999-12 처럼 아무 기간이나 받아서
     *   요청 1건이 연도마다 쿼리를 돌려 쿼리 3만 개·22초를 잡을 수 있었음(서버 전체 멈춤).
     *   이제 2020-01 ~ 2099-12 안에서, 시작 ≤ 끝, 최대 24개월까지만.
     *   (앱은 날짜 선택기로 아무 달이나 고를 수 있어 '작년 1월 ~ 올해'까지 넉넉히 24개월)
     *   안내 문구가 앱 알림창에 그대로 보이도록 ValidationException 대신 message에 이유를 담아 422로 돌려줌.
     * @return array{0: array, 1: ?\Illuminate\Http\JsonResponse}  [검증된 값, 오류 응답(없으면 null)]
     */
    private function validateExport(Request $request): array
    {
        $data = $request->validate([
            'from'  => 'required|date_format:Y-m',
            'to'    => 'required|date_format:Y-m',
            'items' => 'nullable|string|max:100',
        ]);

        [$fromYear, $fromMonth] = array_map('intval', explode('-', $data['from']));
        [$toYear, $toMonth] = array_map('intval', explode('-', $data['to']));
        $months = ($toYear * 12 + $toMonth) - ($fromYear * 12 + $fromMonth) + 1;

        $error = match (true) {
            $fromYear < 2020 || $toYear > 2099 => '2020년 1월부터 2099년 12월 사이 기간만 내보낼 수 있어요.',
            $months < 1                        => '끝 달이 시작 달보다 빠를 수 없어요. 기간을 확인해주세요.',
            $months > self::EXPORT_MAX_MONTHS  => '기간은 최대 ' . self::EXPORT_MAX_MONTHS . '개월까지 선택할 수 있어요.',
            default                            => null,
        };

        return [$data, $error ? ApiResponse::error($error, ErrorCode::VALID_GENERAL, 422) : null];
    }

    /**
     * ★ v18.67 보안 — 자료 내보내기(CSV·엑셀·PDF 생성)는 사용자당 1시간에 20번까지.
     *   서명 링크(로그인 없이 10분간 반복 호출 가능)로 여는 파일도 링크 주인 기준으로 같이 셈.
     *   링크 발급(export-link·pdf-link)은 가벼워서 세지 않고, 실제로 파일을 만드는 요청만 셈.
     */
    private function exportThrottle(int $userId)
    {
        $key = 'tax-export:' . $userId;
        if (RateLimiter::tooManyAttempts($key, self::EXPORT_PER_HOUR)) {
            $minutes = max(1, (int) ceil(RateLimiter::availableIn($key) / 60));
            return ApiResponse::error(
                '자료 내보내기는 1시간에 ' . self::EXPORT_PER_HOUR . "번까지 할 수 있어요. {$minutes}분 뒤에 다시 시도해주세요.",
                ErrorCode::TOO_MANY_REQUESTS,
                429
            );
        }
        RateLimiter::hit($key, 3600);

        return null;
    }

    /**
     * 내보내기 공통 데이터 — [월별 요약 행들(첫 행은 헤더), 원본 일정 행들(선택 안 했으면 null)]
     */
    private function buildExportRows(int $userId, array $data): array
    {
        $items = !empty($data['items']) ? explode(',', $data['items']) : ['income', 'wage', 'tax'];

        [$fromYear, $fromMonth] = array_map('intval', explode('-', $data['from']));
        [$toYear, $toMonth] = array_map('intval', explode('-', $data['to']));

        // ★ v18.67 — 연도마다 쿼리 3번(월별 집계·일정 있는 달·소득세 내역). 일정별 세금 계산은 쿼리 없는 산수라 N+1 아님.
        //   기간이 최대 24개월(validateExport)이라 연도는 많아야 3개 → 쿼리 9번 + 캐시 없는 달 재계산뿐.
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
        // ★ v18.66 — 예상원천세 옆에 소득세·지방소득세(10%) 내역 열 추가
        if (in_array('tax', $items)) { $header[] = '예상원천세'; $header[] = '소득세'; $header[] = '지방소득세'; $header[] = '실수령액'; }

        $summary = [$header];
        foreach ($rows as $row) {
            $line = [$row['year_month']];
            if (in_array('wage', $items)) { $line[] = $row['total_work_units']; $line[] = $row['work_days']; }
            if (in_array('income', $items)) { $line[] = $row['total_income']; $line[] = $row['total_expenses']; }
            if (in_array('tax', $items)) { $line[] = $row['estimated_tax']; $line[] = $row['income_tax']; $line[] = $row['local_tax']; $line[] = $row['net_income']; }
            $summary[] = $line;
        }

        $schedules = null;
        if (in_array('schedule', $items)) {
            $list = Schedule::query()
                ->join('schedule_users', 'schedules.id', '=', 'schedule_users.schedule_id')
                ->whereNull('schedules.deleted_at')
                ->whereNull('schedule_users.deleted_at')
                ->where('schedule_users.user_id', $userId)
                // ★ v18.67 — 끝 날짜를 '{to}-31' 대신 그 달 말일로. 예전엔 끝 달이 2·4·6·9·11월이면 '2026-02-31' 같은
                //   없는 날짜가 들어가 MySQL 비교가 실패 → '원본 일정'이 한 줄도 안 나왔음(로컬 재현: 0건)
                ->whereBetween('schedules.date', [
                    "{$data['from']}-01",
                    Carbon::createFromFormat('Y-m-d', "{$data['to']}-01")->endOfMonth()->toDateString(),
                ])
                ->orderBy('schedules.date')
                ->select('schedules.date', 'schedules.memo', 'schedules.daily_wage', 'schedules.work_units', 'schedules.employment_type')
                ->get();

            // ★ v18.66 — 일정(1회 지급분)별 공수·구분·소득세·지방소득세도 함께 (월별 예상원천세의 근거)
            $schedules = [['날짜', '메모', '금액', '공수', '구분', '소득세', '지방소득세']];
            foreach ($list as $s) {
                $t = MonthlySummaryService::taxBreakdown(
                    (float) ($s->daily_wage ?? 0),
                    (float) ($s->work_units ?? 0),
                    $s->employment_type ?? 'daily',
                );
                $schedules[] = [
                    substr((string) $s->date, 0, 10),
                    // ★ v18.67 — 메모는 팀장이 팀원 일정에 쓸 수 있는 남의 글 → 엑셀에서 '1e999' 같은 글이 숫자(무한대) 칸이 돼
                    //   파일이 깨지지 않게 항상 글자 칸으로(SafeSheet::text). CSV에선 그대로 글로 처리됨.
                    SafeSheet::text($s->memo),
                    $s->daily_wage,
                    $s->work_units,
                    $s->employment_type === 'freelance' ? '프리랜서(3.3%)' : '일용근로',
                    $t['income_tax'],
                    $t['local_tax'],
                ];
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

        // ★ v18.66 — 예상원천세의 소득세/지방소득세 내역(월별 합계에는 총액만 저장돼 있어 일정에서 계산)
        $taxSplit = MonthlySummaryService::yearlyTaxBreakdown($userId, $year);

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
                'income_tax'       => (int) ($taxSplit[$yearMonth]['income_tax'] ?? 0), // ★ v18.66
                'local_tax'        => (int) ($taxSplit[$yearMonth]['local_tax'] ?? 0),  // ★ v18.66
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
            'income_tax'       => array_sum(array_column($months, 'income_tax')), // ★ v18.66
            'local_tax'        => array_sum(array_column($months, 'local_tax')),  // ★ v18.66
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
        return \App\Services\PlanService::denied('tax_export', \App\Services\PlanService::upgradeMessage('tax_export'));
    }
}
