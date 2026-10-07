<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/** ★ v18.47 — 팀 공지 (팀 요금제) */
class TeamNotice extends Model
{
    use SoftDeletes;

    protected $fillable = ['team_id', 'user_id', 'body', 'pinned'];

    protected $casts = ['pinned' => 'boolean'];

    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
