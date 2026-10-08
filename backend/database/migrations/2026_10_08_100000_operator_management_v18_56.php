<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// ★ v18.56 — 운영자 관리: 초대 중/활성 구분(password_set_at), 마지막 접속(last_login_at), 운영자 휴대폰(operator_phone)
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('password_set_at')->nullable()->after('password');
            $table->timestamp('last_login_at')->nullable()->after('password_set_at');
            // 운영자 링크 받을 휴대폰 — users.phone은 unique(앱 가입·아이디 찾기용)라 같은 사람이 앱에도 가입할 수 있게 따로 둠
            $table->string('operator_phone', 20)->nullable()->after('phone');
        });
        // 이미 로그인한 적 있는 운영자(토큰 있음)는 비밀번호를 설정한 것으로 봄
        $loggedIn = DB::table('personal_access_tokens')->where('tokenable_type', 'App\\Models\\User')->pluck('tokenable_id');
        DB::table('users')->where('user_type', 'operator')->whereIn('id', $loggedIn)->update(['password_set_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['password_set_at', 'last_login_at', 'operator_phone']);
        });
    }
};
