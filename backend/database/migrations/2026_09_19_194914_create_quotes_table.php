<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * quotes — 견적서 (★ v12~v13 신규)
     *
     * 기획서 ServicePlan_v2_6/2_7 반영. 견적 승인 시 일정(Schedule)을 자동
     * 생성하는 흐름을 지원하기 위해 approved_schedule_id를 둔다.
     */
    public function up(): void
    {
        Schema::create('quotes', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('user_id');       // 작성자
            $table->unsignedBigInteger('team_id')->nullable();
            $table->unsignedBigInteger('site_id')->nullable(); // 기존 현장과 연결(선택)
            $table->unsignedBigInteger('work_type_id')->nullable();

            $table->string('client_name', 100)->nullable();
            $table->string('client_contact', 100)->nullable();
            $table->string('address', 255)->nullable(); // 아직 Site로 등록 안 된 주소도 받을 수 있게
            $table->date('desired_date')->nullable();   // 희망 시공일 — 승인 시 일정의 date로 사용
            $table->text('memo')->nullable();

            $table->decimal('subtotal_amount', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);

            // draft(작성중) / sent(고객 전달) / approved(승인, 일정 전환됨) / rejected(반려)
            $table->string('status', 20)->default('draft');

            $table->unsignedBigInteger('approved_schedule_id')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
            $table->index('team_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotes');
    }
};
