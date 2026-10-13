<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ★ v18.67 보안 — 푸시 기기 등록을 로그인 세션(Sanctum 토큰)에 묶음 (보안 점검 audit66)
 *   예전엔 비밀번호 재설정·다른 기기 로그아웃·30일 만료로 세션이 끊겨도 그 기기에 알림(고객 주소 포함)이 계속 갔음.
 *   이제 등록할 때 어느 로그인 세션에서 했는지 저장하고, 그 세션이 없으면 발송하지 않음(PushService).
 *   기존 행은 null — 앱이 켜질 때마다 기기를 다시 등록하므로 다음 실행 때 채워짐. 그 전까지는 예전처럼 발송.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('device_tokens', function (Blueprint $table) {
            $table->unsignedBigInteger('personal_access_token_id')->nullable()->after('user_id')->index();
        });
    }

    public function down(): void
    {
        Schema::table('device_tokens', function (Blueprint $table) {
            $table->dropIndex(['personal_access_token_id']);
            $table->dropColumn('personal_access_token_id');
        });
    }
};
