<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * ★ DESIGN-CANVAS(NOTICE_LIST/NOTICE_DETAIL/EVENT_DETAIL) — 공지사항·이벤트
 */
class Notice extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'type', 'title', 'summary', 'body', 'info', 'steps', 'cautions', 'banner_path',
        'cta_label', 'cta_route', 'is_pinned', 'author', 'starts_at', 'ends_at', 'published_at',
    ];

    protected $casts = [
        'info'         => 'array',
        'steps'        => 'array',
        'cautions'     => 'array',
        'is_pinned'    => 'boolean',
        'starts_at'    => 'date:Y-m-d',
        'ends_at'      => 'date:Y-m-d',
        'published_at' => 'datetime',
    ];

    public function scopePublished($query)
    {
        return $query->whereNotNull('published_at')->where('published_at', '<=', now());
    }
}
