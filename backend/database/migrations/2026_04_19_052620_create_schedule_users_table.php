<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('schedule_users', function (Blueprint $table) {
            $table->id();
            // schedule_id: schedules 테이블 참조
            $table->unsignedBigInteger('schedule_id');
            // user_id: users 테이블 참조
            $table->unsignedBigInteger('user_id');
            $table->timestamps();
            $table->softDeletes();
            // 같은 일정에 같은 팀원 중복 배정 방지
            $table->index(['schedule_id', 'user_id']); // 인덱스는 유지 (조회 성능)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_users');
    }
};
