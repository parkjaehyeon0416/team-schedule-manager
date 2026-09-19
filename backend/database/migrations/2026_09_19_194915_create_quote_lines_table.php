<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * quote_lines — 견적서 항목(줄) (★ v12 신규)
     */
    public function up(): void
    {
        Schema::create('quote_lines', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('quote_id');
            $table->unsignedBigInteger('user_material_id')->nullable(); // 내 자재 목록에서 골랐다면 참조

            $table->string('name', 100);
            $table->string('spec', 255)->nullable(); // 규격/설명 (예: "합지 실크벽지, 거실+안방")
            $table->decimal('quantity', 10, 2)->default(1);
            $table->string('unit', 20)->default('개');
            $table->decimal('unit_price', 10, 2)->default(0);
            $table->decimal('amount', 12, 2)->default(0); // quantity * unit_price (백엔드에서 계산해 저장)

            $table->integer('sort_order')->default(0);

            $table->timestamps();

            $table->index('quote_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_lines');
    }
};
