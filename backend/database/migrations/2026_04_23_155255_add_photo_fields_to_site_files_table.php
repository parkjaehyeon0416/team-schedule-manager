<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * site_files 테이블 확장 — 시공 사진 구조화 지원
     *
     * 기획서 v2.2의 3.1절 '현장 사진 구조화' 반영
     *
     * 배경:
     *  기존 site_files는 file_type ('photo', 'document')로만 구분되어 있음
     *  도배·타일·필름 같은 시공업계는 '시공 전/중/후' 사진을 체계적으로 관리해야
     *  자동 보고서(site_reports) 생성 시 시간순으로 깔끔하게 배치 가능
     *
     * 추가 컬럼 3개:
     *  ① photo_category  — 시공 단계 구분 (before / during / after / other)
     *  ② description     — 사진 캡션 (예: '거실 북쪽 벽')
     *  ③ sort_order      — 보고서 내 정렬 순서
     */
    public function up(): void
    {
        Schema::table('site_files', function (Blueprint $table) {

            // ① photo_category — 시공 단계 4분류
            // before: 시공 전 (원래 상태, 파손 부위 등)
            // during: 시공 중 (진행 과정, 자재 투입)
            // after:  시공 후 (완성 사진)
            // other:  기타 (계약서, 영수증, 참고 이미지 등)
            //
            // 기본값 'other' — file_type='document'이거나 기존 데이터는 자동으로 other
            $table->enum('photo_category', ['before', 'during', 'after', 'other'])
                  ->default('other');


            // ② description — 사진 캡션
            // 예: "거실 북쪽 벽 도배 전", "안방 천장 필름 시공 후"
            // nullable: 캡션 없이 업로드해도 OK
            $table->string('description', 255)
                  ->nullable();


            // ③ sort_order — 보고서 내 표시 순서
            // 같은 카테고리 내에서 사용자가 드래그로 순서 변경 가능
            // 기본값 0 — 업로드 순서대로 정렬 (0, 1, 2... 직접 넣거나 나중에 재정렬)
            $table->integer('sort_order')
                  ->default(0);


            // ④ 인덱스
            // 현장별 + 카테고리별 사진 묶음 조회 시 빠르게
            // 예: WHERE site_id = 5 AND photo_category = 'before' ORDER BY sort_order
            $table->index(['site_id', 'photo_category', 'sort_order'], 'site_category_sort_idx');
        });
    }

    public function down(): void
    {
        Schema::table('site_files', function (Blueprint $table) {
            // 인덱스 먼저 제거
            $table->dropIndex('site_category_sort_idx');

            // 컬럼 일괄 삭제
            $table->dropColumn([
                'photo_category',
                'description',
                'sort_order',
            ]);
        });
    }
};
