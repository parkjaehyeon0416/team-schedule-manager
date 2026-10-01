<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            // ★ DESIGN-CANVAS(ESTIMATE_CREATE/EDIT) — 부가세 별도/포함/면세 탭 실계산용
            $table->string('tax_type', 20)->default('separate')->after('discount_amount'); // separate | included | exempt
            $table->decimal('vat_amount', 12, 2)->default(0)->after('tax_type');
        });
    }

    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->dropColumn(['tax_type', 'vat_amount']);
        });
    }
};
