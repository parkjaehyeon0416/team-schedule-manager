<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;

/**
 * ★ v18.51 — 소셜 로그인 공용 처리(구글/카카오)
 *
 * - 토큰 검증: 구글 id_token / 카카오 access_token → {id, email, name}
 * - 연결 티켓: 연결된 계정이 없는 소셜 로그인 정보를 15분짜리 암호화 문자열로 앱에 돌려줌.
 *   "처음이에요"(가입) 또는 "이미 계정이 있어요"(기존 계정 로그인 후 연결) 때 다시 받아 씀 —
 *   소셜 토큰을 다시 검증하지 않아도 되고, 앱이 provider id를 위조할 수 없음.
 */
class SocialAuthService
{
    public const PROVIDERS = ['google', 'kakao'];

    /** @return array{id:string,email:?string,name:?string}|null */
    public static function verify(string $provider, string $token): ?array
    {
        return $provider === 'google' ? self::verifyGoogle($token) : self::verifyKakao($token);
    }

    public static function column(string $provider): string
    {
        return $provider === 'google' ? 'google_id' : 'kakao_id';
    }

    public static function makeTicket(string $provider, array $profile): string
    {
        return Crypt::encryptString(json_encode([
            'p'     => $provider,
            'id'    => $profile['id'],
            'email' => $profile['email'],
            'name'  => $profile['name'],
            'exp'   => now()->addMinutes(15)->timestamp,
        ]));
    }

    /** @return array{p:string,id:string,email:?string,name:?string}|null 만료·위조면 null */
    public static function readTicket(?string $ticket): ?array
    {
        if (!$ticket) {
            return null;
        }
        try {
            $data = json_decode(Crypt::decryptString($ticket), true);
        } catch (\Throwable) {
            return null;
        }
        if (!is_array($data) || ($data['exp'] ?? 0) < time() || !in_array($data['p'] ?? null, self::PROVIDERS, true)) {
            return null;
        }
        return $data;
    }

    /**
     * 사용자에게 소셜 계정 연결. 실패 사유 문자열 반환(성공이면 null)
     * - taken: 이 소셜 계정이 이미 다른 WorkMate 계정에 연결됨
     * - other: 이 사용자에게 같은 종류의 다른 소셜 계정이 이미 연결됨
     */
    public static function attach(User $user, string $provider, string $providerId): ?string
    {
        $col = self::column($provider);
        if ($user->{$col} === $providerId) {
            return null;
        }
        if (User::withTrashed()->where($col, $providerId)->where('id', '!=', $user->id)->exists()) {
            return 'taken';
        }
        if ($user->{$col}) {
            return 'other';
        }
        $user->forceFill([$col => $providerId, "{$provider}_linked_at" => now()])->save();
        return null;
    }

    /** 화면 표시용 — "철수 · chul***@kakao.com" */
    public static function displayName(array $profile): string
    {
        $email = $profile['email'] ?? null;
        if ($email && str_contains($email, '@')) {
            [$local, $domain] = explode('@', $email, 2);
            $email = mb_substr($local, 0, 4) . '***@' . $domain;
        }
        return implode(' · ', array_filter([$profile['name'] ?? null, $email])) ?: '이름 없는 계정';
    }

    private static function verifyGoogle(string $idToken): ?array
    {
        $response = Http::get('https://oauth2.googleapis.com/tokeninfo', ['id_token' => $idToken]);
        if (!$response->successful()) {
            return null;
        }
        $payload = $response->json();
        $allowedClientIds = config('services.google.client_ids');
        // aud가 우리 앱의 OAuth 클라이언트 ID 중 하나인지 검증 (다른 앱용 토큰 도용 방지)
        if (!empty($allowedClientIds) && !in_array($payload['aud'] ?? null, $allowedClientIds, true)) {
            return null;
        }
        return ['id' => (string) $payload['sub'], 'email' => $payload['email'] ?? null, 'name' => $payload['name'] ?? null];
    }

    private static function verifyKakao(string $accessToken): ?array
    {
        $response = Http::withToken($accessToken)->get('https://kapi.kakao.com/v2/user/me');
        if (!$response->successful()) {
            return null;
        }
        $payload = $response->json();
        $account = $payload['kakao_account'] ?? [];
        return ['id' => (string) $payload['id'], 'email' => $account['email'] ?? null, 'name' => $account['profile']['nickname'] ?? null];
    }
}
