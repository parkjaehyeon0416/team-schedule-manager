<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 디자인 캔버스(SITE_DETAIL/CREATE/EDIT) 기준 현장 정보 확장.
 * 기간(start_date/end_date), 고객(customer), 진행상태(status) 추가.
 * team_id/owner_id는 이미 존재함 — 디자인의 "팀 선택"은 store()에서 직접 team_id를 받도록 컨트롤러만 변경.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sites', function (Blueprint $table) {
            $table->date('start_date')->nullable()->after('memo');
            $table->date('end_date')->nullable()->after('start_date');
            $table->string('customer', 100)->nullable()->after('end_date');
            $table->string('status', 20)->default('scheduled')->after('customer'); // scheduled | in_progress | done
        });
    }

    public function down(): void
    {
        Schema::table('sites', function (Blueprint $table) {
            $table->dropColumn(['start_date', 'end_date', 'customer', 'status']);
        });
    }
};
