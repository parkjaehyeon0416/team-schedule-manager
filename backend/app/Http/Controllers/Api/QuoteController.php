<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\BusinessCard;
use App\Models\Quote;
use App\Models\QuoteLine;
use App\Models\Schedule;
use App\Models\Site;
use App\Models\User;
use App\Models\UserMaterial;
use App\Models\WorkType;
use App\Services\XlsxBuilder;
use App\Support\SafeSheet;
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\HeaderUtils;

/**
 * 견적서(Quote) 컨트롤러 — ★ v12~v13 신규
 *
 * 기획서 ServicePlan_v2_6/2_7 반영. "기본 템플릿 + 자유 커스터마이징" 하이브리드
 * 설계는 프론트엔드에서 UserMaterial 자동완성으로 구현하고, 이 컨트롤러는
 * 견적 CRUD + PDF 생성 + 승인 시 일정(Schedule) 자동 전환을 담당한다.
 */
class QuoteController extends Controller
{
    // ★ v18.65 — 금액 입력 상한 안내(DB 칸: 단가 1억 미만, 합계 100억 미만)
    private const AMOUNT_MESSAGES = [
        'lines.*.quantity.max'   => '수량은 99,999까지 입력할 수 있어요.',
        'lines.*.unit_price.max' => '단가는 1억 원 미만으로 입력해주세요.',
        'discount_amount.max'    => '할인 금액이 너무 커요.',
    ];

    // ★ v18.67 보안 — 항목 수·메모 길이 상한. 예전엔 항목 수천 개·메모 수만 자짜리 견적을 만들어
    //   PDF를 요청할 때마다 수 초~십수 초씩 서버를 붙잡을 수 있었음(php-fpm 워커 5개 서버 마비).
    private const MAX_LINES = 100;
    private const MEMO_MAX  = 2000;

    // ★ v18.67 보안 — 견적서 PDF는 내용이 그대로면 한 번 그린 파일을 다시 씀(private 디스크
    //   storage/app/private/quote-pdf/{견적id}/{내용 지문}.pdf). 3일짜리 공유 링크는 로그인 없이 열리므로
    //   요청마다 새로 그리면 링크만 있으면 누구나 CPU를 태울 수 있었음.
    private const PDF_DIR = 'quote-pdf';
    private const PDF_RENDERS_PER_MINUTE = 10; // 새로 그리기(내용이 바뀐 경우만) — 견적 주인 기준
    private const PDF_SIGNED_PER_MINUTE  = 30; // 로그인 없는 서명·공유 링크 열기 — IP 기준

    private const LIMIT_MESSAGES = [
        'lines.max' => '견적 항목은 100개까지 넣을 수 있어요.',
        'memo.max'  => '메모는 2,000자까지 입력할 수 있어요.',
    ];

    /**
     * ★ v18.67 — 항목 수·메모 길이를 검증 전에 먼저 확인(항목 수천 개를 하나하나 검증하는 것부터 무거워서).
     *   앱 알림창엔 message만 보이므로 이유를 message에 담아 422로 돌려줌.
     */
    private function sizeError(Request $request)
    {
        $lines = $request->input('lines');
        if (is_array($lines) && count($lines) > self::MAX_LINES) {
            return ApiResponse::error(self::LIMIT_MESSAGES['lines.max'], ErrorCode::VALID_GENERAL, 422);
        }
        $memo = $request->input('memo');
        if (is_string($memo) && mb_strlen($memo) > self::MEMO_MAX) {
            return ApiResponse::error(self::LIMIT_MESSAGES['memo.max'], ErrorCode::VALID_GENERAL, 422);
        }
        return null;
    }

    /**
     * ★ v18.68 보안 — 공정(work_type_id)은 내가 볼 수 있는 공정만(공용 + 소속 팀 공정 + 내 개인 공정).
     *   예전엔 "DB에 있는 번호"인지만 봐서 남의 개인 공정·다른 팀 공정 번호를 견적에 붙이면, 견적 승인 때
     *   그 공정으로 일정이 만들어져 이름·색상을 알아낼 수 있었음(ScheduleController::checkWorkType과 같은 기준).
     *   수정할 때 원래 붙어 있던 값을 그대로 보내는 건 통과(팀을 나간 뒤에도 예전 견적을 고칠 수 있게).
     */
    private function workTypeError($user, $workTypeId, $current = null)
    {
        if ($workTypeId === null || $workTypeId === '') {
            return null;
        }
        if ($current !== null && (int) $workTypeId === (int) $current) {
            return null;
        }
        if (!WorkType::forUser($user)->whereKey((int) $workTypeId)->exists()) {
            return ApiResponse::error('선택할 수 없는 공정입니다.', ErrorCode::WORKTYPE_NOT_FOUND, 422);
        }
        return null;
    }

