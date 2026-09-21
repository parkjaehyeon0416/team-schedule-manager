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
