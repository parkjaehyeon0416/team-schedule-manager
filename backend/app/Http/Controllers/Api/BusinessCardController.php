<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\BusinessCard;
use App\Models\CardView;
use App\Models\SiteFile;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * 모바일 명함 컨트롤러 — ★ v14 신규
 *
 * 기획서 BusinessCardFeature_v1.0 반영. 사용자당 명함 1개(무료/유료 동일, 5-1절).
 * 시공 사진은 무료 티어 최대 3장(7절).
 * ★ v18.67 개인정보 — 최근 사진 자동 선택을 없앰. 공개 명함 웹페이지에 다른 고객 집 사진이 본인도 모르게 올라갔음.
 *   이제 사용자가 showcase_photo_ids로 직접 고른 사진만 공개(앱에 사진 고르기 화면은 디자인 후 추가 예정).
 *   공개 여부(is_public) 기본값은 그대로(DB 기본값 true) — 공개/비공개 토글 화면도 디자인 후 추가 예정.
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

        // ★ v18.62 보안 — 공개 명함에는 내가 올린 사진만(예전엔 아무 사진 번호나 넣어 남의 현장 사진을 공개할 수 있었음)
        // ★ v18.67 — 사진 번호를 보낸 경우에만 바꿈. 안 보내면 새 명함은 사진 없음, 기존 명함은 그대로
        //   (예전엔 안 보내면 저장할 때마다 최근 사진 3장을 자동으로 골라 공개했음 — 앱의 '프로필 설정' 저장도 여기로 옴)
        $sentShowcase = array_key_exists('showcase_photo_ids', $data);
        $showcaseIds = $sentShowcase && is_array($data['showcase_photo_ids'])
            ? SiteFile::where('uploaded_by', $user->id)
                ->where('file_type', 'photo')
                ->whereIn('id', $data['showcase_photo_ids'])
                ->pluck('id')->all()
            : [];
        unset($data['showcase_photo_ids']);

        if (!$card) {
            // ★ v18.67 — 지운(소프트 삭제) 명함이 남아 있으면 user_id 고유값 충돌로 500이 났음.
            //   옛 명함은 완전히 지우고 새 공유 코드로 만듦(옛 링크·QR이 다시 열리지 않게)
            $recreated = false;
            if ($old = BusinessCard::onlyTrashed()->where('user_id', $user->id)->first()) {
                CardView::where('card_id', $old->id)->delete();
                $old->forceDelete();
                $recreated = true;
            }

            $card = BusinessCard::create([
                ...$data,
                'user_id'            => $user->id,
                'share_code'         => $this->generateShareCode(),
                'showcase_photo_ids' => $showcaseIds,
                // ★ v18.67 — 지운 명함을 다시 만드는 경우엔 사용자가 is_public을 직접 보냈을 때만 공개.
                //   앱의 '프로필 설정' 저장은 매번 이 API를 부르고 is_public은 안 보냄 → 예전 그대로면
                //   삭제 요청을 처리한 명함이 카톡 아이디만 바꿔 저장해도 새 링크로 다시 공개됐음.
                //   처음 만드는 명함은 기존대로 DB 기본값(공개)을 따름. 공개/비공개 토글 화면은 디자인 후 추가 예정.
                ...($recreated ? ['is_public' => (bool) ($data['is_public'] ?? false)] : []),
            ]);

            return ApiResponse::success($card, '명함이 생성되었습니다.', 201);
        }

        $card->update([
            ...$data,
            ...($sentShowcase ? ['showcase_photo_ids' => $showcaseIds] : []),
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

    private function generateShareCode(): string
    {
        do {
            $code = strtolower(Str::random(8));
        } while (BusinessCard::where('share_code', $code)->exists());

        return $code;
    }
}
