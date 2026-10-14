<?php

namespace App\Support;

use App\Models\BusinessCard;
use App\Models\SiteFile;
use Illuminate\Database\Eloquent\Builder;

/**
 * ★ v18.68 공개 명함 현장 사진 고르기 — 한곳에 모음
 *
 *   공개 명함 웹페이지(/c/{code}, BusinessCardPageController)와 앱 '프로필' 화면(GET /api/business-card의
 *   showcase_photos)이 늘 같은 사진을 보여주도록 같은 규칙을 씀. 사진 주소도 같은 /c/{code}/p/{사진 id}
 *   (GD로 다시 만든 긴 변 640px JPEG, EXIF 없음)만 내보냄 — 원본(/storage/…)은 촬영 위치 GPS가 남아 있어 절대 안 씀.
 *
 *   showcase_mode별 규칙
 *   - none : 사진 없음(기본값)
 *   - after: 명함 주인이 직접 올린 '시공 후' 사진 최대 3장, 최근 것부터.
 *            예전 방식의 showcase_photo_ids(직접 고른 사진)가 있으면 그중 '내가 올린 시공 후 사진'을 먼저(고른 순서) 넣고
 *            남은 자리를 최근 시공 후 사진으로 채움. 시공 전·중·기타 사진이나 남이 올린 사진은 골라 놨어도 안 나옴
 *   - both : 같은 현장의 '시공 전 1장 + 시공 후 1장' 짝을 최대 3쌍, 최근 시공 후 사진이 있는 현장부터.
 *            그 현장에 짝(paired_with_id)이 지정된 시공 후 사진이 있으면 그 짝을, 없으면 가장 최근 전·후 사진을 씀.
 *            시공 전 사진이 없는 현장은 건너뜀. (showcase_photo_ids는 안 씀)
 *   - 공통: 지운 사진·지운 현장의 사진, 파일이 없거나 깨진 사진은 뺌
 */
final class CardShowcase
{
    /** 공개 명함에 보여줄 사진: 시공 후 3장 / 전·후 3쌍 */
    public const LIMIT = 3;
    /** 고를 후보로 훑는 최근 시공 후 사진 수(사진이 아주 많은 사람도 페이지가 느려지지 않게) */
    public const CANDIDATE_LIMIT = 40;
    /** 시공 전/후 짝을 찾을 때 읽는 시공 전 사진 수 상한 */
    public const BEFORE_LIMIT = 300;

    /** 이번 요청에서 이미 확인한 '내보낼 수 있는 사진인가' 결과(사진 id → bool) */
    private array $servable = [];

    /**
     * showcase_mode에 따라 보여줄 사진 — [['after' => 사진], …] 또는 [['before' => 사진, 'after' => 사진], …]
     *   명함 공개 여부·회원 정지는 여기서 보지 않음(웹은 findPublicCard, 앱은 forApp에서 확인)
     */
    public function pick(BusinessCard $card): array
    {
        return match ($card->showcase_mode) {
            BusinessCard::SHOWCASE_AFTER => $this->afterPhotos($card),
            BusinessCard::SHOWCASE_BOTH  => $this->beforeAfterPairs($card),
            default                      => [],
        };
    }

    /**
     * 앱용 — 지금 공개 명함 웹페이지에 보이는 사진을 같은 순서로
     *   [{ url: '/c/{code}/p/{id}', category: 'after' }, …]                       (after)
     *   [{ url, category: 'before', pair_index: 0 }, { url, category: 'after', pair_index: 0 }, …] (both)
     *   url은 서버 기준 상대 주소(팀 앨범 API와 같은 방식 — 앱이 서버 주소를 붙임).
     *   비공개 명함은 웹페이지·사진 주소가 404라 빈 배열.
     */
    public static function forApp(BusinessCard $card): array
    {
        if (!$card->is_public || !$card->share_code) {
            return [];
        }

        $items = [];
        foreach ((new self())->pick($card) as $i => $set) {
            if (isset($set['before'])) {
                $items[] = ['url' => self::path($card, $set['before']), 'category' => 'before', 'pair_index' => $i];
                $items[] = ['url' => self::path($card, $set['after']), 'category' => 'after', 'pair_index' => $i];
            } else {
                $items[] = ['url' => self::path($card, $set['after']), 'category' => 'after'];
            }
        }

        return $items;
    }

    /** 공개 명함 사진 주소(EXIF 없는 줄인 JPEG) — BusinessCardPageController::photo */
    public static function path(BusinessCard $card, SiteFile $photo): string
    {
        return '/c/' . $card->share_code . '/p/' . $photo->id;
    }

    // ─────────────────────────────────────────────
    // 내부
    // ─────────────────────────────────────────────

