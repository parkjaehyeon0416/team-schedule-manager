<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** ★ v18.47 — 팀원별 월 정산 지급 기록 (금액 자체는 그 달 팀 일정에서 계산) */
class TeamSettlement extends Model
{
    protected $fillable = ['team_id', 'user_id', 'year_month', 'paid_amount', 'paid_at', 'paid_by', 'memo'];

    protected $casts = [
        'paid_amount' => 'decimal:2',
        'paid_at'     => 'datetime',
    ];
}
