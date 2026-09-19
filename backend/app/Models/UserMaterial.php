<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class UserMaterial extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'work_type_id',
        'name',
        'unit',
        'default_unit_price',
        'usage_count',
        'last_used_at',
        'is_hidden',
    ];

    protected $casts = [
        'default_unit_price' => 'decimal:2',
        'usage_count'         => 'integer',
        'last_used_at'        => 'datetime',
        'is_hidden'           => 'boolean',
    ];

    public function workType()
    {
        return $this->belongsTo(WorkType::class);
    }
}