    /** 명함 주인이 직접 올린, 지금 남아 있는(사진도 현장도 안 지운) 한 종류(시공 전/후)의 사진 */
    private function ownerPhotos(BusinessCard $card, string $category): Builder
    {
        return SiteFile::query()
            ->select(['id', 'site_id', 'file_path', 'photo_category', 'paired_with_id'])
            ->where('uploaded_by', $card->user_id)
            ->where('file_type', 'photo')
            ->where('photo_category', $category)
            ->whereExists(fn($q) => $q->selectRaw('1')->from('sites')
                ->whereColumn('sites.id', 'site_files.site_id')
                ->whereNull('sites.deleted_at'));
    }

    /** 시공 후 사진 최대 3장 — 직접 고른 사진(showcase_photo_ids) 중 시공 후 사진을 먼저, 나머지는 최근 순 */
    private function afterPhotos(BusinessCard $card): array
    {
        $picked = [];

        $preferred = collect($card->showcase_photo_ids ?? [])
            ->map(fn($id) => (int) $id)->filter()->unique()->values();
        if ($preferred->isNotEmpty()) {
            $byId = $this->ownerPhotos($card, 'after')->whereIn('id', $preferred->all())->get()->keyBy('id');
            foreach ($preferred as $id) {
                if (count($picked) >= self::LIMIT) {
                    break;
                }
                $p = $byId->get($id);
                if ($p && $this->isServable($p)) {
                    $picked[$p->id] = ['after' => $p];
                }
            }
        }

        if (count($picked) < self::LIMIT) {
            $recent = $this->ownerPhotos($card, 'after')
                ->whereNotIn('id', array_keys($picked))
                ->orderByDesc('id')
                ->limit(self::CANDIDATE_LIMIT)
                ->get();
            foreach ($recent as $p) {
                if (count($picked) >= self::LIMIT) {
                    break;
                }
                if ($this->isServable($p)) {
                    $picked[$p->id] = ['after' => $p];
                }
            }
        }

        return array_values($picked);
    }

    /** 같은 현장의 시공 전·후 짝 최대 3쌍 — 최근 시공 후 사진이 있는 현장부터 */
    private function beforeAfterPairs(BusinessCard $card): array
    {
        $afters = $this->ownerPhotos($card, 'after')
            ->orderByDesc('id')
            ->limit(self::CANDIDATE_LIMIT)
            ->get();
        if ($afters->isEmpty()) {
            return [];
        }

        $siteIds = $afters->pluck('site_id')->unique()->values(); // 최근 시공 후 사진 순 = 최근 현장 순
        $befores = $this->ownerPhotos($card, 'before')
            ->whereIn('site_id', $siteIds->all())
            ->orderByDesc('id')
            ->limit(self::BEFORE_LIMIT)
            ->get()
            ->groupBy('site_id');

        $pairs = [];
        foreach ($siteIds as $siteId) {
            if (count($pairs) >= self::LIMIT) {
                break;
            }
            $siteBefores = $befores->get($siteId);
            if (!$siteBefores || $siteBefores->isEmpty()) {
                continue; // 시공 전 사진이 없는 현장은 건너뜀
            }
            $siteAfters = $afters->where('site_id', $siteId); // 최근 순 그대로

            // ① 짝이 지정된 시공 후 사진이 있으면 그 짝
            $pair = null;
            foreach ($siteAfters as $a) {
                $b = $a->paired_with_id ? $siteBefores->firstWhere('id', $a->paired_with_id) : null;
                if ($b && $this->isServable($a) && $this->isServable($b)) {
                    $pair = ['before' => $b, 'after' => $a];
                    break;
                }
            }
            // ② 없으면 그 현장의 가장 최근 시공 전 + 시공 후
            if (!$pair) {
                $a = $siteAfters->first(fn($p) => $this->isServable($p));
                $b = $a ? $siteBefores->first(fn($p) => $this->isServable($p)) : null;
                if ($a && $b) {
                    $pair = ['before' => $b, 'after' => $a];
                }
            }
            if ($pair) {
                $pairs[] = $pair;
            }
        }

        return $pairs;
    }

    /**
     * 명함에 내보낼 수 있는 사진인가 — 줄인 보관본이 있거나, 원본이 GD로 열 수 있는 JPG·PNG(화소 상한 이하)
     *   머리글만 읽음(getimagesize). 파일이 없거나 깨진 사진은 빼서 페이지에 깨진 그림이 안 나오게.
     */
    private function isServable(SiteFile $p): bool
    {
        return $this->servable[$p->id] ??= (function () use ($p) {
            if (ReportPhotoCache::cachedPath((int) $p->id)) {
                return true;
            }
            $info = ReportPhotoCache::info($p->absolute_path);
            return $info !== null && ReportPhotoCache::supported($info);
        })();
    }
}
