<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * ★ v18.43 디자인(TEAM_INVITE / INQUIRY_* / ADMIN_INQUIRY_*) 반영
 *  - 팀 초대 코드 7일 만료
 *  - 문의: 앱 버전·기기·알림 허용 여부(운영자 참고), 답변 알림 받기, 답변 확인 시각, "도움이 됐어요"
 *  - 문의 사진 첨부(최대 3장)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->timestamp('invite_expires_at')->nullable()->after('invite_code');
        });
        // 기존 팀은 지금부터 7일
        DB::table('teams')->update(['invite_expires_at' => now()->addDays(7)]);

        Schema::table('inquiries', function (Blueprint $table) {
            $table->string('app_version', 20)->nullable()->after('content');
            $table->string('device', 60)->nullable()->after('app_version');
            $table->boolean('push_enabled')->nullable()->after('device');
            $table->boolean('notify')->default(true)->after('push_enabled');
            $table->timestamp('answer_seen_at')->nullable()->after('answered_at');
            $table->boolean('helpful')->nullable()->after('answer_seen_at');
        });

        // 문자 발송 대상(전체/최근 30일 가입/30일 이상 미접속)
        Schema::table('sms_campaigns', function (Blueprint $table) {
            $table->string('target', 20)->nullable()->after('kind');
        });

        Schema::create('inquiry_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inquiry_id')->constrained('inquiries')->cascadeOnDelete();
            $table->string('path');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inquiry_files');
        Schema::table('sms_campaigns', function (Blueprint $table) {
            $table->dropColumn('target');
        });
        Schema::table('inquiries', function (Blueprint $table) {
            $table->dropColumn(['app_version', 'device', 'push_enabled', 'notify', 'answer_seen_at', 'helpful']);
        });
        Schema::table('teams', function (Blueprint $table) {
            $table->dropColumn('invite_expires_at');
        });
    }
};
