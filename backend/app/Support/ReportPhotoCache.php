<?php

namespace App\Support;

use App\Models\SiteFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * ★ v18.67 보안 — 보고서 PDF에 넣을 사진 준비(줄인 JPEG 보관본).
 *
 *   dompdf는 PNG(특히 투명 PNG)를 픽셀마다 PHP로 처리하고, JPEG은 원본 바이트를 통째로 메모리에 올림.
 *   그래서 큰 사진 몇 장이나 많은 사진으로 보고서 한 건이 워커를 수십 초 붙잡거나 메모리 초과(Fatal)로 죽었음.
 *   - 사진을 올릴 때(응답을 보낸 뒤) 긴 변 1200px·품질 72 JPEG 보관본을 미리 만들어 둠
 *     → PDF를 만들 때는 큰 원본을 펼치지 않고 작은 보관본만 넣음
 *   - 아주 가벼운 JPEG(긴 변 1600px·350KB 이하, 회전 정보 없음)은 원본 그대로 써도 돼서 보관본을 안 만듦
 *   - 2500만 화소가 넘는 사진은 펼치지 않음(보고서에서 뺌). 업로드는 가로·세로 6000px까지라 이런 사진도 들어올 수 있음
 *   - 보관본은 비공개 디스크(local)의 report-photo-cache/{사진 id}.jpg. 사진을 지우면 같이 지움(PhotoController)
 */
final class ReportPhotoCache
{
    public const DIR           = 'report-photo-cache';
    public const MAX_SIDE      = 1200;        // 보관본 긴 변(px)
    public const QUALITY       = 72;          // 보관본 JPEG 품질
    public const MAX_PIXELS    = 25_000_000;  // 이보다 픽셀이 많은 JPEG은 펼치지 않음(2500만 화소 ≈ 메모리 100MB)
    public const MAX_PNG_PIXELS = 12_000_000; // PNG는 GD가 원본을 한 번 더 통째로 풀어서 메모리를 두 배 씀(2500만 화소 PNG ≈ 220MB) → 1200만 화소까지
    public const RAW_MAX_SIDE  = 1600;        // 원본을 그대로 넣어도 되는 JPEG: 긴 변 이하
    public const RAW_MAX_BYTES = 350_000;     //   + 용량 이하

    /** 머리글(getimagesize)만 읽은 [가로, 세로, 종류] — 못 읽으면 null(사진을 펼치지 않음) */
    public static function info(?string $abs): ?array
    {
        if (!$abs || !is_file($abs)) {
            return null;
        }
        $info = @getimagesize($abs);
        if (!$info || empty($info[0]) || empty($info[1])) {
            return null;
        }
        return [(int) $info[0], (int) $info[1], (int) $info[2]];
    }

    /** PDF에 넣을 수 있는 사진인가(JPG는 2500만, PNG는 1200만 화소 이하) */
    public static function supported(array $info): bool
    {
        [$w, $h, $type] = $info;
        return match ($type) {
            IMAGETYPE_JPEG => $w * $h <= self::MAX_PIXELS,
            IMAGETYPE_PNG  => $w * $h <= self::MAX_PNG_PIXELS,
            default        => false,
        };
    }

    /** 원본을 그대로 PDF에 넣어도 될 만큼 가벼운 JPEG인가(회전 정보가 있으면 보관본에서 바로 세움) */
    public static function rawUsable(array $info, string $abs): bool
    {
        [$w, $h, $type] = $info;
        return $type === IMAGETYPE_JPEG
            && max($w, $h) <= self::RAW_MAX_SIDE
            && (int) @filesize($abs) <= self::RAW_MAX_BYTES
            && self::orientation($abs) === 1;
    }

    /** 이미 만들어 둔 보관본 경로(없으면 null) */
    public static function cachedPath(int $photoId): ?string
    {
        $rel = self::DIR . '/' . $photoId . '.jpg';
        $disk = Storage::disk('local');
        return $disk->exists($rel) ? $disk->path($rel) : null;
    }

    /** 보관본 지우기(사진을 지울 때) */
    public static function forget(int $photoId): void
    {
        Storage::disk('local')->delete(self::DIR . '/' . $photoId . '.jpg');
    }

