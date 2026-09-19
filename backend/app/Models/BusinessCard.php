<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BusinessCard extends Model
{
    use SoftDeletes;

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
        'is_public',
        'view_count',
        'monthly_view_count',
        'last_viewed_at',
    ];

    protected $casts = [
        'showcase_photo_ids' => 'array',
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
