<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SiteReport extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'schedule_id',
        'user_id',
        'title',
        'client_name',
        'client_contact',
        'greeting_message',
        'template_id',
        'share_token',
        'view_count',
        'last_viewed_at',
        'pdf_path',
    ];

    protected $casts = [
        'view_count'     => 'integer',
        'last_viewed_at' => 'datetime',
    ];

    public function schedule()
    {
        return $this->belongsTo(Schedule::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
