<?php

namespace App\Services\Sms;

interface SmsServiceInterface
{
    /**
     * 전화번호로 문자 메시지 발송.
     */
    public function send(string $phone, string $message): void;

    /**
     * ★ v18.43 — 여러 명에게 한 번에 발송 (운영자 공지·이벤트 문자).
     * @param array<int, array{to: string, text: string}> $messages
     * @return array{success: int, fail: int}
     */
    public function sendMany(array $messages): array;
}
