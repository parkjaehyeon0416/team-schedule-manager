<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ★ v18.68 — 명함 '현장 사진 공개' 범위 (BUSINESS_CARD 디자인의 라디오 3개)
 *
 *   showcase_mode: 'none'(공개 안 함) | 'after'(시공 후만) | 'both'(시공 전·후 모두). 기본 'none'
 *   → 기존 명함은 전부 'none'(사진 안 보임). 사용자가 앱에서 직접 골라야만 공개 명함 웹페이지에 사진이 나옴.
 *
 *   + site_files(uploaded_by, photo_category) 인덱스 — 공개 명함 페이지(로그인 없이 누구나 열 수 있음)가
 *     '명함 주인이 올린 시공 후/전 사진'을 찾을 때 사진 표 전체를 훑지 않게.
 */
return new class extends Migration
{
    private const INDEX = 'site_files_uploader_category_idx';

    public function up(): void
    {
        if (!Schema::hasColumn('business_cards', 'showcase_mode')) {
            Schema::table('business_cards', function (Blueprint $table) {
                $table->string('showcase_mode', 10)->default('none')->after('showcase_photo_ids');
            });
        }

        if (!Schema::hasIndex('site_files', self::INDEX)) {
            Schema::table('site_files', function (Blueprint $table) {
                $table->index(['uploaded_by', 'photo_category'], self::INDEX);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasIndex('site_files', self::INDEX)) {
            Schema::table('site_files', function (Blueprint $table) {
                $table->dropIndex(self::INDEX);
            });
        }

        if (Schema::hasColumn('business_cards', 'showcase_mode')) {
            Schema::table('business_cards', function (Blueprint $table) {
                $table->dropColumn('showcase_mode');
            });
        }
    }
};
