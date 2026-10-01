<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 디자인 캔버스(NOTIFICATION_SETTINGS) 기준 추가 — 세무자료 알림/마케팅 수신/야간 알림 제한/
 * 일정 알림 시간. "전체 알림"은 저장되는 필드가 아니라 디자인 원본도 나머지 4개를 한번에
 * 켜고 끄는 클라이언트 동작이라 서버 컬럼으로 두지 않음.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notification_settings', function (Blueprint $table) {
            $table->boolean('tax_reminder')->default(true)->after('report_view');
            $table->boolean('marketing_opt_in')->default(false)->after('tax_reminder');
            $table->boolean('night_quiet_hours')->default(true)->after('marketing_opt_in');
            // 일정 알림 시간 — 'day_before_20' | 'day_before_09' | 'hour_before_1' 등
            $table->string('schedule_reminder_time', 30)->default('day_before_20')->after('night_quiet_hours');
        });
    }

    public function down(): void
    {
        Schema::table('notification_settings', function (Blueprint $table) {
            $table->dropColumn(['tax_reminder', 'marketing_opt_in', 'night_quiet_hours', 'schedule_reminder_time']);
        });
    }
};
