<?php

namespace App\Services\Sms;

interface SmsServiceInterface
{
    /**
     * 전화번호로 문자 메시지 발송.
     */
    public function send(string $phone, string $message): void;
}
