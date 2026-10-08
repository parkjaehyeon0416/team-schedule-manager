<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * ★ v18.63 — 이메일 인증번호(회원 탈퇴 본인 확인). 발송 설정은 .env MAIL_*.
 */
class VerificationCodeMail extends Mailable
{
    use Queueable;

    public function __construct(public string $code, public string $purposeLabel, public int $minutes)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: "[현장메이트] {$this->purposeLabel} 인증번호 {$this->code}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.verification-code');
    }
}
