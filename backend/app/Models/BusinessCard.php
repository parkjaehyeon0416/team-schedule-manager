<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BusinessCard extends Model
{
    use SoftDeletes;

    /** ★ v18.68 — 현장 사진 공개 범위: 공개 안 함 / 시공 후만 / 시공 전·후 모두 */
    public const SHOWCASE_NONE  = 'none';
    public const SHOWCASE_AFTER = 'after';
    public const SHOWCASE_BOTH  = 'both';
    public const SHOWCASE_MODES = [self::SHOWCASE_NONE, self::SHOWCASE_AFTER, self::SHOWCASE_BOTH];

    /** ★ v18.68 — 새로 만든 명함도 응답에 showcase_mode가 늘 들어가게(DB 기본값과 같음) */
    protected $attributes = [
        'showcase_mode' => self::SHOWCASE_NONE,
    ];

    protected $fillable = [
        'user_id',
        'share_code',
        'display_name',
        'contact_phone',
        'job_title',
        'years_experience',
        'service_area',
        'specialty',
        'tagline',
        'profile_photo_path',
        'showcase_photo_ids',
        'showcase_mode', // ★ v18.68
        'is_public',
        'view_count',
        'monthly_view_count',
        'last_viewed_at',
    ];

    protected $casts = [
        'showcase_photo_ids' => 'array',
        'showcase_mode'      => 'string', // ★ v18.68
        'is_public'          => 'boolean',
        'view_count'         => 'integer',
        'monthly_view_count' => 'integer',
        'last_viewed_at'     => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
