<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Quote extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'team_id',
        'site_id',
        'work_type_id',
        'client_name',
        'client_contact',
        'address',
        'desired_date',
        'memo',
        'subtotal_amount',
        'discount_amount',
        'tax_type',
        'vat_amount',
        'total_amount',
        'status',
        'approved_schedule_id',
    ];

    protected $casts = [
        'desired_date'     => 'date:Y-m-d',
        'subtotal_amount'  => 'decimal:2',
        'discount_amount'  => 'decimal:2',
        'vat_amount'       => 'decimal:2',
        'total_amount'     => 'decimal:2',
    ];

    // ★ v18.45 — 화면·PDF·엑셀이 같은 값으로 "공급가액 / 부가세 / 합계"를 보여주도록 응답에 포함
    protected $appends = ['supply_amount', 'tax_label'];

    public const TAX_LABELS = ['separate' => '부가세 별도', 'included' => '부가세 포함', 'exempt' => '면세'];

    /**
     * 세금 계산 — [부가세, 합계]
     *   separate(별도): 공급가(소계-할인)에 10%를 더한 금액이 합계
     *   included(포함): 입력한 금액이 곧 합계, 그 안의 부가세를 역산(공급가액 = 합계 - 부가세)
     *   exempt(면세): 부가세 없음
     */
    public static function calcTax(float $subtotal, float $discount, string $taxType): array
    {
        $base = max(0, $subtotal - $discount);

        return match ($taxType) {
            'separate' => [round($base * 0.1), $base + round($base * 0.1)],
            'included' => [round($base - $base / 1.1), $base],
            default    => [0, $base],
        };
    }

    /** 공급가액(부가세 뺀 금액) — 포함이면 합계-부가세, 별도·면세면 소계-할인 */
    public function getSupplyAmountAttribute(): float
    {
        return (float) $this->total_amount - (float) $this->vat_amount;
    }

    public function getTaxLabelAttribute(): string
    {
        return self::TAX_LABELS[$this->tax_type ?? 'separate'] ?? '부가세 별도';
    }

    public function lines()
    {
        return $this->hasMany(QuoteLine::class)->orderBy('sort_order');
    }

    public function site()
    {
        return $this->belongsTo(Site::class);
    }

    public function workType()
    {
        return $this->belongsTo(WorkType::class);
    }
}
