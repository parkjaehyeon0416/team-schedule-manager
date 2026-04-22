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

            // site_id: sites 테이블 참조 (FK 제약 없음, 선택 연결)
            $table->unsignedBigInteger('site_id')->nullable();

            // team_id: teams 테이블 참조 (FK 제약 없음)
            $table->unsignedBigInteger('team_id');

            // date: 작업 날짜 (기획서 12.3절: KST 문자열 저장)
            $table->date('date');

            // ★ 추가 — work_type: 공종 (도배 / 타일 / 필름)
            $table->enum('work_type', ['도배', '타일', '필름'])->nullable();

            // ★ 추가 — district: 지역 (예: 강남구, 서초구)
            $table->string('district', 100)->nullable();

            // ★ 추가 — area_m2: 작업 면적 (제곱미터)
            $table->decimal('area_m2', 8, 2)->nullable();

            // status: 예정 / 진행중 / 완료
            $table->enum('status', ['pending', 'in_progress', 'done'])->default('pending');

            // memo: 특이사항
            $table->text('memo')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // 인덱스: schedules.date로 자주 조회 (기획서 12.2절)
            $table->index('date');
            $table->index('team_id');

            // ★ 추가 — work_type 별 조회를 자주 하므로 인덱스 추가
            $table->index('work_type');
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
