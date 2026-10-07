<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ★ v18.47 — 팀 요금제 기능 + 요금제 구조
 *   - 부팀장: team_members.is_sub_leader (팀장이 일정 배정 권한을 나눠 줌)
 *   - 팀 공지: team_notices (팀원 전체 푸시)
 *   - 팀원 정산표: team_settlements (팀원별 월 정산 지급 여부 기록, 금액은 일정에서 계산)
 *   - 요금제: users.plan / plan_expires_at (free·pro·team·team_pro). 예전 individual_plan(free/standard)은 손대지 않음
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_members', function (Blueprint $table) {
            $table->boolean('is_sub_leader')->default(false)->after('role_id');
        });

        Schema::create('team_notices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained('teams');
            $table->foreignId('user_id')->constrained('users'); // 작성자
            $table->text('body');
            $table->boolean('pinned')->default(false);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['team_id', 'created_at']);
        });

        Schema::create('team_settlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained('teams');
            $table->foreignId('user_id')->constrained('users'); // 정산 받는 팀원
            $table->char('year_month', 7);                      // 2026-10
            $table->decimal('paid_amount', 12, 2)->nullable(); // 지급 처리할 때의 금액(이후 일정이 바뀌면 화면에 "금액 변경됨")
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('paid_by')->nullable()->constrained('users');
            $table->string('memo', 200)->nullable();
            $table->timestamps();
            $table->unique(['team_id', 'user_id', 'year_month']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('plan', 20)->default('free')->after('individual_plan_expires_at');
            $table->timestamp('plan_expires_at')->nullable()->after('plan');
        });
    }

    public function down(): void
    {
        Schema::table('users', fn(Blueprint $t) => $t->dropColumn(['plan', 'plan_expires_at']));
        Schema::dropIfExists('team_settlements');
        Schema::dropIfExists('team_notices');
        Schema::table('team_members', fn(Blueprint $t) => $t->dropColumn('is_sub_leader'));
    }
};