    /** 항목 합계가 100억 이상이거나 할인이 공급가보다 크면 안내 */
    private function amountError(array $data)
    {
        $subtotal = 0;
        foreach ($data['lines'] as $line) {
            $subtotal += $line['quantity'] * $line['unit_price'];
        }
        if ($subtotal >= 9000000000) {
            return ApiResponse::error('견적 합계는 90억 원 미만이어야 해요. 금액을 확인해주세요.', 'ERR_VALIDATION', 422);
        }
        if (($data['discount_amount'] ?? 0) > $subtotal) {
            return ApiResponse::error('할인 금액이 공급가보다 클 수 없어요.', 'ERR_VALIDATION', 422);
        }
        return null;
    }

    /**
     * 견적 목록 조회 (내가 작성한 것)
     * GET /api/quotes
     */
    public function index(Request $request)
    {
        $quotes = Quote::where('user_id', $request->user()->id)
            ->with('site:id,apt_name,dong,ho')
            ->orderByDesc('id')
            ->get();

        return ApiResponse::success($quotes, '견적 목록 조회 성공');
    }

    /**
     * 견적 생성
     * POST /api/quotes
     *
     * Body: client_name, client_contact, address, site_id, work_type_id,
     *       desired_date, memo, discount_amount,
     *       lines: [{ name, spec, quantity, unit, unit_price }]
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if ($fail = $this->sizeError($request)) { // ★ v18.67
            return $fail;
        }
        $data = $request->validate([
            'client_name'      => 'nullable|string|max:100',
            'client_contact'   => 'nullable|string|max:100',
            'address'          => 'nullable|string|max:255',
            'site_id'          => 'nullable|integer|exists:sites,id',
            'work_type_id'     => 'nullable|integer|exists:work_types,id',
            'desired_date'     => 'nullable|date',
            'memo'             => 'nullable|string|max:' . self::MEMO_MAX, // ★ v18.67
            'discount_amount'  => 'nullable|numeric|min:0|max:9999999999', // ★ v18.65 DB 칸(12,2) 넘으면 500 나던 것
            'tax_type'         => 'nullable|in:separate,included,exempt',
            'lines'            => 'required|array|min:1|max:' . self::MAX_LINES, // ★ v18.67
            'lines.*.name'       => 'required|string|max:100',
            'lines.*.spec'       => 'nullable|string|max:255',
            'lines.*.quantity'   => 'required|numeric|min:0|max:99999',
            'lines.*.unit'       => 'nullable|string|max:20',
            'lines.*.unit_price' => 'required|numeric|min:0|max:99999999',
        ], self::AMOUNT_MESSAGES + self::LIMIT_MESSAGES);
        if ($fail = $this->amountError($data)) {
            return $fail;
        }
        // ★ v18.62 보안 — 내가 볼 수 있는 현장만 연결(예전엔 아무 현장 번호나 넣어 남의 현장 주소를 견적서로 볼 수 있었음)
        if (!empty($data['site_id']) && !Site::forUser($request->user())->whereKey($data['site_id'])->exists()) {
            return ApiResponse::error('선택할 수 없는 현장입니다.', ErrorCode::QUOTE_NOT_FOUND, 422);
        }
        if ($fail = $this->workTypeError($user, $data['work_type_id'] ?? null)) { // ★ v18.68
            return $fail;
        }

        // ★ v18.47 — 무료는 월 3건(지운 견적도 셈 — 지우고 다시 만드는 걸 막기 위해). 개인 프로는 무제한
        $quoteLimit = \App\Services\PlanService::limit($user, 'quotes_per_month', 'quote_unlimited');
        if ($quoteLimit !== null
            && ($used = Quote::withTrashed()->where('user_id', $user->id)->where('created_at', '>=', now()->startOfMonth())->count()) >= $quoteLimit) {
            return \App\Services\PlanService::denied('quote_unlimited',
                "무료로는 견적서를 한 달에 {$quoteLimit}건까지 만들 수 있어요. 개인 프로에서 무제한으로 쓸 수 있어요.",
                ['limit' => $quoteLimit, 'used' => $used, 'unit' => '건', 'monthly' => true]);
        }

        $quote = DB::transaction(function () use ($data, $user) {
            $subtotal = 0;
            foreach ($data['lines'] as $line) {
                $subtotal += $line['quantity'] * $line['unit_price'];
            }
            $discount = $data['discount_amount'] ?? 0;
            $taxType  = $data['tax_type'] ?? 'separate';
            [$vat, $total] = $this->calculateTax($subtotal, $discount, $taxType);

            $quote = Quote::create([
                'user_id'          => $user->id,
                'team_id'          => $user->team_id,
                'site_id'          => $data['site_id'] ?? null,
                'work_type_id'     => $data['work_type_id'] ?? null,
                'client_name'      => $data['client_name'] ?? null,
                'client_contact'   => $data['client_contact'] ?? null,
                'address'          => $data['address'] ?? null,
                'desired_date'     => $data['desired_date'] ?? null,
                'memo'             => $data['memo'] ?? null,
                'subtotal_amount'  => $subtotal,
                'discount_amount'  => $discount,
                'tax_type'         => $taxType,
                'vat_amount'       => $vat,
                'total_amount'     => $total,
                'status'           => 'draft',
            ]);

            foreach ($data['lines'] as $i => $line) {
                QuoteLine::create([
                    'quote_id'   => $quote->id,
                    'name'       => $line['name'],
                    'spec'       => $line['spec'] ?? null,
                    'quantity'   => $line['quantity'],
                    'unit'       => $line['unit'] ?? '개',
                    'unit_price' => $line['unit_price'],
                    'amount'     => $line['quantity'] * $line['unit_price'],
                    'sort_order' => $i,
                ]);

                // ★ 자동 학습 — 내 자재 목록에 upsert (기획서 1-2절)
                $this->learnMaterial($user->id, $data['work_type_id'] ?? null, $line);
            }

            return $quote;
        });

        $quote->load('lines');

        return ApiResponse::success($quote, '견적서가 생성되었습니다.', 201);
    }

    /**
     * 견적 상세 조회
     * GET /api/quotes/{id}
     */
    public function show(Request $request, string $id)
    {
        $quote = $this->findQuote($request, $id);
        if (!$quote) {
            return ApiResponse::error('존재하지 않는 견적서입니다.', ErrorCode::QUOTE_NOT_FOUND, 404);
        }

        $quote->load(['lines', 'site:id,apt_name,dong,ho,address']);

        return ApiResponse::success($quote, '견적서 조회 성공');
    }

