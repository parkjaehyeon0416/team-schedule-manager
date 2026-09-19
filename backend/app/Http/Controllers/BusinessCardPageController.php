<?php

namespace App\Http\Controllers;

use App\Models\BusinessCard;
use App\Models\CardView;
use App\Models\SiteFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * 명함 공개 웹페이지 — ★ v14 신규 (BusinessCardFeature_v1.0 4-3절 CardWebView)
 *
 * 앱 설치 없이도 볼 수 있어야 한다는 설계 원칙(2-3절)에 따라 인증 불필요한
 * 일반 웹 라우트(routes/web.php)로 제공한다. API가 아니라 실제 HTML 페이지를 렌더링한다.
 */
class BusinessCardPageController extends Controller
{
    /** 같은 방문자의 반복 조회를 1회로 묶어주는 시간 창(분) */
    private const DEDUP_WINDOW_MINUTES = 30;

    public function show(Request $request, string $code)
    {
        $card = BusinessCard::where('share_code', $code)
            ->where('is_public', true)
            ->first();

        if (!$card) {
            abort(404);
        }

        $this->trackView($request, $card);

        $showcasePhotos = collect();
        if (!empty($card->showcase_photo_ids)) {
            $showcasePhotos = SiteFile::whereIn('id', $card->showcase_photo_ids)
                ->get()
                ->map(fn($p) => Storage::disk('public')->url($p->file_path));
        }

        return view('cards.show', [
            'card'           => $card,
            'showcasePhotos' => $showcasePhotos,
        ]);
    }

    /**
     * 조회수 집계. 같은 IP가 짧은 시간 내 재조회하면 중복 카운트하지 않는다(기획서 5-2절).
     * IP는 SHA-256 해시로만 저장(개인정보 보호).
     */
    private function trackView(Request $request, BusinessCard $card): void
    {
        $ipHash = hash('sha256', $request->ip() ?? 'unknown');

        $recentDuplicate = CardView::where('card_id', $card->id)
            ->where('viewer_ip_hash', $ipHash)
            ->where('viewed_at', '>=', now()->subMinutes(self::DEDUP_WINDOW_MINUTES))
            ->exists();

        if ($recentDuplicate) {
            return;
        }

        CardView::create([
            'card_id'        => $card->id,
            'viewer_ip_hash' => $ipHash,
            'user_agent'     => substr((string) $request->userAgent(), 0, 255),
            'referrer'       => substr((string) $request->header('referer'), 0, 255),
            'viewed_at'      => now(),
        ]);

        $card->increment('view_count');
        $card->increment('monthly_view_count');
        $card->last_viewed_at = now();
        $card->save();
    }
}
