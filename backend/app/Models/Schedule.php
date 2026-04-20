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
        'date',
        'work_type',
        'district',
        'area_m2',
        'memo',
        'status',
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
                    ->withTimestamps();
    }
}
