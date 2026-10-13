<?php

namespace App\Console\Commands;

use App\Models\SiteFile;
use App\Support\ReportPhotoCache;
use Illuminate\Console\Command;

/**
 * ★ v18.67 — 이미 올라와 있는 현장 사진의 보고서용 줄인 사진(보관본)을 한 번에 만들어 둠(배포 직후 한 번 실행).
 *   v18.67부터는 사진을 올릴 때 보관본을 만들고, 보고서 PDF를 만들 때는 한 번에 새로 줄이는 양을 제한함.
 *   그래서 배포 전에 올라온 사진은 보고서에 바로 안 들어갈 수 있음 → 이 명령으로 미리 만들어 두면 됨.
 *   이미 보관본이 있거나, 원본을 그대로 써도 되는 가벼운 사진, 너무 큰 사진은 건너뜀. 여러 번 실행해도 안전.
 *
 *   php artisan report-photos:warm
 */
class WarmReportPhotos extends Command
{
    protected $signature = 'report-photos:warm {--limit=0 : 최대 몇 장까지 처리할지(0이면 전부)}';
    protected $description = '보고서 PDF용 줄인 사진(보관본)을 아직 없는 현장 사진에 대해 만들어 둠';

    public function handle(): int
    {
        $limit = (int) $this->option('limit');
        $done = 0;
        $made = 0;
        SiteFile::where('file_type', 'photo')->orderBy('id')->chunkById(200, function ($photos) use (&$done, &$made, $limit) {
            foreach ($photos as $photo) {
                if ($limit > 0 && $done >= $limit) {
                    return false;
                }
                $done++;
                if (ReportPhotoCache::cachedPath((int) $photo->id)) {
                    continue;
                }
                try {
                    ReportPhotoCache::warm($photo);
                    if (ReportPhotoCache::cachedPath((int) $photo->id)) {
                        $made++;
                    }
                } catch (\Throwable $e) {
                    $this->warn("사진 {$photo->id}: " . $e->getMessage());
                }
                gc_collect_cycles();
            }
        });

        $this->info("확인한 사진 {$done}장, 새로 만든 보관본 {$made}장");
        return self::SUCCESS;
    }
}
