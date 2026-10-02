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

    /**
     * ★ v18.38 — 알림 피드에 쌓일 때 휴대폰 푸시도 함께 발송.
     *   견적(quote) 알림은 본인이 한 행동 기록이라 푸시하지 않음.
     *   응답을 늦추지 않도록 응답이 나간 뒤(afterResponse) 발송.
     */
    protected static function booted(): void
    {
        static::created(function (Notification $n) {
            if (!in_array($n->category, ['team', 'schedule'], true)) {
                return;
            }
            $data = array_filter(['link_type' => $n->link_type, 'link_id' => $n->link_id], fn($v) => $v !== null);
            dispatch(fn() => \App\Services\PushService::sendToUsers(
                [$n->user_id], $n->category, $n->title, $n->body, $data,
            ))->afterResponse();
        });
    }
}