    /**
     * 견적 수정 (고객정보/현장/항목 전체 교체)
     * PUT /api/quotes/{id}
     */
    public function update(Request $request, string $id)
    {
        $quote = $this->findQuote($request, $id);
        if (!$quote) {
            return ApiResponse::error('존재하지 않는 견적서입니다.', ErrorCode::QUOTE_NOT_FOUND, 404);
        }

        if ($fail = $this->sizeError($request)) { // ★ v18.67
            return $fail;
        }
        $data = $request->validate([
            'client_name'      => 'nullable|string|max:100',
            'client_contact'   => 'nullable|string|max:100',
            'address'          => 'nullable|string|max:255',
            'site_id'          => 'nullable|integer|exists:sites,id',
            'work_type_id'     => 'nullable|integer|exists:work_types,id',
            'desired_date'     => 'nullable|date',
            'memo'             => 'nullable|string|max:' . self::MEMO_MAX, // ★ v18.67
            'discount_amount'  => 'nullable|numeric|min:0|max:9999999999', // ★ v18.65 DB 칸(12,2) 넘으면 500 나던 것
            'tax_type'         => 'nullable|in:separate,included,exempt',
            'lines'            => 'required|array|min:1|max:' . self::MAX_LINES, // ★ v18.67
            'lines.*.name'       => 'required|string|max:100',
            'lines.*.spec'       => 'nullable|string|max:255',
            'lines.*.quantity'   => 'required|numeric|min:0|max:99999',
            'lines.*.unit'       => 'nullable|string|max:20',
            'lines.*.unit_price' => 'required|numeric|min:0|max:99999999',
        ], self::AMOUNT_MESSAGES + self::LIMIT_MESSAGES);
        if ($fail = $this->amountError($data)) {
            return $fail;
        }
        // ★ v18.62 보안 — 내가 볼 수 있는 현장만 연결(예전엔 아무 현장 번호나 넣어 남의 현장 주소를 견적서로 볼 수 있었음)
        if (!empty($data['site_id']) && !Site::forUser($request->user())->whereKey($data['site_id'])->exists()) {
            return ApiResponse::error('선택할 수 없는 현장입니다.', ErrorCode::QUOTE_NOT_FOUND, 422);
        }
        if ($fail = $this->workTypeError($request->user(), $data['work_type_id'] ?? null, $quote->work_type_id)) { // ★ v18.68
            return $fail;
        }

        DB::transaction(function () use ($quote, $data, $request) {
            $subtotal = 0;
            foreach ($data['lines'] as $line) {
                $subtotal += $line['quantity'] * $line['unit_price'];
            }
            $discount = $data['discount_amount'] ?? 0;
            $taxType  = $data['tax_type'] ?? $quote->tax_type ?? 'separate';
            [$vat, $total] = $this->calculateTax($subtotal, $discount, $taxType);

            $quote->update([
                'site_id'          => $data['site_id'] ?? null,
                'work_type_id'     => $data['work_type_id'] ?? null,
                'client_name'      => $data['client_name'] ?? null,
                'client_contact'   => $data['client_contact'] ?? null,
                'address'          => $data['address'] ?? null,
                'desired_date'     => $data['desired_date'] ?? null,
                'memo'             => $data['memo'] ?? null,
                'subtotal_amount'  => $subtotal,
                'discount_amount'  => $discount,
                'tax_type'         => $taxType,
                'vat_amount'       => $vat,
                'total_amount'     => $total,
            ]);

            $quote->lines()->delete();
            foreach ($data['lines'] as $i => $line) {
                QuoteLine::create([
                    'quote_id'   => $quote->id,
                    'name'       => $line['name'],
                    'spec'       => $line['spec'] ?? null,
                    'quantity'   => $line['quantity'],
                    'unit'       => $line['unit'] ?? '개',
                    'unit_price' => $line['unit_price'],
                    'amount'     => $line['quantity'] * $line['unit_price'],
                    'sort_order' => $i,
                ]);

                $this->learnMaterial($request->user()->id, $data['work_type_id'] ?? null, $line);
            }
        });

        return ApiResponse::success($quote->fresh('lines'), '견적서가 수정되었습니다.');
    }

