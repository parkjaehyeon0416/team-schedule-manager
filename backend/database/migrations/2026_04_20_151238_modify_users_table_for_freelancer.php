<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {

            // ① team_id — NULL 허용으로 변경
            // 프리랜서는 팀이 없으므로 NULL 저장 가능하게 수정
            $table->unsignedBigInteger('team_id')
                  ->nullable()
                  ->change();

            // ② user_type — 사용자 유형 구분
            // 'team' = 팀 소속 / 'freelancer' = 단독 프리랜서
            $table->enum('user_type', ['team', 'freelancer'])
                  ->default('team')
                  ->after('team_id');

            // ③ individual_plan — 개인 요금제
            // 팀 플랜과 별개로 개인별로 적용되는 요금제
            $table->enum('individual_plan', ['free', 'standard'])
                  ->default('free')
                  ->after('user_type');

            // ④ individual_plan_expires_at — 개인 플랜 만료일
            $table->timestamp('individual_plan_expires_at')
                  ->nullable()
                  ->after('individual_plan');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('team_id')
                  ->nullable(false)
                  ->change();
            $table->dropColumn([
                'user_type',
                'individual_plan',
                'individual_plan_expires_at',
            ]);
        });
    }
};
