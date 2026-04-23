<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * work_types 테이블 — 공정 마스터 데이터
     *
     * 역할: 사용자가 일정을 등록할 때 선택할 수 있는 '공정 종류'를 관리
     * 예시: 도배, 타일, 필름, 페인트, 마루, 샷시, 철거...
     *
     * 기본 공정은 시스템 전체 공통(team_id=NULL)이고,
     * 각 팀/사용자가 자기만의 커스텀 공정을 추가할 수도 있음(team_id 지정)
     */
    public function up(): void
    {
        Schema::create('work_types', function (Blueprint $table) {
            $table->id();  // PK (bigint, auto_increment)

            // ① 공정 기본 정보
            $table->string('name', 50);                    // 공정명 (예: "도배")
            $table->string('code', 30)->nullable();        // 코드 (예: "wallpaper", 영어 키값)
            $table->string('color', 7)->default('#1890ff'); // 캘린더 표시용 색상 HEX (예: "#ff5722")
            $table->string('icon', 30)->nullable();         // 아이콘명 (프론트엔드에서 사용)

            // ② 소유자 — 커스텀 공정 지원
            // NULL이면 시스템 기본 공정 (모두가 사용 가능)
            // 값이 있으면 해당 team만 사용 가능한 커스텀 공정
            $table->unsignedBigInteger('team_id')->nullable();

            // ③ 정렬 & 활성화
            $table->integer('sort_order')->default(0);    // 캘린더/목록에서 표시 순서
            $table->boolean('is_active')->default(true);  // 사용 여부 (soft disable)

            // ④ 타임스탬프 + 소프트딜리트
            $table->timestamps();      // created_at, updated_at
            $table->softDeletes();     // deleted_at (복구 가능하도록)

            // ⑤ 인덱스
            $table->index('team_id');                      // 팀별 공정 조회용
            $table->index(['is_active', 'sort_order']);    // 활성 공정을 순서대로 조회용
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_types');
    }
};
