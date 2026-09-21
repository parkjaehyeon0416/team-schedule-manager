<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * 비밀번호 재설정용 6자리 인증코드 저장 테이블.
     * 딥링크 인프라가 없는 모바일 앱 특성상, 긴 토큰이 담긴 URL 방식(Laravel 기본
     * password_reset_tokens) 대신 앱 안에서 직접 입력하는 숫자 코드 방식을 사용함.
     */
    public function up(): void
    {
        Schema::create('password_reset_codes', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('code', 6);
            $table->timestamp('expires_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('password_reset_codes');
    }
};
