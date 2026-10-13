<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ★ v18.67 개인정보 — 명함 시공 사진 자동 선택분 비움 (보안 점검 audit66)
 *
 *   앱(그리고 운영자 웹)에 명함 사진을 고르는 화면이 한 번도 없었으므로, 지금까지 저장된 showcase_photo_ids는
 *   전부 서버가 '최근 사진 3장'으로 자동으로 고른 것임(사용자가 고른 사진이 아님).
 *   그래서 다른 고객 집 사진이 본인도 모르게 공개 명함 웹페이지에 올라가 있었음 → 목록만 비움(사진 파일·사진 기록은 그대로).
 *   (작업 지시는 '오늘 이전에 만든 명함'이었지만, 이 코드가 배포되기 전까지는 오늘 만든 명함도 자동 선택이라 전부 비움)
 *
 * 되돌리기(down)는 하지 않음 — 어떤 사진이 자동으로 골라졌었는지 다시 공개할 이유가 없음.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('business_cards')->update(['showcase_photo_ids' => json_encode([])]);
    }

    public function down(): void
    {
        // 되돌리지 않음
    }
};