    /**
     * 견적 상태 변경 (draft → sent, 또는 반려)
     * PATCH /api/quotes/{id}/status
     */
    public function updateStatus(Request $request, string $id)
    {
        $quote = $this->findQuote($request, $id);
        if (!$quote) {
            return ApiResponse::error('존재하지 않는 견적서입니다.', ErrorCode::QUOTE_NOT_FOUND, 404);
        }

        $data = $request->validate([
            'status' => 'required|in:draft,sent,rejected',
        ]);

        $quote->status = $data['status'];
        $quote->save();

        // ★ DESIGN-CANVAS(NOTIFICATIONS) 추가 — 발송 처리 시 알림 피드에 기록(셀프 알림, 발송 이력 확인용)
        if ($data['status'] === 'sent') {
            \App\Models\Notification::create([
                'user_id'   => $request->user()->id,
                'category'  => 'quote',
                'title'     => '견적 알림',
                'body'      => ($quote->client_name ? "{$quote->client_name}님에게 " : '') . '견적서를 발송했어요.',
                'link_type' => 'quote',
                'link_id'   => $quote->id,
            ]);
        }

        return ApiResponse::success($quote, '견적 상태가 변경되었습니다.');
    }

    /**
     * 견적 승인 → 일정(Schedule) 자동 생성 (기획서 1-2절 "일정 연동")
     * POST /api/quotes/{id}/approve
     */
    public function approve(Request $request, string $id)
    {
        $user = $request->user();
        $quote = $this->findQuote($request, $id);

        if (!$quote) {
            return ApiResponse::error('존재하지 않는 견적서입니다.', ErrorCode::QUOTE_NOT_FOUND, 404);
        }

        if ($quote->status === 'approved') {
            return ApiResponse::error('이미 승인된 견적서입니다.', ErrorCode::QUOTE_ALREADY_APPROVED, 409);
        }

        // ★ v18.68 — 희망 시공일이 없을 때 앱에서 고른 날짜를 함께 받음
        //   (예전엔 날짜를 골라도 서버로 안 넘어가서 "희망 시공일을 먼저 입력해주세요"로 승인이 항상 실패했음)
        $data = $request->validate(['desired_date' => 'nullable|date']);
        if (!$quote->desired_date && !empty($data['desired_date'])) {
            $quote->desired_date = $data['desired_date'];
        }

        if (!$quote->desired_date) {
            return ApiResponse::error('희망 시공일을 먼저 입력해주세요.', ErrorCode::QUOTE_MISSING_DATE, 422);
        }

        // ★ v18.62 보안 — 팀 일정으로 만드는 건 그 팀 팀장·부팀장만(예전엔 팀원도 승인으로 팀 일정을 만들 수 있었음). 아니면 개인 일정.
        $teamId  = $user->canAssignIn($user->team_id) ? $user->team_id : null;
        $ownerId = $teamId ? null : $user->id;
        if ($quote->site_id && !Site::forUser($user)->whereKey($quote->site_id)->exists()) {
            $quote->site_id = null;
        }
        // ★ v18.68 보안 — 지금 볼 수 없는 공정(예전에 검사 없이 붙은 남의 공정, 나간 팀 공정, 지운 공정)은 일정에 안 넘김
        $workTypeId = $quote->work_type_id && WorkType::forUser($user)->whereKey($quote->work_type_id)->exists()
            ? $quote->work_type_id : null;
        // ★ v18.68 — 승인으로 만든 일정에 제목이 없어 일정 목록·상세에 '일정'으로만 보였음
        //   → "{고객명} 견적 시공", 고객명이 없으면 "견적 E-{번호} 시공"(견적서의 No. E-번호와 같게). 제목 칸은 100자까지
        $suffix = ' 견적 시공';
        $clientName = trim((string) $quote->client_name);
        $title = $clientName !== ''
            ? mb_substr($clientName, 0, 100 - mb_strlen($suffix)) . $suffix
            : "견적 E-{$quote->id} 시공";

        $schedule = DB::transaction(function () use ($quote, $user, $teamId, $ownerId, $workTypeId, $title) {
            $siteId = $quote->site_id;

            // 연결된 현장이 없고 주소만 있으면 현장을 새로 만들어 연결
            if (!$siteId && $quote->address) {
                $site = Site::create([
                    'address'    => $quote->address,
                    'team_id'    => $teamId,
                    'owner_id'   => $ownerId,
                    'created_by' => $user->id,
                ]);
                $siteId = $site->id;
            }

            $schedule = Schedule::create([
                'date'          => $quote->desired_date,
                'title'         => $title, // ★ v18.68
                'site_id'       => $siteId,
                'team_id'       => $teamId,
                'owner_id'      => $ownerId,
                'created_by'    => $user->id,
                'work_type_id'  => $workTypeId, // ★ v18.68
                // ★ v18.68 — 일당은 비워 둠(사용자 결정). 예전엔 견적 총액을 하루 일당으로 넣어서
                //   내 수입·예상 원천세에 견적 총액이 한 사람의 일당처럼 잡혔음. 필요하면 일정에서 직접 입력
                'daily_wage'    => null,
                'work_units'    => 1,
                'memo'          => trim(($quote->client_name ?? '') . ' 견적 승인건'),
                'status'        => 'pending',
            ]);
            $schedule->users()->attach($user->id);

            $quote->status = 'approved';
            $quote->approved_schedule_id = $schedule->id;
            $quote->site_id = $siteId;
            $quote->save();

            return $schedule;
        });

        $schedule->load(['users:id,name', 'site:id,apt_name,dong,ho']);

        return ApiResponse::success([
            'quote'    => $quote->fresh(),
            'schedule' => $schedule,
        ], '견적이 승인되어 일정이 등록되었어요. 일당은 일정에서 직접 입력해 주세요.');
    }

