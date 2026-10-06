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
        'invite_expires_at', // ★ v18.43 초대 코드 7일 만료
    ];

    protected $casts = ['invite_expires_at' => 'datetime'];

    public const INVITE_DAYS = 7;

    // ★ v18.43 — 만료일이 없거나(옛 데이터) 지났으면 만료
    public function inviteExpired(): bool
    {
        return !$this->invite_expires_at || $this->invite_expires_at->isPast();
    }

    // 초대 코드로 팀 찾기 — 만료된 코드는 없는 것처럼 취급
    public static function findByValidInvite(string $code): ?self
    {
        $team = self::where('invite_code', strtoupper(trim($code)))->first();

        return $team && !$team->inviteExpired() ? $team : null;
    }

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
