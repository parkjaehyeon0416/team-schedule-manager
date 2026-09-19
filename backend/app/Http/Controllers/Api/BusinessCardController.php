<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\BusinessCard;
use App\Models\SiteFile;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * 모바일 명함 컨트롤러 — ★ v14 신규
 *
 * 기획서 BusinessCardFeature_v1.0 반영. 사용자당 명함 1개(무료/유료 동일, 5-1절).
 * 시공 사진은 무료 티어 최대 3장(7절) — MVP는 수동 재선택 UI 없이 최근 사진 자동 추천만 구현.
 */
class BusinessCardController extends Controller
{
    private const FREE_SHOWCASE_LIMIT = 3;

    /**
     * 내 명함 조회 (없으면 null)
     * GET /api/business-card
     */
    public function show(Request $request)
    {
        $card = BusinessCard::where('user_id', $request->user()->id)->first();

        return ApiResponse::success($card, $card ? '명함 조회 성공' : '아직 명함이 없습니다.');
    }

    /**
     * 명함 생성 또는 수정 (upsert)
     * PUT /api/business-card
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'display_name'       => 'nullable|string|max:100',
            'contact_phone'      => 'nullable|string|max:30',
            'job_title'          => 'nullable|string|max:100',
            'years_experience'   => 'nullable|integer|min:0|max:80',
            'service_area'       => 'nullable|string|max:100',
            'specialty'          => 'nullable|string|max:255',
            'tagline'            => 'nullable|string|max:255',
            'is_public'          => 'nullable|boolean',
            // 수동으로 명함에 표시할 사진 id를 지정하고 싶을 때만 전달 (선택)
            'showcase_photo_ids' => 'nullable|array|max:' . self::FREE_SHOWCASE_LIMIT,
            'showcase_photo_ids.*' => 'integer|exists:site_files,id',
        ]);

        $card = BusinessCard::where('user_id', $user->id)->first();

        $showcaseIds = $data['showcase_photo_ids'] ?? $this->autoSelectShowcasePhotos($user);
        unset($data['showcase_photo_ids']);

        if (!$card) {
            $card = BusinessCard::create([
                ...$data,
                'user_id'            => $user->id,
                'share_code'         => $this->generateShareCode(),
                'showcase_photo_ids' => $showcaseIds,
            ]);

            return ApiResponse::success($card, '명함이 생성되었습니다.', 201);
        }

        $card->update([
            ...$data,
            'showcase_photo_ids' => $showcaseIds,
        ]);

        return ApiResponse::success($card, '명함이 수정되었습니다.');
    }

    /**
     * 명함 삭제
     * DELETE /api/business-card
     */
    public function destroy(Request $request)
    {
        $card = BusinessCard::where('user_id', $request->user()->id)->first();

        if (!$card) {
            return ApiResponse::error('명함이 존재하지 않습니다.', ErrorCode::CARD_NOT_FOUND, 404);
        }

        $card->delete();

        return ApiResponse::success(null, '명함이 삭제되었습니다.');
    }

    // ─────────────────────────────────────────────
    // 내부 헬퍼
    // ─────────────────────────────────────────────

    /**
     * ★ 원칙 ② 시공 사진 자동 연동 — 사용자가 업로드한 최근 사진 중 최대 3장을 자동 추천.
     * (수동 재선택 UI는 이번 범위 밖 — DevManual v14.0 참고)
     */
    private function autoSelectShowcasePhotos($user): array
    {
        return SiteFile::where('uploaded_by', $user->id)
            ->where('file_type', 'photo')
            ->orderByDesc('created_at')
            ->limit(self::FREE_SHOWCASE_LIMIT)
            ->pluck('id')
            ->toArray();
    }

    private function generateShareCode(): string
    {
        do {
            $code = strtolower(Str::random(8));
        } while (BusinessCard::where('share_code', $code)->exists());

        return $code;
    }
}
