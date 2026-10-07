<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Site extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'address', 'apt_name', 'dong', 'ho', 'area_m2', 'team_id', 'owner_id', 'created_by', 'memo',
        'start_date', 'end_date', 'customer', 'status',
    ];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date'   => 'date:Y-m-d',
    ];

    // ────────────────────────────────────────────────
    // [스코프] 로그인 사용자 기준 조회 범위로 필터링 — Schedule::scopeForUser와 동일한
    //   개인/팀/전체 3분기. Site는 투입 인원 개념이 없어 과거 팀 소속 판별은
    //   created_by만 봄.
    // ────────────────────────────────────────────────
    public function scopeForUser($query, $user, string $filter = 'all')
    {
        $personal = fn ($q) => $q->where('owner_id', $user->id);

        // ★ v18.21 — 여러 팀 동시 소속: 소속된 모든 팀의 현장을 합쳐서 보여줌.
        $teamIds = $user->teamIds();

        $team = function ($q) use ($user, $teamIds) {
            $q->whereNotNull('team_id')->where(function ($q2) use ($user, $teamIds) {
                if (!empty($teamIds)) {
                    $q2->orWhereIn('team_id', $teamIds);
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
    //   ★ v18.44 — 내 개인 현장 + 내가 팀장인 팀의 현장(활성 팀이 아니어도 됨)
    public function scopeEditableBy($query, $user)
    {
        $led = $user->assignableTeamIds();
        return $query->where(function ($q) use ($user, $led) {
            $q->where('owner_id', $user->id);
            if (!empty($led)) {
                $q->orWhereIn('team_id', $led);
            }
        });
    }

    /** ★ v18.44 — 앱이 수정/삭제 버튼을 보여줄지 판단하는 값 */
    public function canEditBy($user): bool
    {
        return (int) $this->owner_id === (int) $user->id
            || ($this->team_id && $user->canAssignIn((int) $this->team_id));
    }
}
