<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// ★ v18.38 — 휴대폰 푸시(FCM) 기기 토큰
class DeviceToken extends Model
{
    protected $fillable = ['user_id', 'token', 'platform'];
}
