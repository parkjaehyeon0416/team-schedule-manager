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
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            // user_id: users 테이블 참조 (FK 제약 없음)
            $table->unsignedBigInteger('user_id');
            // date: 근태 날짜
            $table->date('date');
            // check_in / check_out: 출퇴근 시간
            $table->time('check_in')->nullable();
            $table->time('check_out')->nullable();
            $table->text('memo')->nullable();
            $table->timestamps();
            // 인덱스: user_id+date 조합으로 자주 조회 (기획서 12.2절)
            $table->index(['user_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
