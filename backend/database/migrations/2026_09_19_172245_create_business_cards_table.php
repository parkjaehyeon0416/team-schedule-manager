<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * business_cards 테이블 — 모바일 명함 (★ v14 신규)
     *
     * 기획서 BusinessCardFeature_v1.0 5-1절 반영.
     * 외래키 제약은 이 프로젝트 정책상 사용하지 않음(sites/teams와 동일) —
     * user_id는 unsignedBigInteger로만 두고 무결성은 애플리케이션 레이어에서 보장.
     */
    public function up(): void
    {
        Schema::create('business_cards', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('user_id')->unique(); // 사용자당 1개

            $table->string('share_code', 20)->unique(); // URL용 짧은 코드

            $table->string('display_name', 100)->nullable();
            // ★ 기획서는 "연락처는 회원가입 정보에서 자동 채움"이라 되어 있으나
            //   users 테이블에 phone 컬럼이 없어 명함에서 직접 입력받도록 변경(설계서와의 차이, DevManual v14.0 참고)
            $table->string('contact_phone', 30)->nullable();
            $table->string('job_title', 100)->nullable();
            $table->integer('years_experience')->nullable();
            $table->string('service_area', 100)->nullable();
            $table->string('specialty', 255)->nullable();
            $table->string('tagline', 255)->nullable();
            $table->string('profile_photo_path', 500)->nullable();

            // 명함에 표시할 시공 사진(SiteFile) id 배열 — MVP는 최근 사진 자동 선택,
            // 수동 재선택 UI는 이번 범위 밖(BusinessCardController 참고)
            $table->json('showcase_photo_ids')->nullable();

            $table->boolean('is_public')->default(true);

            $table->integer('view_count')->default(0);
            $table->integer('monthly_view_count')->default(0);
            $table->timestamp('last_viewed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('share_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_cards');
    }
};
