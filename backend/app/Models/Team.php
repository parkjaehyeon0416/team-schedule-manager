<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Team extends Model
{
    // SoftDeletes: deleted_at 컬럼 자동 처리 (기획서 12.2절 확정)
    use SoftDeletes;

    protected $fillable = [
        'name', 'invite_code', 'created_by',
        'photo_path', 'description', 'specialty', 'activity_area', // ★ DESIGN-CANVAS(TEAM_CREATE) 추가
    ];

    /**
     * ★ v18.21 — 이 팀에 소속된 모든 사용자 (여러 팀 동시 소속 지원)
     */
    public function members()
    {
        return $this->belongsToMany(User::class, 'team_members')
                    ->withPivot('role_id', 'joined_at')
                    ->wherePivotNull('deleted_at')
                    ->withTimestamps();
    }
}
