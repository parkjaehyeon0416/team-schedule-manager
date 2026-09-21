<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Schedule extends Model
{
    use HasFactory, SoftDeletes;

    // ★ 대량할당 허용 필드 (create(), update() 시 필요)
    protected $fillable = [
        'site_id',
        'team_id',
        'owner_id',
        'created_by',
        'date',
        // 공정 (v7 ENUM + v9.0 외래키 둘 다 지원)
        'work_type',
        'work_type_id',
        // ★ v9.0 추가 — 공수·급여·경비
        'daily_wage',
        'work_units',
        'expenses',
        'expenses_memo',
        // 기타
        'district',
        'area_m2',
        'memo',
        'status',
    ];

    // ★ v9.0 추가 — 숫자 컬럼 자동 변환 ($casts)
    protected $casts = [
        'date'         => 'date:Y-m-d',
        'daily_wage'   => 'decimal:2',
        'work_units'   => 'decimal:1',
        'expenses'     => 'decimal:2',
        'area_m2'      => 'decimal:2',
    ];

    // ────────────────────────────────────────────────
    // [관계 1] 하나의 일정은 하나의 현장에 속함
    //   $schedule->site  →  Site 객체 반환
    // ────────────────────────────────────────────────
    public function site()
    {
        return $this->belongsTo(Site::class);
    }

    // ────────────────────────────────────────────────
    // [관계 2] 하나의 일정은 하나의 팀에 속함
    //   $schedule->team  →  Team 객체 반환
    // ────────────────────────────────────────────────
    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    // ────────────────────────────────────────────────
    // [관계 3] 하나의 일정에 여러 팀원이 배정됨 (다대다)
    //   schedule_users 중간 테이블을 통해 연결
    //   $schedule->users  →  User 배열 반환
    // ────────────────────────────────────────────────
    public function users()
    {
        return $this->belongsToMany(User::class, 'schedule_users')
                    ->withTimestamps()
                    ->wherePivotNull('deleted_at');   // ★ SoftDelete된 연결 제외
    }

    // ────────────────────────────────────────────────
    // [관계 4] ★ v9.0 추가 — 공정 (work_type_id 외래키)
    //   $schedule->workType  →  WorkType 객체 반환
    // ────────────────────────────────────────────────
    public function workType()
    {
        return $this->belongsTo(WorkType::class, 'work_type_id');
    }

    // ────────────────────────────────────────────────
    // [스코프] 로그인 사용자 기준 조회 범위로 필터링
    //
    //   팀 소속 여부와 무관하게 "개인 일정"을 만들 수 있음(owner_id) — 팀에
    //   있어도 개인용으로 등록한 일정은 team_id가 null. 그래서 필터가 3가지:
    //     - 'personal' : 내가 owner_id로 등록한 개인 일정
    //     - 'team'     : 지금 소속 팀의 공유 일정 + (팀이 없거나 예전 팀 것도)
    //                    내가 만들었거나 투입 인원으로 배정됐던 과거 팀 일정
    //                    → 팀을 나간 뒤에도 "그때 일한 스케줄"을 조회할 수 있음
    //     - 'all'(기본): 위 둘의 합집합
    //
    //   과거 팀 일정은 team_id를 그대로 두고(탈퇴해도 team_id를 null로 바꾸지
    //   않음) created_by/투입인원으로만 접근을 판별함 — TeamController::leave/
    //   destroy 참고.
    // ────────────────────────────────────────────────
    public function scopeForUser($query, $user, string $filter = 'all')
    {
        $personal = fn ($q) => $q->where('owner_id', $user->id);

        $team = function ($q) use ($user) {
            $q->whereNotNull('team_id')->where(function ($q2) use ($user) {
                if ($user->team_id) {
                    $q2->orWhere('team_id', $user->team_id);
                }
                $q2->orWhere('created_by', $user->id)
                    ->orWhereHas('users', fn ($q3) => $q3->where('users.id', $user->id));
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
    // [스코프] 수정/삭제 가능 범위 — 과거 팀 일정은 조회만 가능하고 수정은 불가.
    //   - 내 개인 일정(owner_id)이거나
    //   - 지금 소속된 팀의 일정(team_id = 현재 team_id)
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
