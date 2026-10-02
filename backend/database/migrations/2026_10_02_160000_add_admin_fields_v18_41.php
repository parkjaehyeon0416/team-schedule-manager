<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ★ v18.41 — 운영자 웹 디자인(ADMIN_*) 반영
 *   notices.view_count : 공지·이벤트 목록의 "조회" 열 (앱에서 상세를 열 때마다 +1)
 *   users.suspended_at / suspended_reason : 회원 관리 — 계정 정지(로그인 차단)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notices', function (Blueprint $table) {
            $table->unsignedInteger('view_count')->default(0)->after('author');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('suspended_at')->nullable()->after('user_type');
            $table->string('suspended_reason', 255)->nullable()->after('suspended_at');
        });
    }

    public function down(): void
    {
        Schema::table('notices', function (Blueprint $table) {
            $table->dropColumn('view_count');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['suspended_at', 'suspended_reason']);
        });
    }
};
