<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * 커스텀 공정은 지금까지 team_id만 있어서 팀 소속일 때만 추가 가능했음.
     * 프리랜서(팀 없는 개인)도 자기만의 공정을 추가할 수 있어야 해서
     * Schedule/Site와 동일한 owner_id 패턴을 적용함.
     */
    public function up(): void
    {
        Schema::table('work_types', function (Blueprint $table) {
            $table->unsignedBigInteger('owner_id')->nullable()->after('team_id');
            $table->index('owner_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_types', function (Blueprint $table) {
            $table->dropIndex(['owner_id']);
            $table->dropColumn('owner_id');
        });
    }
};