    /**
     * 견적 삭제
     * DELETE /api/quotes/{id}
     */
    public function destroy(Request $request, string $id)
    {
        $quote = $this->findQuote($request, $id);
        if (!$quote) {
            return ApiResponse::error('존재하지 않는 견적서입니다.', ErrorCode::QUOTE_NOT_FOUND, 404);
        }

        $quote->delete();
        Storage::disk('local')->deleteDirectory(self::PDF_DIR . '/' . $quote->id); // ★ v18.67 저장해 둔 PDF도 지움

        return ApiResponse::success(null, '견적서가 삭제되었습니다.');
    }

    /**
     * 견적서 PDF 다운로드
     *   ★ v18.67 — 예전엔 요청마다 새로 그렸음. 이제 내용(견적·항목·현장·명함·요금제 문구·템플릿)이 그대로면
     *   저장해 둔 PDF를 다시 주고, 바뀌었을 때만 새로 그림(renderPdf 참고). 수정하면 지문이 바뀌어 자동으로 새로 그려짐.
     * GET /api/quotes/{id}/pdf
     */
    public function downloadPdf(Request $request, string $id)
    {
        $quote = $this->findQuote($request, $id);
        if (!$quote) {
            return ApiResponse::error('존재하지 않는 견적서입니다.', ErrorCode::QUOTE_NOT_FOUND, 404);
        }

        return $this->renderPdf($quote, $request->user());
    }

