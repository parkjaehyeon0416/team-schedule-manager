<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * 비밀번호 재설정 인증코드 메일.
 *
 * ★ 발송 채널은 .env의 MAIL_MAILER로만 결정됨 — 지금은 'log'라 실제 메일이
 *   나가지 않고 storage/logs/laravel.log에 본문이 그대로 찍힘. 나중에 실제
 *   메일 서비스(SMTP/SES 등)를 붙일 때는 .env만 바꾸면 되고 이 코드는
 *   손댈 필요 없음.
 */
class PasswordResetCodeNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly string $code)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('[Team Schedule] 비밀번호 재설정 인증코드')
            ->greeting('비밀번호 재설정 요청이 접수되었습니다.')
            ->line('아래 인증코드를 앱에 입력해주세요. (10분간 유효)')
            ->line("인증코드: {$this->code}")
            ->line('본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.');
    }
}
