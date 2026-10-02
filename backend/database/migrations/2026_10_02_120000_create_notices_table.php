<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ★ DESIGN-CANVAS(NOTICE_LIST/NOTICE_DETAIL/EVENT_DETAIL) — 운영팀이 올리는 공지사항·이벤트
        Schema::create('notices', function (Blueprint $table) {
            $table->id();
            $table->string('type', 10)->default('notice'); // notice | event
            $table->string('title', 150);
            $table->string('summary', 255)->nullable();    // 이벤트 한 줄 소개
            $table->text('body')->nullable();               // 빈 줄로 문단 구분, "- "로 시작하는 줄은 목록
            $table->json('info')->nullable();               // [{label, value}] 정보표(점검 일시/대상 등)
            $table->json('steps')->nullable();              // 이벤트 참여 방법 [{title, desc}]
            $table->json('cautions')->nullable();           // 이벤트 유의사항 [string]
            $table->string('banner_path', 255)->nullable();
            $table->string('cta_label', 50)->nullable();    // 이벤트 하단 버튼 문구
            $table->string('cta_route', 50)->nullable();    // 앱 화면 이름(예: SiteList)
            $table->boolean('is_pinned')->default(false);   // 공지 "중요"
            $table->string('author', 50)->default('WorkMate 운영팀');
            $table->date('starts_at')->nullable();          // 이벤트 기간
            $table->date('ends_at')->nullable();
            $table->timestamp('published_at')->nullable();  // null이면 비공개(초안)
            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notices');
    }
};
