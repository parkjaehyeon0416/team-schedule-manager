<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            // ★ DESIGN-CANVAS(TAX_MONTH_DETAIL/INCOME_DETAIL) — 일용근로/프리랜서(3.3%) 비율,
            //   지급완료 배지를 디자인대로 보여주기 위해 추가.
            $table->string('employment_type', 20)->default('daily')->after('reminder_time'); // daily | freelance
            $table->string('payment_status', 20)->default('pending')->after('employment_type'); // pending | paid
        });
    }

    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropColumn(['employment_type', 'payment_status']);
        });
    }
};