    /**
     * ★ v18.36 — 앱 다운로드용 10분짜리 서명 링크 발급.
     *   앱엔 파일 저장 라이브러리가 없고 브라우저로 열면 인증 토큰을 못 실으므로,
     *   서명된 임시 주소를 만들어 앱이 브라우저로 열게 함(브라우저가 다운로드 폴더에 저장).
     * GET /api/quotes/{id}/pdf-link
     */
    public function pdfLink(Request $request, string $id)
    {
        $quote = $this->findQuote($request, $id);
        if (!$quote) {
            return ApiResponse::error('존재하지 않는 견적서입니다.', ErrorCode::QUOTE_NOT_FOUND, 404);
        }

        $path = URL::temporarySignedRoute('quotes.pdf.signed', now()->addMinutes(10), ['id' => $quote->id], absolute: false);

        return ApiResponse::success(['path' => $path], 'PDF 링크 발급 성공');
    }

    /**
     * ★ v18.40 — 견적서 엑셀(.xlsx) 다운로드용 10분짜리 서명 링크
     * GET /api/quotes/{id}/xlsx-link
     */
    public function xlsxLink(Request $request, string $id)
    {
        $quote = $this->findQuote($request, $id);
        if (!$quote) {
            return ApiResponse::error('존재하지 않는 견적서입니다.', ErrorCode::QUOTE_NOT_FOUND, 404);
        }

        $path = URL::temporarySignedRoute('quotes.xlsx.signed', now()->addMinutes(10), ['id' => $quote->id], absolute: false);

        return ApiResponse::success(['path' => $path], '엑셀 링크 발급 성공');
    }

    /**
     * ★ v18.40 — 서명 링크로 여는 견적서 엑셀 (항목표 + 소계·할인·부가세·합계)
     * GET /api/files/quotes/{id}/xlsx
     */
    public function signedXlsx(string $id)
    {
        $quote = Quote::with('lines')->find($id);
        if (!$quote) {
            return ApiResponse::error('존재하지 않는 견적서입니다.', ErrorCode::QUOTE_NOT_FOUND, 404);
        }

        // ★ v18.67 보안 — 항목명·규격·단위·고객명은 사용자가 쓴 글 → SafeSheet::text로 항상 글자 칸
        //   (XlsxBuilder는 숫자처럼 보이면 숫자 칸으로 써서 '1e999'는 무한대(INF)로 파일이 깨지고 '00123'은 123이 됐음)
        $rows = [['항목', '규격/설명', '수량', '단위', '단가', '금액']];
        foreach ($quote->lines as $l) {
            $amount = $l->amount ?? ((float) $l->quantity * (float) $l->unit_price);
            $rows[] = [SafeSheet::text($l->name), SafeSheet::text($l->spec), $l->quantity, SafeSheet::text($l->unit), $l->unit_price, $amount];
        }
        $rows[] = [];
        $rows[] = ['', '', '', '', '소계', $quote->subtotal_amount];
        if ((float) $quote->discount_amount > 0) {
            $rows[] = ['', '', '', '', '할인', -1 * (float) $quote->discount_amount];
        }
        $rows[] = ['', '', '', '', '공급가액', $quote->supply_amount];
        // ★ v18.68 — 부가세 줄 이름: tax_label("부가세 별도")을 "부가세(…)"로 한 번 더 감싸 "부가세(부가세 별도)"로 보이던 것
        //   (앱 미리보기·PDF와 같은 규칙). 별도 → "부가세(별도)", 포함 → "부가세(포함)", 면세 → "부가세" + 금액 칸 "면세"
        $vatRowLabel = match ($quote->tax_type) {
            'included' => '부가세(포함)',
            'exempt'   => '부가세',
            default    => '부가세(별도)',
        };
        $rows[] = ['', '', '', '', $vatRowLabel, $quote->tax_type === 'exempt' ? '면세' : ($quote->vat_amount ?? 0)];
        $rows[] = ['', '', '', '', '합계', $quote->total_amount];
        $rows[] = [];
        $rows[] = ['고객명', SafeSheet::text($quote->client_name ?? '-')];
        $rows[] = ['작성일', $quote->created_at?->format('Y-m-d')];

        return XlsxBuilder::download("견적서_E-{$quote->id}.xlsx", ['견적서' => $rows]);
    }

