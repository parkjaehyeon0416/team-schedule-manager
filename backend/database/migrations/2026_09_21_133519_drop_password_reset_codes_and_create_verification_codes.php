<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * 비밀번호 재설정을 이메일 발송 방식에서 전화번호 SMS 인증 방식으로 바꾸면서,
     * 아이디 찾기(find-email)에도 같은 전화번호 인증 절차가 필요해져서 하나의
     * 범용 인증코드 테이블로 통합함. (phone, purpose) 조합으로 구분하고,
     * purpose='reset_password'인 경우 payload 컬럼에 대상 이메일을 저장해서
     * 최종 비밀번호 변경 단계에서 어떤 계정인지 식별함.
     */
    public function up(): void
    {
        Schema::dropIfExists('password_reset_codes');

        Schema::create('verification_codes', function (Blueprint $table) {
            $table->string('phone', 20);
            $table->string('purpose', 30); // 'find_email' | 'reset_password'
            $table->string('code', 6);
            $table->string('payload')->nullable(); // reset_password용 대상 이메일 등
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->primary(['phone', 'purpose']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('verification_codes');

        Schema::create('password_reset_codes', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('code', 6);
            $table->timestamp('expires_at');
            $table->timestamps();
        });
    }
};
