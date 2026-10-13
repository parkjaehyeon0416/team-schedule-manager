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

    /**
     * ★ v18.67 보안 — 이 현장에 사진을 올리거나(일정 경유) 보고서를 만들 수 있나. "현장" 기준으로 판단.
     *   예전엔 "요청이 거쳐 온 일정"만 봐서, 팀 현장을 내 개인 일정에 붙이거나 다른 팀 현장을 내 팀 일정에 붙이면
     *   볼 수만 있던 현장에 사진을 올리고 남의 사진을 지울 수 있었음.
     *   - 현장을 관리하는 사람(개인 현장 주인, 그 팀 팀장·부팀장): 언제나
     *   - 팀 현장: 지금 그 팀 팀원(팀을 나간 사람은 보기만)
     *   - 팀 없는 현장(팀장이 자기 개인 현장을 팀 일정에 붙인 경우): 그 팀 일정($via)의 지금 팀원
     */
    public function canContributeBy($user, ?Schedule $via = null): bool
    {
        if ($this->canEditBy($user)) {
            return true;
        }
        if ($this->team_id) {
            return $user->isMemberOf((int) $this->team_id);
        }
        return $via && $via->team_id && $user->isMemberOf((int) $via->team_id)
            && (int) $via->site_id === (int) $this->id;
    }

    /**
     * ★ v18.67 보안 — 쓰기 권한 없이 "보기만" 하는 사람이 이 현장의 사진·보고서를 어디까지 볼 수 있나.
     *   예전엔 팀을 나간 사람이 옛 팀 일정이나, 나가기 전에 내 개인 일정에 붙여 둔 팀 현장을 통해
     *   나간 "뒤에" 올라온 새 사진까지 계속 볼 수 있었음(나간 뒤의 일은 그 사람의 옛 기록이 아님).
     *   - null   : 전부(지금 이 현장에 사진을 올릴 수 있는 사람)
     *   - Carbon : 그 시각(그 팀을 마지막으로 나간 때) "전에" 올라온 것 + 본인이 올린·만든 것(나간 그 초에 올라온 것도 안 보임)
     *   - false  : 본인이 올린·만든 것만(그 팀에 속한 적이 없음 — 다른 팀 현장이 붙은 일정 등)
     */
    public function viewCutoffFor($user, ?Schedule $via = null): \Illuminate\Support\Carbon|false|null
    {
        if ($this->canContributeBy($user, $via)) {
            return null;
        }
        $teamId = $this->team_id ?: $via?->team_id;
        return $teamId ? self::leftTeamAt($user, (int) $teamId) : false;
    }

    /** ★ v18.67 — 그 팀을 마지막으로 나간 때(team_members.deleted_at). 속한 적이 없으면 false */
    public static function leftTeamAt($user, int $teamId): \Illuminate\Support\Carbon|false
    {
        $at = \Illuminate\Support\Facades\DB::table('team_members')
            ->where('team_id', $teamId)->where('user_id', $user->id)
            ->whereNotNull('deleted_at')->max('deleted_at');
        return $at ? \Illuminate\Support\Carbon::parse($at) : false;
    }

    /**
     * ★ v18.67 — 사진(SiteFile)·보고서(SiteReport) 쿼리에 "볼 수 있는 것만" 조건을 붙임(viewCutoffFor 결과 기준).
     *   $ownerColumn: 본인 것을 가리는 컬럼(사진 uploaded_by, 보고서 user_id)
     */
    public static function applyViewCutoff($query, \Illuminate\Support\Carbon|false|null $cutoff, $user, string $ownerColumn)
    {
        if ($cutoff === null) {
            return $query;
        }
        return $query->where(function ($q) use ($cutoff, $user, $ownerColumn) {
            $q->where($q->qualifyColumn($ownerColumn), $user->id);
            if ($cutoff !== false) {
                $q->orWhere($q->qualifyColumn('created_at'), '<', $cutoff);
            }
        });
    }

    /** ★ v18.67 — 한 건(사진·보고서)이 viewCutoffFor 기준으로 보이는가 */
    public static function visibleUnderCutoff(\Illuminate\Support\Carbon|false|null $cutoff, $user, $ownerId, $createdAt): bool
    {
        if ($cutoff === null || (int) $ownerId === (int) $user->id) {
            return true;
        }
        return $cutoff !== false && $createdAt && \Illuminate\Support\Carbon::parse($createdAt)->lt($cutoff);
    }
}
