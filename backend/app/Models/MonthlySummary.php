<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthlySummary extends Model
{
    // ⚠️ SoftDeletes 없음 - 이 테이블은 "캐시"라서 언제든 재계산 가능

    protected $fillable = [
        'user_id',
        'year_month',
        'total_work_units',
        'total_income',
        'total_expenses',
        'net_income',
        'work_days',
        'site_count',
        'estimated_tax',
        'last_calculated_at',
    ];

    protected $casts = [
        'total_work_units'   => 'decimal:1',
        'total_income'       => 'decimal:2',
        'total_expenses'     => 'decimal:2',
        'net_income'         => 'decimal:2',
        'work_days'          => 'integer',
        'site_count'         => 'integer',
        'estimated_tax'      => 'decimal:2',
        'last_calculated_at' => 'datetime',
    ];

    /**
     * 이 집계의 대상 사용자
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
