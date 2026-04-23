<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * user_wage_settings 테이블 — 사용자별 공정 기본 단가
     *
     * 역할: 사용자가 "나의 기본 단가"를 공정별로 등록해두면,
     *      일정 등록 시 자동으로 daily_wage가 채워짐
     *
     * 예시 데이터:
     *  user_id=5, work_type_id=1(도배), default_wage=180000
     *  user_id=5, work_type_id=2(타일), default_wage=220000
     *  user_id=5, work_type_id=3(필름), default_wage=150000
     *
     * 기획서 v2.2의 3.7절 '공수·급여·세금 자동 계산 시스템'의 '단가 관리' 모듈 반영
     */
    public function up(): void
    {
        Schema::create('user_wage_settings', function (Blueprint $table) {
            $table->id();  // PK

            // ① 소유자 참조
            $table->unsignedBigInteger('user_id');        // 어느 사용자의 설정인지
            $table->unsignedBigInteger('work_type_id');   // 어느 공정에 대한 단가인지

            // ② 기본 단가 — 일당 기준
            // DECIMAL(10, 2): 최대 99,999,999.99 (schedules.daily_wage와 동일)
            $table->decimal('default_wage', 10, 2);

            // ③ 기본 공수 (선택)
            // 대부분 1.0 공수겠지만, 특정 공정은 "항상 반공수"로 잡히는 경우도 있음
            $table->decimal('default_work_units', 4, 1)->default(1.0);

            // ④ 메모 — 단가 책정 근거 메모 (선택)
            // 예: "2026년 4월 기준 단가", "주거래처 단가"
            $table->string('memo', 255)->nullable();

            // ⑤ 타임스탬프 + 소프트딜리트
            $table->timestamps();
            $table->softDeletes();

            // ⑥ 인덱스 & 제약
            // 한 사용자는 같은 공정에 대해 하나의 설정만 가질 수 있음 (유니크 제약)
            // 동일한 user_id + work_type_id 조합은 중복 저장 불가
            $table->unique(['user_id', 'work_type_id'], 'user_work_type_unique');

            // 사용자별 전체 단가 조회 시 빠르게 (WHERE user_id = ?)
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_wage_settings');
    }
};
