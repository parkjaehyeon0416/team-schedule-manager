<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 디자인 캔버스 MY_RATES 기준 — 공정과 무관한 "기본 일급 프로필"(1공수/0.5공수/연장/야간휴일할증).
 * 기존 wage_settings는 공정별 단가(TRADE_RATES)라 별개 테이블로 분리함.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wage_profiles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->unique();
            $table->unsignedInteger('full_day_wage')->default(250000);   // 1공수 단가
            $table->unsignedInteger('half_day_wage')->default(125000);   // 0.5공수 단가
            $table->unsignedInteger('overtime_hourly_wage')->default(35000); // 연장(시간당)
            $table->unsignedTinyInteger('night_holiday_premium_percent')->default(20); // 야간·휴일 할증(%)
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wage_profiles');
    }
};
