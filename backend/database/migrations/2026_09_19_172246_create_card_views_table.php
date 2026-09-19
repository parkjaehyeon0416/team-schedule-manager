<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * card_views 테이블 — 명함 조회 로그 (★ v14 신규)
     *
     * 기획서 BusinessCardFeature_v1.0 5-2절 반영.
     * 조회수 통계용. 개인정보 보호를 위해 IP는 SHA-256 해시로만 저장.
     */
    public function up(): void
    {
        Schema::create('card_views', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('card_id');

            $table->string('viewer_ip_hash', 64)->nullable(); // 중복 방지용 (SHA-256 해시)
            $table->string('user_agent', 255)->nullable();
            $table->string('referrer', 255)->nullable();

            $table->timestamp('viewed_at')->useCurrent();

            $table->index(['card_id', 'viewed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('card_views');
    }
};
