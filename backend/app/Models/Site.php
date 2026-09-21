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
    // [스코프] 로그인 사용자 기준 조회 범위로 필터링 — Schedule::scopeForUser와 동일한
    //   개인/팀/전체 3분기. Site는 투입 인원 개념이 없어 과거 팀 소속 판별은
    //   created_by만 봄.
    // ────────────────────────────────────────────────
    public function scopeForUser($query, $user, string $filter = 'all')
    {
        $personal = fn ($q) => $q->where('owner_id', $user->id);

        $team = function ($q) use ($user) {
            $q->whereNotNull('team_id')->where(function ($q2) use ($user) {
                if ($user->team_id) {
                    $q2->orWhere('team_id', $user->team_id);
                }
                $q2->orWhere('created_by', $user->id);
            });
        };

        if ($filter === 'personal') {
            return $query->where($personal);
        }
        if ($filter === 'team') {
            return $query->where($team);
        }

        return $query->where(function ($q) use ($personal, $team) {
            $q->where($personal)->orWhere($team);
        });
    }

    // ────────────────────────────────────────────────
    // [스코프] 수정/삭제 가능 범위 — 과거 팀 현장은 조회만 가능, 수정 불가.
    // ────────────────────────────────────────────────
    public function scopeEditableBy($query, $user)
    {
        return $query->where(function ($q) use ($user) {
            $q->where('owner_id', $user->id);
            if ($user->team_id) {
                $q->orWhere('team_id', $user->team_id);
            }
        });
    }
}
