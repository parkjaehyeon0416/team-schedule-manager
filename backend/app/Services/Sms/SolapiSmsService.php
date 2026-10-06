<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * SOLAPI(솔라피) 연동 — 개인(비사업자) 계정도 가입 가능한 SMS 발송 서비스.
 * https://api.solapi.com/messages/v4/send
 *
 * 인증 방식: HMAC-SHA256 서명 (API Key + API Secret 필요).
 * .env에 SOLAPI_API_KEY / SOLAPI_API_SECRET / SOLAPI_SENDER(사전등록된 발신번호) 설정 필요.
 */
class SolapiSmsService implements SmsServiceInterface
{
    public function send(string $phone, string $message): void
    {
        $apiKey    = config('sms.solapi.api_key');
        $apiSecret = config('sms.solapi.api_secret');
        $sender    = config('sms.solapi.sender');

        if (!$apiKey || !$apiSecret || !$sender) {
            throw new RuntimeException('SOLAPI 설정(SOLAPI_API_KEY/SOLAPI_API_SECRET/SOLAPI_SENDER)이 누락되었습니다.');
        }

        $date = now()->toIso8601String();
        $salt = Str::random(32);
        $signature = hash_hmac('sha256', $date . $salt, $apiSecret);

        $response = Http::withHeaders([
            'Authorization' => "HMAC-SHA256 apiKey={$apiKey}, date={$date}, salt={$salt}, signature={$signature}",
            'Content-Type'  => 'application/json',
        ])->post('https://api.solapi.com/messages/v4/send', [
            'message' => [
                'to'   => preg_replace('/[^0-9]/', '', $phone),
                'from' => preg_replace('/[^0-9]/', '', $sender),
                'text' => $message,
            ],
        ]);

        if (!$response->successful()) {
            Log::error('[SOLAPI 발송 실패] status=' . $response->status() . ' body=' . $response->body());
            throw new RuntimeException('SMS 발송에 실패했습니다.');
        }
    }

    /**
     * ★ v18.43 — 대량 발송 (send-many/detail, 요청당 최대 10,000건 → 1,000건씩 나눠 보냄).
     *   글자 수에 따라 SMS/LMS는 SOLAPI가 자동으로 정함.
     */
    public function sendMany(array $messages): array
    {
        $apiKey    = config('sms.solapi.api_key');
        $apiSecret = config('sms.solapi.api_secret');
        $sender    = preg_replace('/[^0-9]/', '', (string) config('sms.solapi.sender'));

        if (!$apiKey || !$apiSecret || !$sender) {
            throw new RuntimeException('SOLAPI 설정(SOLAPI_API_KEY/SOLAPI_API_SECRET/SOLAPI_SENDER)이 누락되었습니다.');
        }

        $success = 0;
        $fail = 0;
        foreach (array_chunk($messages, 1000) as $chunk) {
            $date = now()->toIso8601String();
            $salt = Str::random(32);
            $signature = hash_hmac('sha256', $date . $salt, $apiSecret);

            $response = Http::withHeaders([
                'Authorization' => "HMAC-SHA256 apiKey={$apiKey}, date={$date}, salt={$salt}, signature={$signature}",
                'Content-Type'  => 'application/json',
            ])->timeout(60)->post('https://api.solapi.com/messages/v4/send-many/detail', [
                'messages' => array_map(fn($m) => [
                    'to'   => preg_replace('/[^0-9]/', '', $m['to']),
                    'from' => $sender,
                    'text' => $m['text'],
                ], $chunk),
            ]);

            if (!$response->successful()) {
                Log::error('[SOLAPI 대량발송 실패] status=' . $response->status() . ' body=' . $response->body());
                $fail += count($chunk);
                continue;
            }

            $failed = count($response->json('failedMessageList') ?? []);
            $fail += $failed;
            $success += count($chunk) - $failed;
        }

        return ['success' => $success, 'fail' => $fail];
    }
}
