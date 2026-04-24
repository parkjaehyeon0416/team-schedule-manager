<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserWageSetting extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'work_type_id',
        'default_wage',
        'default_work_units',
        'memo',
    ];

    protected $casts = [
        'default_wage'       => 'decimal:2',
        'default_work_units' => 'decimal:1',
    ];

    /**
     * 이 단가를 소유한 사용자
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * 이 단가가 적용되는 공정
     */
    public function workType(): BelongsTo
    {
        return $this->belongsTo(WorkType::class);
    }
}
