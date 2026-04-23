<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * monthly_summaries 테이블 — 월별 수입·지출 집계 캐시
     *
     * 기획서 v2.2의 3.7절 '공수·급여·세금 자동 계산 시스템' 반영
     *
     * 설계 철학:
     *  schedules 테이블에서 매번 SUM/COUNT로 계산하면 느림
     *  → 월별로 미리 집계한 결과를 이 테이블에 저장하고 빠르게 조회
     *  → 일정 변경 시에만 해당 월 재계산 (cache invalidation)
     *
     * 갱신 전략:
     *  - 사용자가 schedules를 추가/수정/삭제하면 Observer로 감지
     *  - 해당 월의 monthly_summaries 레코드를 재계산하여 UPSERT
     *  - (이 로직은 v9에서 Model Observer로 구현 예정)
     */
    public function up(): void
    {
        Schema::create('monthly_summaries', function (Blueprint $table) {
            $table->id();

            // ═══════════════════════════════════════
            // ① 키 정보 (누구의 · 어느 달인지)
            // ═══════════════════════════════════════

            // 사용자 참조
            $table->unsignedBigInteger('user_id');

            // 집계 월 — 'YYYY-MM' 형식
            // VARCHAR(7): "2026-04" 같은 7자 고정 길이
            // 💡 왜 DATE 타입 안 썼나? DATE는 일(day)까지 필수라 매달 '01'로 통일해야 함
            //    '2026-04' 문자열이 '집계 월'의 의미를 더 명확히 표현
            $table->string('year_month', 7);

            // ═══════════════════════════════════════
            // ② 수입 관련 집계
            // ═══════════════════════════════════════

            // 총 공수 (해당 월 전체 공수 합계)
            // DECIMAL(6,1): 소수 1자리, 최대 99999.9 (월 최대치 여유 충분)
            $table->decimal('total_work_units', 6, 1)->default(0);

            // 총 수입 (해당 월 daily_wage × work_units 의 합)
            // DECIMAL(12,2): 정수부 10자리 → 최대 99억대
            // 💡 왜 schedules.daily_wage(10,2)보다 큰가? 월 집계는 누적이라 더 큰 범위 필요
            $table->decimal('total_income', 12, 2)->default(0);

            // 총 경비 (해당 월 expenses 합계)
            $table->decimal('total_expenses', 12, 2)->default(0);

            // 예상 소득세 (원천징수 3.3% 또는 프리랜서 세율 기준)
            // DECIMAL(10,2): 최대 99,999,999.99
            $table->decimal('estimated_tax', 10, 2)->default(0);

            // 실수령액 (수입 - 경비 - 예상세금)
            // 💡 이건 계산 가능한 값이지만 자주 조회하므로 저장해두면 편리 (비정규화)
            $table->decimal('net_income', 12, 2)->default(0);

            // ═══════════════════════════════════════
            // ③ 활동 집계
            // ═══════════════════════════════════════

            // 근무 일수 (해당 월 실제 근무한 날의 수)
            $table->integer('work_days')->default(0);

            // 현장 수 (해당 월 작업한 서로 다른 현장의 수)
            $table->integer('site_count')->default(0);

            // ═══════════════════════════════════════
            // ④ 메타
            // ═══════════════════════════════════════

            // 마지막 집계 시각 (cache 신선도 관리용)
            // NULL이면 "한 번도 집계 안 됨" 의미
            $table->timestamp('last_calculated_at')->nullable();

            // 타임스탬프 (created_at, updated_at)
            $table->timestamps();

            // 💡 softDeletes 없음 — 캐시 테이블이라 삭제되면 그냥 재생성하면 되므로
            //    (기능 데이터가 아닌 파생 데이터)

            // ═══════════════════════════════════════
            // ⑤ 인덱스 & 제약
            // ═══════════════════════════════════════

            // 유니크 제약: 한 사용자는 한 달에 하나의 집계 레코드만 가짐
            // 예: user_id=5가 2026-04 집계를 여러 개 가질 수 없음 (UPSERT 가능)
            $table->unique(['user_id', 'year_month'], 'user_month_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monthly_summaries');
    }
};
