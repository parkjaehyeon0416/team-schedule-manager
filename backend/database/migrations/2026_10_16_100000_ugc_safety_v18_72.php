<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ★ v18.72 — 사용자 콘텐츠 안전장치 (Apple 심사 1.2: 신고·차단·숨김·정지·금지어)
 *
 *   user_blocks     : 차단 목록 — 한쪽만 적용(차단한 사람 화면에서만 팀 공지·팀 앨범·팀 활동·알림이 안 보임)
 *   content_reports : 신고 — 팀 공지 / 팀 앨범 사진 / 팀원. 신고 시점 내용을 snapshot에 남겨
 *                     작성자가 먼저 지워도 운영자가 확인할 수 있게 함
 *   team_notices·site_files.hidden_at/hidden_by/hidden_reason
 *                   : 운영자 숨김 기록. 숨김 자체는 소프트 삭제(deleted_at)로 처리 —
 *                     읽는 쿼리가 이미 모두 deleted_at을 거르므로. hidden_*는 '작성자가 지움'과 구분 + 숨김 풀기용
 *
 *   users.suspended_at·suspended_reason은 v18.41에 이미 있음 → 다시 추가하지 않음
 *   (작업 보고서 site_reports와 헷갈리지 않게 이름을 content_reports로)
 */
return new class extends Migration
{
    private const HIDDEN_TABLES = ['team_notices', 'site_files'];

    public function up(): void
    {
        if (!Schema::hasTable('user_blocks')) {
            Schema::create('user_blocks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('blocker_id')->constrained('users')->cascadeOnDelete(); // 차단한 사람
                $table->foreignId('blocked_id')->constrained('users')->cascadeOnDelete(); // 차단당한 사람
                $table->timestamps();
                $table->unique(['blocker_id', 'blocked_id']);
                $table->index('blocked_id'); // 알림 보낼 때 '나를 차단한 사람' 조회
            });
        }

        if (!Schema::hasTable('content_reports')) {
            Schema::create('content_reports', function (Blueprint $table) {
                $table->id();
                $table->foreignId('reporter_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('target_type', 20);   // team_notice | photo | user
                $table->unsignedBigInteger('target_id');
                $table->foreignId('target_user_id')->nullable()->constrained('users')->nullOnDelete(); // 신고당한 사람(작성자)
                $table->foreignId('team_id')->nullable()->constrained('teams')->nullOnDelete();
                $table->string('reason', 20);        // spam | abuse | sexual | privacy | etc
                $table->text('detail')->nullable();
                $table->json('snapshot')->nullable(); // 신고 시점 본문/사진 경로/이름 — 작성자가 지워도 증거 남음
                $table->string('status', 20)->default('pending'); // pending | resolved | dismissed
                $table->string('action', 20)->nullable();         // none | hidden | suspended
                $table->string('note', 500)->nullable();          // 운영자 처리 메모
                $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('handled_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
                $table->index(['status', 'created_at']);
                $table->index(['target_type', 'target_id']);
                $table->index('target_user_id');
            });
        }

        foreach (self::HIDDEN_TABLES as $tbl) {
            if (Schema::hasColumn($tbl, 'hidden_at')) {
                continue;
            }
            Schema::table($tbl, function (Blueprint $table) {
                $table->timestamp('hidden_at')->nullable();
                $table->foreignId('hidden_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('hidden_reason', 255)->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (self::HIDDEN_TABLES as $tbl) {
            if (!Schema::hasColumn($tbl, 'hidden_at')) {
                continue;
            }
            Schema::table($tbl, function (Blueprint $table) {
                $table->dropConstrainedForeignId('hidden_by');
                $table->dropColumn(['hidden_at', 'hidden_reason']);
            });
        }

        Schema::dropIfExists('content_reports');
        Schema::dropIfExists('user_blocks');
    }
};
