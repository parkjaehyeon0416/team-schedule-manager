<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * schedules 테이블 확장 — 공수·급여·경비 기록 지원
     *
     * 기획서 v2.2의 3.7절 '공수·급여·세금 자동 계산 시스템' 반영
     *
     * ★ 설계 노트 (2026-04-23 수정):
     *  기존 work_type 컬럼(ENUM: 도배/타일/필름)은 그대로 유지하면서
     *  새로 work_type_id 컬럼을 추가하는 점진적 마이그레이션 전략
     *  (기획서 v2.2 7.4.6절의 Expand-Migrate-Contract 패턴)
     *
     *  Phase 1 (이번): work_type_id 컬럼 추가, 기존 work_type 유지
     *  Phase 2 (추후): 기존 work_type 값 → work_types.id로 매핑 (데이터 마이그레이션)
     *  Phase 3 (완료 후): work_type 컬럼 제거
     *
     * ★ 2026-04-23 수정:
     *  ->after() 제거 — MySQL 8.0에서 ALTER TABLE AFTER 구문 호환성 이슈 회피
     *  (컬럼은 테이블 맨 뒤에 추가되지만 기능엔 영향 없음)
     *
     * 추가 컬럼 5개:
     *  ① work_type_id    — work_types 테이블 참조 FK (점진적 대체용)
     *  ② work_units      — 공수 (0.5=반공수, 1.0=1공수, 2.0=2공수)
     *  ③ daily_wage      — 일 단가(원) — 해당 작업의 수입
     *  ④ expenses        — 경비(원) — 식비, 교통비, 자재비 등
     *  ⑤ expenses_memo   — 경비 내역 메모
     */
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {

            // ① work_type_id — 공정 참조 (work_types 테이블의 id)
            $table->unsignedBigInteger('work_type_id')
                  ->nullable();

            // ② work_units — 공수(작업 강도 배수)
            $table->decimal('work_units', 4, 1)
                  ->default(1.0);

            // ③ daily_wage — 일 단가(원)
            $table->decimal('daily_wage', 10, 2)
                  ->nullable();

            // ④ expenses — 경비(원)
            $table->decimal('expenses', 10, 2)
                  ->default(0);

            // ⑤ expenses_memo — 경비 내역 메모
            $table->string('expenses_memo', 255)
                  ->nullable();

            // ⑥ 인덱스 — work_type_id 집계·필터링용
            $table->index('work_type_id');
        });
    }

    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            // 인덱스 먼저 제거
            $table->dropIndex(['work_type_id']);

            // 컬럼 일괄 삭제
            $table->dropColumn([
                'work_type_id',
                'work_units',
                'daily_wage',
                'expenses',
                'expenses_memo',
            ]);
        });
    }
};
