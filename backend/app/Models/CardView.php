<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CardView extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'card_id',
        'viewer_ip_hash',
        'user_agent',
        'referrer',
        'viewed_at',
    ];

    protected $casts = [
        'viewed_at' => 'datetime',
    ];
}
