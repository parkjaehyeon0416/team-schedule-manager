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
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            // invite_code: 팀 초대 시 사용하는 고유 코드
            $table->string('invite_code')->unique();
            // created_by: 팀을 만든 사용자 ID (FK 제약 없음, 참조만)
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            // SoftDelete: 삭제해도 복구 가능 (기획서 12.2절 확정)
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teams');
    }
};
