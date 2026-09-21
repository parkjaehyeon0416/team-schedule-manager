<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * 팀 탈퇴/해체 시 "누가 만든 일정/현장인지"를 알아야 개인 데이터로 정확히
     * 전환할 수 있어서 created_by를 추가함. 기존 데이터는 알 수 없으므로 NULL로 둠
     * (탈퇴/해체 로직에서 NULL인 경우는 처리 주체에게 귀속시키는 폴백을 둠).
     */
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable()->after('owner_id');
        });

        Schema::table('sites', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable()->after('owner_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropColumn('created_by');
        });

        Schema::table('sites', function (Blueprint $table) {
            $table->dropColumn('created_by');
        });
    }
};
