<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/** ★ v18.47 — 팀 공지 (팀 요금제) */
class TeamNotice extends Model
{
    use SoftDeletes;

    protected $fillable = ['team_id', 'user_id', 'body', 'pinned'];

    // ★ v18.72 hidden_at/hidden_by/hidden_reason(운영자 숨김 기록)은 fillable에 넣지 않음 — 속성으로 직접 대입
    protected $casts = ['pinned' => 'boolean', 'hidden_at' => 'datetime'];

    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
