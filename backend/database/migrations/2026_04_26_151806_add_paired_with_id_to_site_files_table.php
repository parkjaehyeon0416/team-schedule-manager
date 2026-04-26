<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * site_files 테이블에 paired_with_id 컬럼 추가 (★ v11.1)
     *
     * 배경:
     *  v11에서 페어 매칭을 sort_order 인덱스로 단순 매칭했는데,
     *  사용자가 같은 위치 사진을 같은 순서로 올려야 한다는 암묵적 규칙이 있어
     *  실제 사용성에서 헷갈림이 발생.
     *
     * 해결:
     *  시공 후 사진이 어떤 시공 전 사진과 짝인지 명시적으로 저장.
     *  paired_with_id NULL → 짝 없음 (시공 전 사진 또는 짝을 지정 안 한 시공 후 사진)
     *  paired_with_id = N  → site_files.id = N 인 시공 전 사진과 짝
     *
     * 정책:
     *  - 시공 전 사진(before)에는 paired_with_id를 넣지 않음 (NULL 유지)
     *  - 시공 후 사진(after)에서만 paired_with_id 사용
     *  - 같은 시공 전 사진을 여러 시공 후 사진이 가리키지 않도록 어플리케이션 레벨에서 검증
     *  - FK 제약은 사용하지 않음 (프로젝트 정책 — 어플리케이션 레벨 무결성)
     */
    public function up(): void
    {
        Schema::table('site_files', function (Blueprint $table) {
            // paired_with_id — 짝인 시공 전 사진의 id
            // sort_order 뒤에 위치 (가독성)
            $table->unsignedBigInteger('paired_with_id')
                  ->nullable()
                  ->after('sort_order');

            // 인덱스 — 비교 화면에서 'paired_with_id가 X인 시공 후 사진' 빠르게 조회
            $table->index('paired_with_id', 'site_paired_with_idx');
        });
    }

    public function down(): void
    {
        Schema::table('site_files', function (Blueprint $table) {
            $table->dropIndex('site_paired_with_idx');
            $table->dropColumn('paired_with_id');
        });
    }
};
