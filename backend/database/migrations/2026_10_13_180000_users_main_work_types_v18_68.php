<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ★ v18.68 — 회원가입 '주요 공정'(디자인 AUTH_SIGNUP_PROFILE 칩: 도배·타일·필름·도장·목공·기타, 복수 선택·선택 안 해도 됨)
 *   문자열 배열을 json으로 저장(User 모델 casts 'array'). 선택 안 했거나 소셜·예전 가입 계정은 null.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('main_work_types')->nullable()->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('main_work_types');
        });
    }
};
