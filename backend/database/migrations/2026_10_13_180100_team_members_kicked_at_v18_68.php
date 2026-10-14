<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ★ v18.68 — 팀원 내보내기(TEAM_DETAIL_KICK)
 *   - team_members.kicked_at: 팀장이 내보낸 때(스스로 나간 건 null).
 *   - team_members.kicked_invite_code: 내보낼 때 그 팀의 초대 코드. 내보내진 사람은 이 코드로는 다시 못 들어오고,
 *     그 뒤에 새로 만든 코드(새 코드 만들기·만료 후 재발급)로만 들어올 수 있음("다시 함께하려면 초대 링크를 새로 보내야 해요").
 *     예전엔 "코드 만든 때 > 내보낸 때"로 비교해서, 내보낸 그 초에 만든 새 코드도 막혔고(초 단위) 만든 때를
 *     만료일 − 7일로 거꾸로 계산해 유효기간을 바꾸면 어긋났음 → 코드 자체를 기억해 비교.
 *     다시 들어오면 둘 다 null로 돌아감(TeamController::join).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_members', function (Blueprint $table) {
            $table->timestamp('kicked_at')->nullable()->after('notices_read_at');
            $table->string('kicked_invite_code', 32)->nullable()->after('kicked_at');
        });
    }

    public function down(): void
    {
        Schema::table('team_members', fn(Blueprint $t) => $t->dropColumn(['kicked_at', 'kicked_invite_code']));
    }
};
