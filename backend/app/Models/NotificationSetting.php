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
        // ★ DESIGN-CANVAS(NOTIFICATION_SETTINGS) 추가
        'tax_reminder',
        'marketing_opt_in',
        'night_quiet_hours',
        'schedule_reminder_time',
    ];

    protected $casts = [
        'schedule_reminder' => 'boolean',
        'team_activity'     => 'boolean',
        'quote_update'      => 'boolean',
        'report_view'       => 'boolean',
        'tax_reminder'       => 'boolean',
        'marketing_opt_in'   => 'boolean',
        'night_quiet_hours'  => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
