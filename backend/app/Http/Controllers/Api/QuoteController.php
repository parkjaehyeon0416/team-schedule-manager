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
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;

/**
 * 견적서(Quote) 컨트롤러 — ★ v12~v13 신규
 *
 * 기획서 ServicePlan_v2_6/2_7 반영. "기본 템플릿 + 자유 커스터마이징" 하이브리드
 * 설계는 프론트엔드에서 UserMaterial 자동완성으로 구현하고, 이 컨트롤러는
 * 견적 CRUD + PDF 생성 + 승인 시 일정(Schedule) 자동 전환을 담당한다.
 */
class QuoteController extends Controller
{
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

        $data = $request->validate([
            'client_name'      => 'nullable|string|max:100',
            'client_contact'   => 'nullable|string|max:100',
            'address'          => 'nullable|string|max:255',
            'site_id'          => 'nullable|integer|exists:sites,id',
            'work_type_id'     => 'nullable|integer|exists:work_types,id',
            'desired_date'     => 'nullable|date',
            'memo'             => 'nullable|string',
            'discount_amount'  => 'nullable|numeric|min:0',
            'tax_type'         => 'nullable|in:separate,included,exempt',
            'lines'            => 'required|array|min:1',
            'lines.*.name'       => 'required|string|max:100',
            'lines.*.spec'       => 'nullable|string|max:255',
            'lines.*.quantity'   => 'required|numeric|min:0',
            'lines.*.unit'       => 'nullable|string|max:20',
            'lines.*.unit_price' => 'required|numeric|min:0',
        ]);

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

        $data = $request->validate([
            'client_name'      => 'nullable|string|max:100',
            'client_contact'   => 'nullable|string|max:100',
            'address'          => 'nullable|string|max:255',
            'site_id'          => 'nullable|integer|exists:sites,id',
            'work_type_id'     => 'nullable|integer|exists:work_types,id',
            'desired_date'     => 'nullable|date',
            'memo'             => 'nullable|string',
            'discount_amount'  => 'nullable|numeric|min:0',
            'tax_type'         => 'nullable|in:separate,included,exempt',
            'lines'            => 'required|array|min:1',
            'lines.*.name'       => 'required|string|max:100',
            'lines.*.spec'       => 'nullable|string|max:255',
            'lines.*.quantity'   => 'required|numeric|min:0',
            'lines.*.unit'       => 'nullable|string|max:20',
            'lines.*.unit_price' => 'required|numeric|min:0',
        ]);

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

        if (!$quote->desired_date) {
            return ApiResponse::error('희망 시공일을 먼저 입력해주세요.', ErrorCode::QUOTE_MISSING_DATE, 422);
        }

        $schedule = DB::transaction(function () use ($quote, $user) {
            $siteId = $quote->site_id;

            // 연결된 현장이 없고 주소만 있으면 현장을 새로 만들어 연결
            if (!$siteId && $quote->address) {
                $site = Site::create([
                    'address' => $quote->address,
                    'team_id' => $user->team_id,
                ]);
                $siteId = $site->id;
            }

            $schedule = Schedule::create([
                'date'          => $quote->desired_date,
                'site_id'       => $siteId,
                'team_id'       => $user->team_id,
                'work_type_id'  => $quote->work_type_id,
                'daily_wage'    => $quote->total_amount,
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
        ], '견적이 승인되어 일정이 등록되었습니다.');
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

        return ApiResponse::success(null, '견적서가 삭제되었습니다.');
    }

    /**
     * 견적서 PDF 다운로드 — 저장하지 않고 요청마다 즉석 렌더링(수정 가능성이 높은 문서라 캐시하지 않음)
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
     * ★ v18.38 — 고객에게 보낼 견적서 링크(30일 유효). 앱이 카톡·문자 공유창으로 전달.
     *   다운로드용 pdf-link(10분)와 같은 서명 주소지만, 고객이 나중에 열 수 있게 기간만 길게.
     * GET /api/quotes/{id}/share-link
     */
    public function shareLink(Request $request, string $id)
    {
        $quote = $this->findQuote($request, $id);
        if (!$quote) {
            return ApiResponse::error('존재하지 않는 견적서입니다.', ErrorCode::QUOTE_NOT_FOUND, 404);
        }

        $path = URL::temporarySignedRoute('quotes.pdf.signed', now()->addDays(30), ['id' => $quote->id], absolute: false);

        return ApiResponse::success(['path' => $path], '공유 링크 발급 성공');
    }

    /**
     * ★ v18.36 — 서명 링크로 여는 PDF (인증 대신 signed 미들웨어가 접근 검증)
     * GET /api/files/quotes/{id}/pdf
     */
    public function signedPdf(string $id)
    {
        $quote = Quote::find($id);
        if (!$quote) {
            return ApiResponse::error('존재하지 않는 견적서입니다.', ErrorCode::QUOTE_NOT_FOUND, 404);
        }

        return $this->renderPdf($quote, User::find($quote->user_id));
    }

    private function renderPdf(Quote $quote, ?User $user)
    {
        $quote->load(['lines', 'site']);

        try {
            $card = BusinessCard::where('user_id', $quote->user_id)->where('is_public', true)->first();
            $cardQrDataUri = null;
            if ($card) {
                $cardUrl = rtrim(config('app.url'), '/') . '/c/' . $card->share_code;
                $png = (new PngWriter())->write(new QrCode($cardUrl))->getString();
                $cardQrDataUri = 'data:image/png;base64,' . base64_encode($png);
            }

            $pdf = Pdf::loadView('quotes.basic', [
                'quote'         => $quote,
                'user'          => $user,
                'cardQrDataUri' => $cardQrDataUri,
            ]);
        } catch (\Throwable $e) {
            return ApiResponse::error('PDF 생성 중 오류가 발생했습니다.', ErrorCode::QUOTE_PDF_FAILED, 500);
        }

        return $pdf->download('견적서_' . $quote->id . '.pdf');
    }

    // ─────────────────────────────────────────────
    // 내부 헬퍼
    // ─────────────────────────────────────────────

    private function findQuote(Request $request, string $id): ?Quote
    {
        return Quote::where('user_id', $request->user()->id)->find($id);
    }

    /**
     * 세금 계산 — ★ DESIGN-CANVAS(ESTIMATE_CREATE/EDIT) "세금" 탭 실계산.
     *   separate(부가세 별도): 공급가에 10% 더해서 합계
     *   included(부가세 포함): 합계는 공급가 그대로, 부가세는 그 안에 포함된 금액으로 역산해 표시만
     *   exempt(면세): 부가세 없음
     * 반환: [부가세금액, 합계금액]
     */
    private function calculateTax(float $subtotal, float $discount, string $taxType): array
    {
        $base = max(0, $subtotal - $discount);

        return match ($taxType) {
            'separate' => [round($base * 0.1), $base + round($base * 0.1)],
            'included' => [round($base - $base / 1.1), $base],
            default    => [0, $base], // exempt
        };
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