    /**
     * ★ v18.38 — 고객에게 보낼 견적서 링크(★ v18.66 3일 유효 — 보고서 링크와 같게). 앱이 카톡·문자 공유창으로 전달.
     *   다운로드용 pdf-link(10분)와 같은 서명 주소지만, 고객이 나중에 열 수 있게 기간만 길게.
     * GET /api/quotes/{id}/share-link
     */
    public function shareLink(Request $request, string $id)
    {
        $quote = $this->findQuote($request, $id);
        if (!$quote) {
            return ApiResponse::error('존재하지 않는 견적서입니다.', ErrorCode::QUOTE_NOT_FOUND, 404);
        }

        $path = URL::temporarySignedRoute('quotes.pdf.signed', now()->addDays(3), ['id' => $quote->id], absolute: false);

        return ApiResponse::success(['path' => $path], '공유 링크 발급 성공');
    }

    /**
     * ★ v18.36 — 서명 링크로 여는 PDF (인증 대신 signed 미들웨어가 접근 검증)
     * GET /api/files/quotes/{id}/pdf
     */
    public function signedPdf(Request $request, string $id)
    {
        // ★ v18.67 보안 — 로그인 없이 열리는 링크(10분 다운로드·3일 공유)라 같은 IP에서 같은 견적은 분당 30번까지
        //   (통신사 공용 IP를 여러 사람이 같이 쓸 수 있어 IP만으로 묶지 않고 견적별로 셈. 새로 그리기는 아래 renderPdf에서 따로 제한)
        $ipKey = 'quote-pdf-ip:' . $request->ip() . ':' . $id;
        if (RateLimiter::tooManyAttempts($ipKey, self::PDF_SIGNED_PER_MINUTE)) {
            return ApiResponse::error('요청이 너무 많아요. 잠시 후 다시 열어주세요.', ErrorCode::TOO_MANY_REQUESTS, 429);
        }
        RateLimiter::hit($ipKey, 60);

        $quote = Quote::find($id);
        if (!$quote) {
            return ApiResponse::error('존재하지 않는 견적서입니다.', ErrorCode::QUOTE_NOT_FOUND, 404);
        }
        // ★ v18.67 — 작성자가 탈퇴했으면 이미 보낸 링크(최대 3일)도 열리지 않게(고객 이름·연락처·주소 노출 방지).
        //   User::find는 탈퇴(소프트 삭제)한 계정을 못 찾음 → 저장해 둔 PDF도 지움
        $owner = User::find($quote->user_id);
        if (!$owner) {
            Storage::disk('local')->deleteDirectory(self::PDF_DIR . '/' . $quote->id);
            return ApiResponse::error('더 이상 열 수 없는 견적서입니다.', ErrorCode::QUOTE_NOT_FOUND, 404);
        }

        return $this->renderPdf($quote, $owner);
    }

    private function renderPdf(Quote $quote, ?User $user)
    {
        $quote->load(['lines', 'site']);
        $filename = '견적서_' . $quote->id . '.pdf';

        try {
            $card = BusinessCard::where('user_id', $quote->user_id)->where('is_public', true)->first();
            // ★ v18.47 — 무료는 하단에 "현장메이트로 작성" 문구, 개인 프로는 제거
            $showBranding = !\App\Services\PlanService::can($user, 'quote_branding');

            // ★ v18.67 — 내용이 그대로면 저장해 둔 PDF를 그대로 줌(새로 그리지 않음)
            $disk = Storage::disk('local');
            $dir  = self::PDF_DIR . '/' . $quote->id;
            $path = $dir . '/' . $this->pdfFingerprint($quote, $user, $card, $showBranding) . '.pdf';
            if ($disk->exists($path) && ($cached = $disk->get($path))) {
                return $this->pdfResponse($cached, $filename);
            }

            // ★ v18.67 — 새로 그리는 건 견적 주인 기준 분당 10번까지(수정 → PDF 반복으로 CPU를 태우지 못하게)
            $renderKey = 'quote-pdf-render:' . $quote->user_id;
            if (RateLimiter::tooManyAttempts($renderKey, self::PDF_RENDERS_PER_MINUTE)) {
                $seconds = max(1, RateLimiter::availableIn($renderKey));
                return ApiResponse::error("견적서 PDF를 너무 자주 만들고 있어요. {$seconds}초 뒤에 다시 시도해주세요.", ErrorCode::TOO_MANY_REQUESTS, 429);
            }
            RateLimiter::hit($renderKey, 60);

            $cardQrDataUri = null;
            if ($card) {
                $cardUrl = rtrim(config('app.url'), '/') . '/c/' . $card->share_code;
                $png = (new PngWriter())->write(new QrCode($cardUrl))->getString();
                $cardQrDataUri = 'data:image/png;base64,' . base64_encode($png);
            }

            $bytes = Pdf::loadView('quotes.basic', [
                'quote'         => $quote,
                'user'          => $user,
                'cardQrDataUri' => $cardQrDataUri,
                'showBranding'  => $showBranding,
            ])->output();
        } catch (\Throwable $e) {
            return ApiResponse::error('PDF 생성 중 오류가 발생했습니다.', ErrorCode::QUOTE_PDF_FAILED, 500);
        }

        $this->storePdf($dir, $path, $bytes);

        return $this->pdfResponse($bytes, $filename);
    }

