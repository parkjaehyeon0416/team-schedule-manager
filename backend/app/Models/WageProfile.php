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

    // DB 기본값과 같게 — 아직 저장 안 한 사용자도 firstOrNew()로 이 값을 받음 (없으면 앱에 undefined로 보였음)
    protected $attributes = [
        'full_day_wage' => 250000,
        'half_day_wage' => 125000,
        'overtime_hourly_wage' => 35000,
        'night_holiday_premium_percent' => 20,
    ];

    protected $casts = [
        'full_day_wage' => 'integer',
        'half_day_wage' => 'integer',
        'overtime_hourly_wage' => 'integer',
        'night_holiday_premium_percent' => 'integer',
    ];
}
