<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ★ v18.38 — 휴대폰 푸시(FCM) 수신용 기기 토큰. 한 사용자가 여러 기기를 쓸 수 있음.
        Schema::create('device_tokens', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('token', 255)->unique();
            $table->string('platform', 20)->default('android');
            $table->timestamps();
        });

        // ★ v18.38 — 일정 알림(하루 전 등)을 이미 보냈는지. 날짜/시간/알림설정이 바뀌면 다시 null로 초기화.
        Schema::table('schedules', function (Blueprint $table) {
            $table->timestamp('reminder_sent_at')->nullable()->after('reminder_time');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_tokens');
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropColumn('reminder_sent_at');
        });
    }
};
