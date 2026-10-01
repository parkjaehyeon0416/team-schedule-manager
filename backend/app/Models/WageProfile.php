<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WageProfile extends Model
{
    protected $fillable = [
        'user_id',
        'full_day_wage',
        'half_day_wage',
        'overtime_hourly_wage',
        'night_holiday_premium_percent',
    ];

    protected $casts = [
        'full_day_wage' => 'integer',
        'half_day_wage' => 'integer',
        'overtime_hourly_wage' => 'integer',
        'night_holiday_premium_percent' => 'integer',
    ];
}
