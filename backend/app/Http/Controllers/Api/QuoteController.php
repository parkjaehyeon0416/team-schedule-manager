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
use App\Models\UserMaterial;
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
                'total_amount'     => max(0, $subtotal - $discount),
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
                'user'          => $request->user(),
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
