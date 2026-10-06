<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ★ v18.45 — 부가세 계산 기능(2026-10-02) 이전에 만든 견적서는 tax_type 기본값 'separate'만 들어가고
 *   부가세 0원·합계=공급가로 남아 있었음("부가세 별도"인데 20만원이 그대로 20만원). 저장된 구분대로 다시 계산.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('quotes')->orderBy('id')->each(function ($q) {
            [$vat, $total] = \App\Models\Quote::calcTax(
                (float) $q->subtotal_amount,
                (float) $q->discount_amount,
                $q->tax_type ?: 'separate',
            );
            if ((float) $q->vat_amount != $vat || (float) $q->total_amount != $total) {
                DB::table('quotes')->where('id', $q->id)->update(['vat_amount' => $vat, 'total_amount' => $total]);
            }
        });
    }

    public function down(): void
    {
        // 되돌릴 값 없음(잘못된 이전 값으로 돌리지 않음)
    }
};
