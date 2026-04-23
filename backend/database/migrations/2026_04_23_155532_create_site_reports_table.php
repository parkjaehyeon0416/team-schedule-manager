<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * site_reports 테이블 — 현장별 자동 보고서
     *
     * 기획서 v2.2의 3.9절 '현장별 자동 보고서 생성·전달 + 열람 추적' 반영
     *
     * 핵심 기능:
     *  1) 공유 토큰(share_token)을 통한 비로그인 접근
     *     → 고객은 URL 하나만 받으면 별도 가입/로그인 없이 보고서 열람 가능
     *  2) 열람 추적 (view_count, last_viewed_at)
     *     → 고객이 언제/몇 번 봤는지 확인 가능 (사용자 경험 개선)
     *  3) PDF 저장 (pdf_path)
     *     → 다운로드/인쇄용 PDF 파일 경로 보관
     */
    public function up(): void
    {
        Schema::create('site_reports', function (Blueprint $table) {
            $table->id();

            // ═══════════════════════════════════════
            // ① 참조 정보
            // ═══════════════════════════════════════

            // 보고서 대상 일정 (어느 일정에 대한 보고서인지)
            $table->unsignedBigInteger('schedule_id');

            // 작성자 (팀장 또는 프리랜서 본인)
            $table->unsignedBigInteger('user_id');

            // ═══════════════════════════════════════
            // ② 보고서 내용
            // ═══════════════════════════════════════

            // 보고서 제목 (예: "2026년 4월 강남구 역삼동 OO아파트 도배 작업 보고")
            $table->string('title', 200);

            // 수신 고객명 (예: "김○○ 고객님")
            $table->string('client_name', 100)->nullable();

            // 수신 고객 연락처 (전화번호, SMS/카톡 공유용)
            $table->string('client_contact', 100)->nullable();

            // 인사말 (사용자가 편집 가능한 상단 텍스트)
            // TEXT 타입: 길이 제한 없음 — 긴 감사 인사, 업체 소개 등
            $table->text('greeting_message')->nullable();

            // 템플릿 코드 (basic, modern, elegant 등 — v9 이후 확장)
            // 기본값 'basic' — 초기엔 템플릿 1개만 제공
            $table->string('template_id', 20)->default('basic');

            // ═══════════════════════════════════════
            // ③ 공유 & 열람 추적
            // ═══════════════════════════════════════

            // 공유 URL용 랜덤 토큰 (비로그인 접근 경로)
            // 예: https://teamschedule.app/report/AbC123xYz...
            // VARCHAR(64): 64자 랜덤 문자열 생성 (토큰 충돌 방지 + 추측 불가)
            // UNIQUE: 토큰은 절대 중복되면 안 됨 (다른 고객의 보고서 노출 방지!)
            $table->string('share_token', 64)->unique();

            // 고객 열람 횟수 (처음 0, 열람할 때마다 +1)
            $table->integer('view_count')->default(0);

            // 마지막 열람 시각 (nullable: 아직 안 열람한 경우)
            $table->timestamp('last_viewed_at')->nullable();

            // ═══════════════════════════════════════
            // ④ PDF 파일
            // ═══════════════════════════════════════

            // 생성된 PDF 저장 경로 (서버 로컬 또는 S3 등)
            // 예: 'reports/2026/04/report_abc123.pdf'
            // nullable: PDF 생성 전 단계 or 생성 실패 시 NULL
            $table->string('pdf_path', 255)->nullable();

            // ═══════════════════════════════════════
            // ⑤ 타임스탬프 + 소프트딜리트
            // ═══════════════════════════════════════
            $table->timestamps();
            $table->softDeletes();

            // ═══════════════════════════════════════
            // ⑥ 인덱스
            // ═══════════════════════════════════════

            // schedule_id 조회 — "이 일정에 대한 보고서들" 조회용
            $table->index('schedule_id');

            // user_id 조회 — "내가 만든 보고서 목록" 조회용
            $table->index('user_id');

            // 💡 share_token은 위에서 ->unique()로 이미 인덱스 생성됨 (추가 index 불필요)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_reports');
    }
};
