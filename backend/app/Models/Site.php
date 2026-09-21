<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Site extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'address', 'apt_name', 'dong', 'ho', 'area_m2', 'team_id', 'owner_id', 'created_by', 'memo',
    ];

    // ────────────────────────────────────────────────
    // [스코프] 로그인 사용자 기준 접근 가능 범위로 필터링
    //   - 팀 소속: 같은 team_id
    //   - 프리랜서(team_id 없음): 본인이 만든(owner_id) 것만
    // ────────────────────────────────────────────────
    public function scopeForUser($query, $user)
    {
        if ($user->team_id) {
            return $query->where('team_id', $user->team_id);
        }

        return $query->where('owner_id', $user->id);
    }
}
