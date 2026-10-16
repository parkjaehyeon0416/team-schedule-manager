<?php

namespace App\Http\Controllers;

use App\Models\BusinessCard;
use App\Models\CardView;
use App\Models\SiteFile;
use App\Support\CardShowcase;
use App\Support\ReportPhotoCache;
use Illuminate\Http\Request;

/**
 * 명함 공개 웹페이지 — ★ v14 신규 (BusinessCardFeature_v1.0 4-3절 CardWebView)
 *
 * 앱 설치 없이도 볼 수 있어야 한다는 설계 원칙(2-3절)에 따라 인증 불필요한
 * 일반 웹 라우트(routes/web.php)로 제공한다. API가 아니라 실제 HTML 페이지를 렌더링한다.
 *
 * ★ v18.68 현장 사진 공개 — 명함의 showcase_mode가 어떤 사진을 보여줄지 정함
 *   - none : 사진 없음(기본값)
 *   - after: 명함 주인이 직접 올린 '시공 후' 사진 최대 3장, 최근 것부터.
 *            예전 방식의 showcase_photo_ids(직접 고른 사진)가 있으면 그중 '내가 올린 시공 후 사진'을 먼저(고른 순서) 넣고
 *            남은 자리를 최근 시공 후 사진으로 채움. 시공 전·중·기타 사진이나 남이 올린 사진은 골라 놨어도 안 나옴
 *   - both : 같은 현장의 '시공 전 1장 + 시공 후 1장' 짝을 최대 3쌍, 최근 시공 후 사진이 있는 현장부터.
 *            그 현장에 짝(paired_with_id)이 지정된 시공 후 사진이 있으면 그 짝을, 없으면 가장 최근 전·후 사진을 씀.
 *            시공 전 사진이 없는 현장은 건너뜀. (showcase_photo_ids는 안 씀)
 *   - 공통: 지운 사진·지운 현장의 사진은 빼고, 고객 이름·현장 주소·날짜·사진 설명은 페이지에 넣지 않음
 *   - ★ v18.68 고르는 코드는 App\Support\CardShowcase로 옮김 — 앱 '프로필' 화면(GET /api/business-card의
 *     showcase_photos)도 같은 코드·같은 사진 주소를 써서 웹과 앱에 늘 같은 사진이 보임
 *
 * ★ v18.68 개인정보 — 휴대폰으로 찍은 현장 사진 원본에는 EXIF(촬영 위치 GPS = 고객 집 위치, 촬영 시각, 기기)가 그대로 남아 있음
 *   (업로드 때 원본을 그대로 저장). 그래서 공개 명함은 원본 주소(/storage/...)를 절대 쓰지 않고
 *   /c/{code}/p/{사진 id}로 GD로 다시 만든 작은 JPEG(긴 변 640px, EXIF 없음)만 내보냄.
 *   이 주소는 그 사진이 '지금 이 명함에 보이는 사진'일 때만 열림(비공개·사진 공개 안 함으로 바꾸면 바로 404).
 */
class BusinessCardPageController extends Controller
{
    /** 같은 방문자의 반복 조회를 1회로 묶어주는 시간 창(분) */
    private const DEDUP_WINDOW_MINUTES = 30;

    /** ★ v18.68 — 명함 사진 긴 변(px)·JPEG 품질 — 명함 폭(최대 420px)의 1.5~2배 해상도면 충분 */
    private const THUMB_SIDE = 640;
    private const THUMB_QUALITY = 75;

    /** ★ v18.68 — 이번 요청의 사진 고르기(파일 확인 결과를 요청 안에서 다시 씀) */
    private ?CardShowcase $picker = null;

    public function show(Request $request, string $code)
    {
        $card = $this->findPublicCard($code);

        if (!$card) {
            // ★ v18.67 — 영어 기본 404 대신 한국어 안내(이유는 구분하지 않음)
            return response()->view('cards.not-found', [], 404);
        }

        $this->trackView($request, $card);

        return view('cards.show', [
            'card'     => $card,
            // ★ v18.68 — [['after' => 사진], …] 또는 [['before' => 사진, 'after' => 사진], …]
            'showcase' => $this->showcase($card),
            // ★ v18.72 — 로그인 없이 누구나 보는 페이지라 앱 신고 버튼 대신 메일 신고 안내(Apple 1.2, 이용약관 제8조 4항)
            'supportEmail' => config('workmate.support_email') ?: 'workmatekr@gmail.com',
        ]);
    }

