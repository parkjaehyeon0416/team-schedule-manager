<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            // ★ v18.34 — 일회성 현장은 현장 등록 없이 일정에 주소를 바로 적을 수 있게 함.
            //   address는 현장 미선택 시에만 사용, address_detail(동·호수 등)은 현장 선택 여부와 무관하게 사용.
            $table->string('address', 255)->nullable()->after('site_id');
            $table->string('address_detail', 100)->nullable()->after('address');
        });
    }

    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropColumn(['address', 'address_detail']);
        });
    }
};
