<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ★ v18.48 — 팀 화면 디자인(TEAM_DETAIL·TEAM_SETTLEMENT_DETAIL)에 필요한 값
 *   - team_settlements.snapshot: 지급 처리 당시 일정별 공수·단가 → 이후 바뀐 일정에 "단가 변경 22만 → 23만" 표시
 *   - team_members.notices_read_at: 팀 공지를 마지막으로 본 때 → 팀 상세 "새 글 N"
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_settlements', function (Blueprint $table) {
            $table->json('snapshot')->nullable()->after('paid_amount');
        });
        Schema::table('team_members', function (Blueprint $table) {
            $table->timestamp('notices_read_at')->nullable()->after('is_sub_leader');
        });
    }

    public function down(): void
    {
        Schema::table('team_members', fn(Blueprint $t) => $t->dropColumn('notices_read_at'));
        Schema::table('team_settlements', fn(Blueprint $t) => $t->dropColumn('snapshot'));
    }
};