    /**
     * ★ v18.67 — PDF 내용 지문: PDF에 들어가는 값이 하나라도 바뀌면 달라짐.
     *   견적 칸 전체(수정일 포함) + 항목(수정하면 지웠다 새로 만들어 id가 바뀜) + 현장 + 작성자 이름 + 공개 명함(QR) +
     *   요금제 문구 + 템플릿 파일 수정 시각(배포로 양식이 바뀌면 새로 그림).
     */
    private function pdfFingerprint(Quote $quote, ?User $user, ?BusinessCard $card, bool $showBranding): string
    {
        return sha1(json_encode([
            @filemtime(resource_path('views/quotes/basic.blade.php')),
            $quote->getAttributes(),
            $quote->lines->map(fn(QuoteLine $l) => $l->getAttributes())->all(),
            $quote->site?->only(['id', 'apt_name', 'dong', 'ho', 'address']),
            $user?->name,
            $card?->share_code,
            config('app.url'),
            $showBranding,
        ], JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR));
    }

    /** ★ v18.67 — 새로 그린 PDF 저장(그 견적의 예전 PDF는 지움 → 견적당 파일 1개). 저장 실패해도 응답은 그대로 */
    private function storePdf(string $dir, string $path, string $bytes): void
    {
        try {
            $disk = Storage::disk('local');
            foreach ($disk->files($dir) as $old) {
                if ($old !== $path) {
                    $disk->delete($old);
                }
            }
            $disk->makeDirectory($dir);
            // 임시 파일에 쓴 뒤 이름 바꾸기 — 동시에 여는 사람이 반쯤 쓴 파일을 받지 않게
            $abs = $disk->path($path);
            $tmp = $abs . '.' . bin2hex(random_bytes(4)) . '.tmp';
            if (file_put_contents($tmp, $bytes) !== false && !@rename($tmp, $abs)) {
                @unlink($tmp);
            }
        } catch (\Throwable $e) {
            // 저장은 다음 요청 때 다시 시도(PDF 응답에는 영향 없음)
        }
    }

    /** DomPDF download()와 같은 헤더(첨부 파일, 한글 파일명 + 영문 대체 이름) */
    private function pdfResponse(string $bytes, string $filename)
    {
        return response($bytes, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => HeaderUtils::makeDisposition('attachment', $filename, str_replace('%', '', Str::ascii($filename))),
            'Content-Length'      => strlen($bytes),
        ]);
    }

    // ─────────────────────────────────────────────
    // 내부 헬퍼
    // ─────────────────────────────────────────────

    private function findQuote(Request $request, string $id): ?Quote
    {
        return Quote::where('user_id', $request->user()->id)->find($id);
    }

    /** 세금 계산 — Quote::calcTax 참고. 반환: [부가세금액, 합계금액] */
    private function calculateTax(float $subtotal, float $discount, string $taxType): array
    {
        return Quote::calcTax($subtotal, $discount, $taxType);
    }

    private function learnMaterial(int $userId, ?int $workTypeId, array $line): void
    {
        $material = UserMaterial::where('user_id', $userId)
            ->where('name', $line['name'])
            ->first();

        if ($material) {
            $material->usage_count++;
            $material->last_used_at = now();
            $material->default_unit_price = $line['unit_price'];
            $material->save();
            return;
        }

        UserMaterial::create([
            'user_id'             => $userId,
            'work_type_id'        => $workTypeId,
            'name'                => $line['name'],
            'unit'                => $line['unit'] ?? '개',
            'default_unit_price'  => $line['unit_price'],
            'usage_count'         => 1,
            'last_used_at'        => now(),
        ]);
    }
}
