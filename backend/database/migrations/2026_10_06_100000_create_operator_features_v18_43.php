<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ★ v18.43 — 운영자 기능: 고객 문의, 문자 템플릿·발송 기록, 일일 접속자(통계용)
 */
return new class extends Migration
{
    public function up(): void
    {
        // 고객 문의 — 앱에서 작성, 운영자 웹에서 답변
        Schema::create('inquiries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('category', 20)->default('etc'); // usage | bug | account | payment | etc
            $table->string('title', 100);
            $table->text('content');
            $table->string('status', 20)->default('pending'); // pending | answered
            $table->text('answer')->nullable();
            $table->foreignId('answered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('answered_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['status', 'created_at']);
        });

        // 문자 템플릿 — 운영자가 만들어 두고 공지·이벤트 때 골라서 발송
        Schema::create('sms_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60);
            $table->string('kind', 10)->default('ad'); // ad(광고성: 수신동의자만) | info(안내성: 전체)
            $table->text('body');
            $table->foreignId('notice_id')->nullable()->constrained('notices')->nullOnDelete(); // 연결된 공지·이벤트(선택)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 문자 발송 기록 — 한 번 보낼 때마다 1행
        Schema::create('sms_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->nullable()->constrained('sms_templates')->nullOnDelete();
            $table->string('kind', 10);
            $table->text('body'); // 실제 보낸 문구((광고)·수신거부 문구 포함)
            $table->unsignedInteger('recipient_count')->default(0);
            $table->unsignedInteger('success_count')->default(0);
            $table->unsignedInteger('fail_count')->default(0);
            $table->string('status', 20)->default('sending'); // sending | done | failed
            $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 일일 접속자 — 사용자가 그날 처음 API를 부를 때 1행 (통계용)
        Schema::create('daily_active_users', function (Blueprint $table) {
            $table->date('date');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->primary(['date', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_active_users');
        Schema::dropIfExists('sms_campaigns');
        Schema::dropIfExists('sms_templates');
        Schema::dropIfExists('inquiries');
    }
};
