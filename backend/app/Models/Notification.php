<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * ★ DESIGN-CANVAS(NOTIFICATIONS) 추가 — 2026-10-02
 * 팀 일정 추가/팀 참여/견적 승인 등 주요 이벤트를 적재하는 알림 피드.
 * Laravel 기본 DatabaseNotification과 이름이 겹치지 않도록 일반 Eloquent 모델로 직접 정의함.
 */
class Notification extends Model
{
    protected $table = 'app_notifications'; // Laravel 기본 Notifiable 트레이트의 `notifications` 테이블과 분리

    protected $fillable = [
        'user_id', 'category', 'title', 'body', 'link_type', 'link_id', 'is_read',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];
}
