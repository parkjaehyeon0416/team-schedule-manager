<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * 프리랜서(team_id 없는 사용자)의 일정/현장을 팀 데이터와 격리하기 위한 owner_id 추가.
     * schedules.team_id는 원래 NOT NULL이라 프리랜서가 일정을 만들면 DB 에러가 났음 — nullable로 변경.
     */
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->unsignedBigInteger('team_id')->nullable()->change();
            $table->unsignedBigInteger('owner_id')->nullable()->after('team_id');
            $table->index('owner_id');
        });

        Schema::table('sites', function (Blueprint $table) {
            $table->unsignedBigInteger('owner_id')->nullable()->after('team_id');
            $table->index('owner_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropIndex(['owner_id']);
            $table->dropColumn('owner_id');
            $table->unsignedBigInteger('team_id')->nullable(false)->change();
        });

        Schema::table('sites', function (Blueprint $table) {
            $table->dropIndex(['owner_id']);
            $table->dropColumn('owner_id');
        });
    }
};
