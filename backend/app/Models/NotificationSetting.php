<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationSetting extends Model
{
    protected $fillable = [
        'user_id',
        'schedule_reminder',
        'team_activity',
        'quote_update',
        'report_view',
    ];

    protected $casts = [
        'schedule_reminder' => 'boolean',
        'team_activity'     => 'boolean',
        'quote_update'      => 'boolean',
        'report_view'       => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
