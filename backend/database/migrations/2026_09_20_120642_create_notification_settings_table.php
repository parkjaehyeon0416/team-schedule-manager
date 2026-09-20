<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * notification_settings 테이블 — 사용자별 알림 수신 설정
     *
     * 역할: 사용자가 어떤 종류의 알림을 받을지 서버에 저장해두는 설정값.
     *      실제 푸시 발송(FCM 등) 인프라는 아직 없고, 이 테이블은
     *      추후 발송 로직이 붙었을 때 "이 사용자가 이 알림을 켰는지"를
     *      판단하는 기준으로 쓰인다.
     */
    public function up(): void
    {
        Schema::create('notification_settings', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('user_id');

            // 일정 알림 — 예정된 일정 리마인드
            $table->boolean('schedule_reminder')->default(true);
            // 팀 활동 알림 — 팀원 가입/일정 변경 등
            $table->boolean('team_activity')->default(true);
            // 견적 알림 — 견적 승인/반려 등 상태 변경
            $table->boolean('quote_update')->default(true);
            // 보고서 알림 — 공유한 보고서/명함 열람
            $table->boolean('report_view')->default(true);

            $table->timestamps();

            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_settings');
    }
};