    /**
     * 보관본 만들기 — 만든(또는 이미 있던) 파일 경로, 못 만들면 null.
     *   2500만 화소가 넘거나 JPG·PNG가 아니면 펼치지 않음. 투명 부분은 흰 배경, 휴대폰 사진 회전 정보(EXIF)는 반영.
     */
    public static function make(SiteFile $photo): ?string
    {
        if ($cached = self::cachedPath((int) $photo->id)) {
            return $cached;
        }
        $src = $photo->absolute_path;
        $info = self::info($src);
        if (!$info || !self::supported($info) || !function_exists('imagecreatetruecolor')) {
            return null;
        }
        [$w, $h, $type] = $info;
        $isJpeg = $type === IMAGETYPE_JPEG;

        // 2500만 화소 사진을 펼치면 100MB 정도 씀 — 이 요청에서만 256M까지 올림(이미 더 크면 그대로)
        self::ensureMemory(256 * 1024 * 1024);

        $img = $isJpeg ? @imagecreatefromjpeg($src) : @imagecreatefrompng($src);
        if (!$img) {
            return null; // CMYK JPEG 등 GD가 못 여는 사진은 보고서에서 뺌(큰 원본을 그대로 넣지 않음)
        }
        $scale = min(1, self::MAX_SIDE / max($w, $h));
        $nw = max(1, (int) round($w * $scale));
        $nh = max(1, (int) round($h * $scale));
        // 아주 큰 사진은 먼저 빠르게(최근접) 목표의 2배로 줄인 뒤 부드럽게 줄임 — 5000px 사진 1.1초 → 0.45초
        if (max($w, $h) > self::MAX_SIDE * 2) {
            $mw = $nw * 2;
            $mh = $nh * 2;
            $mid = imagecreatetruecolor($mw, $mh);
            imagealphablending($mid, false);
            imagesavealpha($mid, true);
            imagecopyresized($mid, $img, 0, 0, 0, 0, $mw, $mh, $w, $h);
            imagedestroy($img);
            [$img, $w, $h] = [$mid, $mw, $mh];
        }
        $dst = imagecreatetruecolor($nw, $nh);
        imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
        imagecopyresampled($dst, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
        imagedestroy($img);

        if ($isJpeg) {
            $dst = self::applyOrientation($dst, self::orientation($src));
        }

        $disk = Storage::disk('local');
        $disk->makeDirectory(self::DIR);
        $abs = $disk->path(self::DIR . '/' . $photo->id . '.jpg');
        $tmp = $abs . '.' . getmypid() . '.tmp';
        $ok = imagejpeg($dst, $tmp, self::QUALITY);
        imagedestroy($dst);
        if (!$ok || !@rename($tmp, $abs)) {
            @unlink($tmp);
            return null;
        }

        return $abs;
    }

    /** 보고서에 넣으려면 보관본이 필요한 사진이면 만들어 둠(가벼운 JPEG·너무 큰 사진·이미 있으면 건너뜀) */
    public static function warm(SiteFile $photo): void
    {
        $src = $photo->absolute_path;
        $info = self::info($src);
        if (!$info || !self::supported($info) || self::rawUsable($info, $src)) {
            return;
        }
        self::make($photo);
    }

    /** 사진을 올린 뒤 — 응답을 먼저 보내고 보관본을 만듦(올리는 사람은 기다리지 않음) */
    public static function warmAfterResponse(SiteFile $photo): void
    {
        app()->terminating(function () use ($photo) {
            try {
                self::warm($photo);
            } catch (\Throwable $e) {
                Log::warning('보고서용 사진 보관본 만들기 실패', ['photo_id' => $photo->id, 'error' => $e->getMessage()]);
            }
        });
    }

    /** JPEG 회전 정보(EXIF Orientation, 1~8). 없거나 못 읽으면 1 */
    private static function orientation(string $abs): int
    {
        if (!function_exists('exif_read_data')) {
            return 1;
        }
        $exif = @exif_read_data($abs);
        $o = is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1;
        return $o >= 1 && $o <= 8 ? $o : 1;
    }

    /** 회전 정보대로 이미지를 바로 세움(줄인 뒤라 가벼움) */
    private static function applyOrientation(\GdImage $img, int $o): \GdImage
    {
        if ($o === 1) {
            return $img;
        }
        if (in_array($o, [2, 4, 5, 7], true)) {
            imageflip($img, IMG_FLIP_HORIZONTAL);
        }
        // imagerotate는 반시계 방향 각도. 좌우 뒤집기를 먼저 했으므로 5·7은 6·8과 방향이 반대
        $angle = match ($o) {
            3, 4 => 180,
            6, 7 => 270, // 시계 방향 90도
            5, 8 => 90,  // 반시계 방향 90도
            default => 0,
        };
        if ($angle) {
            $rotated = imagerotate($img, $angle, 0);
            if ($rotated) {
                imagedestroy($img);
                $img = $rotated;
            }
        }
        return $img;
    }

    /** memory_limit를 최소 $bytes로(이미 더 크거나 무제한이면 그대로 — 낮추지 않음) */
    public static function ensureMemory(int $bytes): void
    {
        $cur = trim((string) ini_get('memory_limit'));
        if ($cur === '-1') {
            return;
        }
        $n = (int) $cur;
        $unit = strtolower(substr($cur, -1));
        $n *= match ($unit) { 'g' => 1024 ** 3, 'm' => 1024 ** 2, 'k' => 1024, default => 1 };
        if ($n < $bytes) {
            ini_set('memory_limit', (string) $bytes);
        }
    }
}
