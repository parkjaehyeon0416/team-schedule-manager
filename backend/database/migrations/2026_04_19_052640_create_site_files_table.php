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
        Schema::create('site_files', function (Blueprint $table) {
            $table->id();
            // site_id: sites 테이블 참조 (FK 제약 없음)
            $table->unsignedBigInteger('site_id');
            // 파일 메타데이터 (기획서 12.2절 미결정 → v3에서 확정)
            $table->string('original_name');    // 업로드 원본 파일명
            $table->string('stored_name');      // 서버 저장명 (중복 방지용 UUID)
            $table->string('mime_type');        // 파일 MIME 타입 (image/jpeg, application/pdf 등)
            $table->unsignedBigInteger('file_size'); // 파일 크기 (bytes)
            $table->string('file_path');        // 서버 저장 경로
            $table->string('file_type')->nullable(); // 도면/사진/기타 구분
            $table->unsignedBigInteger('uploaded_by')->nullable(); // 업로드한 사용자
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('site_files');
    }
};
