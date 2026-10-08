<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/**
 * ★ v18.63 — 보고서 공유 링크 3일 만료 + PDF를 공개 폴더(storage/app/public)에서 비공개 폴더로 이동.
 *   예전엔 링크가 영원히 열리고, /storage/reports/{token}.pdf 주소로도 바로 열렸음.
 *   기존 보고서는 만든 날 + 3일로 만료일을 채움(이미 지났으면 앱에서 다시 공유하면 새 링크).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_reports', function (Blueprint $table) {
            $table->timestamp('share_expires_at')->nullable()->after('share_token');
        });

        DB::table('site_reports')->update(['share_expires_at' => DB::raw('DATE_ADD(created_at, INTERVAL 3 DAY)')]);

        // 기존 PDF 파일을 비공개 디스크로 옮김
        foreach (DB::table('site_reports')->whereNotNull('pdf_path')->pluck('pdf_path') as $path) {
            if (Storage::disk('public')->exists($path) && !Storage::disk('local')->exists($path)) {
                Storage::disk('local')->put($path, Storage::disk('public')->get($path));
                Storage::disk('public')->delete($path);
            }
        }
    }

    public function down(): void
    {
        foreach (DB::table('site_reports')->whereNotNull('pdf_path')->pluck('pdf_path') as $path) {
            if (Storage::disk('local')->exists($path) && !Storage::disk('public')->exists($path)) {
                Storage::disk('public')->put($path, Storage::disk('local')->get($path));
            }
        }
        Schema::table('site_reports', function (Blueprint $table) {
            $table->dropColumn('share_expires_at');
        });
    }
};
