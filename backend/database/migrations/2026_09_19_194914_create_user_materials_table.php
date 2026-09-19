<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * user_materials — 사용자별 자재 목록 (★ v12 신규)
     *
     * 기획서 ServicePlan_v2_6 1-2절 반영: "사용자가 새 항목 입력 시 자동으로
     * '내 자재 목록'에 저장". 별도 material_categories 테이블은 만들지 않고
     * 이미 있는 work_types(v10.1)를 카테고리로 재사용한다(설계 단순화).
     */
    public function up(): void
    {
        Schema::create('user_materials', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('work_type_id')->nullable(); // 공정 카테고리(work_types 재사용)

            $table->string('name', 100);
            $table->string('unit', 20)->default('개'); // 단위 (㎡, 롤, 개, m 등)
            $table->decimal('default_unit_price', 10, 2)->nullable();

            // 자동 학습 — 견적서에 쓸 때마다 증가/갱신 (usage_count 내림차순 정렬용)
            $table->integer('usage_count')->default(0);
            $table->timestamp('last_used_at')->nullable();

            $table->boolean('is_hidden')->default(false);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'is_hidden']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_materials');
    }
};
