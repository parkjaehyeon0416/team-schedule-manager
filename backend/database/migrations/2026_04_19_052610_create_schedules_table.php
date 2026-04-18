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
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            // site_id: sites 테이블 참조 (FK 제약 없음)
            $table->unsignedBigInteger('site_id');
            // team_id: teams 테이블 참조 (FK 제약 없음)
            $table->unsignedBigInteger('team_id');
            // date: 작업 날짜 (기획서 12.3절: KST 문자열 저장)
            $table->date('date');
            // status: 예정 / 진행중 / 완료
            $table->enum('status', ['pending', 'in_progress', 'done'])->default('pending');
            $table->text('memo')->nullable();
            $table->timestamps();
            $table->softDeletes();
            // 인덱스: schedules.date로 자주 조회 (기획서 12.2절 미결정 → 확정)
            $table->index('date');
            $table->index('team_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};
