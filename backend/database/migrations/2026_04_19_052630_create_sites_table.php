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
        Schema::create('sites', function (Blueprint $table) {
            $table->id();
            // 주소 정보
            $table->string('address');       // 기본 주소
            $table->string('apt_name')->nullable();    // 아파트명
            $table->string('dong')->nullable();        // 동
            $table->string('ho')->nullable();          // 호수
            // area_m2: 평수 계산 결과 저장 (기획서 2.1절 현장 관리)
            $table->decimal('area_m2', 8, 2)->nullable();
            // team_id: 이 현장을 담당하는 팀
            $table->unsignedBigInteger('team_id')->nullable();
            $table->text('memo')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sites');
    }
};
