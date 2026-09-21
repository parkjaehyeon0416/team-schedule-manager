<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Log;

/**
 * 실제 SMS 발송 서비스(다이렉트샌드 등) 연동 전까지 쓰는 임시 드라이버.
 * 문자를 보내는 대신 로그에 그대로 남김 — storage/logs/laravel.log에서 확인.
 *
 * 나중에 실제 서비스를 붙일 때는:
 *   1) SmsServiceInterface를 구현하는 새 클래스(예: DirectSendSmsService)를 작성
 *   2) config/sms.php의 'drivers' 배열에 등록
 *   3) .env의 SMS_DRIVER 값만 바꾸면 끝 — AuthController 등 호출부는 손댈 필요 없음
 */
class LogSmsService implements SmsServiceInterface
{
    public function send(string $phone, string $message): void
    {
        Log::info("[SMS 발송 시뮬레이션] to={$phone} message=\"{$message}\"");
    }
}
