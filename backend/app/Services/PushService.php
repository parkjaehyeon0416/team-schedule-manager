<?php

namespace App\Services;

use App\Models\DeviceToken;
use App\Models\NotificationSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * ★ v18.38 — 휴대폰 푸시 발송 (Firebase Cloud Messaging HTTP v1)
 *
 * 외부 패키지 없이 서비스 계정 키(JSON)로 직접 OAuth 토큰을 받아 FCM API를 호출한다.
 * 키 파일이 없으면(아직 Firebase 설정 전) 아무것도 하지 않고 넘어감 — 앱 안 알림 피드는 그대로 동작.
 */
class PushService
{
    /**
     * @param int[] $userIds
     * @param string $category  notification_settings 확인용: team | schedule | quote
     * @param array<string,string> $data  앱에서 눌렀을 때 이동할 화면 정보(link_type, link_id)
     */
    public static function sendToUsers(array $userIds, string $category, string $title, string $body, array $data = []): void
    {
        $credentials = self::credentials();
        if (!$credentials || empty($userIds)) {
            return;
        }

        $targetUserIds = self::filterBySettings($userIds, $category);
        if (empty($targetUserIds)) {
            return;
        }

        $tokens = DeviceToken::whereIn('user_id', $targetUserIds)->pluck('token');
        if ($tokens->isEmpty()) {
            return;
        }

        $accessToken = self::accessToken($credentials);
        if (!$accessToken) {
            return;
        }

        $url = "https://fcm.googleapis.com/v1/projects/{$credentials['project_id']}/messages:send";
        $data = array_map('strval', $data);

        foreach ($tokens as $token) {
            $res = Http::withToken($accessToken)->timeout(10)->post($url, [
                'message' => [
                    'token'        => $token,
                    'notification' => ['title' => $title, 'body' => $body],
                    'data'         => (object) $data,
                    'android'      => ['priority' => 'high', 'notification' => ['channel_id' => 'default']],
                ],
            ]);

            if ($res->failed()) {
                $status = $res->json('error.details.0.errorCode') ?? $res->json('error.status');
                // 앱 삭제 등으로 더 이상 유효하지 않은 토큰은 정리
                if (in_array($status, ['UNREGISTERED', 'INVALID_ARGUMENT', 'NOT_FOUND'], true)) {
                    DeviceToken::where('token', $token)->delete();
                } else {
                    Log::warning('[Push] 발송 실패', ['status' => $res->status(), 'error' => $res->json('error.message')]);
                }
            }
        }
    }

    /**
     * 알림 설정에서 해당 종류를 끈 사용자와, "야간 알림 끄기"(22시~8시) 사용자를 제외.
     * 설정 행이 없는 사용자는 기본값(전부 켜짐)으로 취급.
     */
    private static function filterBySettings(array $userIds, string $category): array
    {
        $column = match ($category) {
            'team'     => 'team_activity',
            'schedule' => 'schedule_reminder',
            'quote'    => 'quote_update',
            default    => null,
        };

        $hour = (int) now()->format('G');
        $isNight = $hour >= 22 || $hour < 8;

        $settings = NotificationSetting::whereIn('user_id', $userIds)->get()->keyBy('user_id');

        return array_values(array_filter($userIds, function ($userId) use ($settings, $column, $isNight) {
            $s = $settings->get($userId);
            if (!$s) {
                return true;
            }
            if ($column && $s->{$column} === false) {
                return false;
            }
            if ($isNight && $s->night_quiet_hours) {
                return false;
            }
            return true;
        }));
    }

    private static function credentials(): ?array
    {
        $path = config('services.firebase.credentials');
        if (!$path || !is_file($path)) {
            return null;
        }
        $json = json_decode((string) file_get_contents($path), true);
        return isset($json['client_email'], $json['private_key'], $json['project_id']) ? $json : null;
    }

    // 서비스 계정으로 OAuth 액세스 토큰 발급(JWT RS256 서명) — 50분 캐시
    private static function accessToken(array $credentials): ?string
    {
        return Cache::remember('fcm_access_token', now()->addMinutes(50), function () use ($credentials) {
            $now = time();
            $b64 = fn(string $s) => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
            $header  = $b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
            $payload = $b64(json_encode([
                'iss'   => $credentials['client_email'],
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud'   => 'https://oauth2.googleapis.com/token',
                'iat'   => $now,
                'exp'   => $now + 3600,
            ]));

            $signature = '';
            if (!openssl_sign("{$header}.{$payload}", $signature, $credentials['private_key'], 'sha256WithRSAEncryption')) {
                Log::error('[Push] JWT 서명 실패');
                return null;
            }

            $res = Http::asForm()->timeout(10)->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion'  => "{$header}.{$payload}." . $b64($signature),
            ]);

            if ($res->failed()) {
                Log::error('[Push] 액세스 토큰 발급 실패', ['error' => $res->json('error_description')]);
                return null;
            }

            return $res->json('access_token');
        });
    }
}
