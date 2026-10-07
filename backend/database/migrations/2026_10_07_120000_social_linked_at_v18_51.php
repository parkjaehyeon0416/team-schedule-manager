<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// ★ v18.51 — 로그인 연결 관리 화면의 "연결됨 · 날짜" 표시용
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('google_linked_at')->nullable()->after('kakao_id');
            $table->timestamp('kakao_linked_at')->nullable()->after('google_linked_at');
        });
        // 이미 연결된 계정은 정확한 연결일을 모르므로 가입일로 채움
        DB::table('users')->whereNotNull('google_id')->update(['google_linked_at' => DB::raw('created_at')]);
        DB::table('users')->whereNotNull('kakao_id')->update(['kakao_linked_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['google_linked_at', 'kakao_linked_at']);
        });
    }
};
