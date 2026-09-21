<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkType extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'color',
        'icon',
        'team_id',
        'owner_id',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active'  => 'boolean',
    ];

    /**
     * 팀 커스텀 공정인 경우 해당 팀
     * (team_id가 null이면 공용 공정)
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * 이 공정을 사용하는 단가 설정들
     */
    public function wageSettings(): HasMany
    {
        return $this->hasMany(UserWageSetting::class);
    }

    // ────────────────────────────────────────────────
    // [스코프] 로그인 사용자가 볼 수 있는 공정 범위
    //   - 공용 공정(team_id, owner_id 둘 다 null) — 전원 공통
    //   - 지금 소속 팀의 커스텀 공정
    //   - 내가 직접 추가한 개인 커스텀 공정(프리랜서 or 팀 소속이어도 개인용)
    // ────────────────────────────────────────────────
    public function scopeForUser($query, $user)
    {
        return $query->where(function ($q) use ($user) {
            $q->where(function ($q2) {
                $q2->whereNull('team_id')->whereNull('owner_id');
            });
            if ($user->team_id) {
                $q->orWhere('team_id', $user->team_id);
            }
            $q->orWhere('owner_id', $user->id);
        });
    }

    // ────────────────────────────────────────────────
    // [스코프] 수정/삭제 가능 범위 — 공용 공정은 건드릴 수 없고,
    //   본인이 추가한 개인/팀 커스텀 공정만 가능
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
