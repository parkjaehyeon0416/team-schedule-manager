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
        'total_amount',
        'status',
        'approved_schedule_id',
    ];

    protected $casts = [
        'desired_date'     => 'date:Y-m-d',
        'subtotal_amount'  => 'decimal:2',
        'discount_amount'  => 'decimal:2',
        'total_amount'     => 'decimal:2',
    ];

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