    /**
     * ★ v18.68 — 공개 명함 사진 한 장 (GET /c/{code}/p/{photo})
     *   지금 이 명함 페이지에 보이는 사진일 때만 줄인 JPEG(EXIF 없음)를 돌려줌. 아니면 빈 404(어떤 사진인지 안 드러남).
     *   사진마다 세션을 만들지 않게 세션 미들웨어는 뺌(routes/web.php).
     */
    public function photo(string $code, string $photo)
    {
        $notFound = fn() => response('', 404, ['Cache-Control' => 'no-store', 'X-Robots-Tag' => 'noindex']);

        $card = $this->findPublicCard($code);
        if (!$card) {
            return $notFound();
        }

        $id = (int) $photo;
        $file = collect($this->showcase($card))->flatten(1)->first(fn(SiteFile $p) => (int) $p->id === $id);
        if (!$file) {
            return $notFound();
        }

        // 보고서용 줄인 보관본(긴 변 1200px, GD로 다시 만들어 EXIF 없음·회전 반영, 사진을 지우면 같이 지워짐)을 바탕으로
        $src = ReportPhotoCache::make($file);
        $bytes = $src ? $this->thumbnail($src) : null;
        if ($bytes === null) {
            return $notFound();
        }

        return response($bytes, 200, [
            'Content-Type'           => 'image/jpeg',
            'Content-Length'         => (string) strlen($bytes),
            // 비공개로 바꾸면 새로 여는 사람은 바로 못 봄. 이미 본 사람 브라우저에만 1시간 남음(공유 캐시에는 안 남게 private)
            'Cache-Control'          => 'private, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
            'X-Robots-Tag'           => 'noindex',
        ]);
    }

    /**
     * 공개된 명함만 — 비공개·삭제한 명함, 주인이 탈퇴하거나 정지된 명함은 null
     *
     * ★ v18.67 보안 — 명함 주인이 탈퇴(소프트 삭제)했거나 운영자가 정지한 계정이면 열지 않음.
     *   예전엔 탈퇴 후에도 /c/{code}와 견적서·보고서 PDF 속 QR로 이름·전화번호·사진이 계속 공개됐음.
     *   (whereHas는 User의 SoftDeletes 기본 조건 때문에 탈퇴 계정을 자동으로 뺌)
     */
    private function findPublicCard(string $code): ?BusinessCard
    {
        return BusinessCard::where('share_code', $code)
            ->where('is_public', true)
            ->whereHas('user', fn($q) => $q->whereNull('suspended_at'))
            ->first();
    }

    /**
     * ★ v18.68 — showcase_mode에 따라 보여줄 사진. 고르는 규칙은 App\Support\CardShowcase 한곳에 둠
     *   (앱 '프로필' 화면의 GET /api/business-card showcase_photos도 같은 규칙·같은 사진 주소를 씀).
     *   페이지와 사진 주소(/p/{id}) 확인이 같은 결과를 씀.
     */
    private function showcase(BusinessCard $card): array
    {
        return ($this->picker ??= new CardShowcase())->pick($card);
    }

    /** 줄인 보관본(1200px)을 명함용 크기(긴 변 640px)로 다시 줄여 JPEG 바이트로 — GD로 새로 만들어 EXIF 없음 */
    private function thumbnail(string $src): ?string
    {
        $info = @getimagesize($src);
        if (!$info || empty($info[0]) || empty($info[1]) || $info[2] !== IMAGETYPE_JPEG) {
            return null;
        }
        [$w, $h] = $info;
        $img = @imagecreatefromjpeg($src);
        if (!$img) {
            return null;
        }

        $scale = min(1, self::THUMB_SIDE / max($w, $h));
        if ($scale < 1) {
            $nw = max(1, (int) round($w * $scale));
            $nh = max(1, (int) round($h * $scale));
            $dst = imagecreatetruecolor($nw, $nh);
            imagecopyresampled($dst, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
            imagedestroy($img);
            $img = $dst;
        }

        ob_start();
        $ok = imagejpeg($img, null, self::THUMB_QUALITY);
        $bytes = (string) ob_get_clean();
        imagedestroy($img);

        return $ok && $bytes !== '' ? $bytes : null;
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
