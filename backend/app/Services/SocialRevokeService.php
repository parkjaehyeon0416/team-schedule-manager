<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * ★ v18.64 — 탈퇴·연결 해제 때 소셜 쪽 연결도 끊기
 *   - 카카오: 연결 끊기(unlink) — 카카오 운영 정책. Admin 키로 서버가 직접(사용자 재로그인 불필요)
 *   - Apple: 토큰 revoke — 앱스토어 심사 필수(5.1.1(v)). 로그인 때 받은 authorization code를 갱신 토큰으로
 *     바꿔 저장해 뒀다가(users.apple_refresh_token, 암호화) 탈퇴 때 revoke.
 *   설정이 없으면(.env 키 미입력) 조용히 건너뜀. 실패해도 탈퇴는 진행하고 로그만 남김.
 */
class SocialRevokeService
{
    public static function kakaoUnlink(?string $kakaoId): bool
    {
        $adminKey = config('services.kakao.admin_key');
        if (!$kakaoId || !$adminKey) {
            return false;
        }
        try {
            $res = Http::asForm()->withHeaders(['Authorization' => "KakaoAK {$adminKey}"])->timeout(10)
                ->post('https://kapi.kakao.com/v1/user/unlink', ['target_id_type' => 'user_id', 'target_id' => $kakaoId]);
            if (!$res->successful()) {
                Log::warning('카카오 연결 끊기 실패', ['status' => $res->status(), 'body' => $res->body()]);
            }
            return $res->successful();
        } catch (\Throwable $e) {
            Log::warning('카카오 연결 끊기 오류', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /** 로그인 때 받은 Apple authorization code → 갱신 토큰(실패·설정 없음이면 null) */
    public static function appleExchange(?string $code): ?string
    {
        $secret = self::appleClientSecret();
        if (!$code || !$secret) {
            return null;
        }
        try {
            $res = Http::asForm()->timeout(10)->post('https://appleid.apple.com/auth/token', [
                'client_id'     => self::appleClientId(),
                'client_secret' => $secret,
                'code'          => $code,
                'grant_type'    => 'authorization_code',
            ]);
            if (!$res->successful()) {
                Log::warning('Apple 토큰 교환 실패', ['status' => $res->status(), 'body' => $res->body()]);
                return null;
            }
            return $res->json('refresh_token');
        } catch (\Throwable $e) {
            Log::warning('Apple 토큰 교환 오류', ['error' => $e->getMessage()]);
            return null;
        }
    }

    public static function appleRevoke(?string $refreshToken): bool
    {
        $secret = self::appleClientSecret();
        if (!$refreshToken || !$secret) {
            return false;
        }
        try {
            $res = Http::asForm()->timeout(10)->post('https://appleid.apple.com/auth/revoke', [
                'client_id'       => self::appleClientId(),
                'client_secret'   => $secret,
                'token'           => $refreshToken,
                'token_type_hint' => 'refresh_token',
            ]);
            if (!$res->successful()) {
                Log::warning('Apple revoke 실패', ['status' => $res->status(), 'body' => $res->body()]);
            }
            return $res->successful();
        } catch (\Throwable $e) {
            Log::warning('Apple revoke 오류', ['error' => $e->getMessage()]);
            return false;
        }
    }

    private static function appleClientId(): string
    {
        return (string) (config('services.apple.client_ids')[0] ?? 'com.workmatekr.app');
    }

    /**
     * Apple client_secret = ES256 JWT (Sign in with Apple 키로 서명). 5분 캐시(유효 10분).
     */
    private static function appleClientSecret(): ?string
    {
        $teamId = config('services.apple.team_id');
        $keyId = config('services.apple.key_id');
        $path = config('services.apple.private_key_path');
        if (!$teamId || !$keyId || !$path || !is_readable($path)) {
            return null;
        }

        return Cache::remember('apple_client_secret', now()->addMinutes(5), function () use ($teamId, $keyId, $path) {
            $b64 = fn(string $s) => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
            $now = time();
            $header = $b64(json_encode(['alg' => 'ES256', 'kid' => $keyId]));
            $claims = $b64(json_encode([
                'iss' => $teamId, 'iat' => $now, 'exp' => $now + 600,
                'aud' => 'https://appleid.apple.com', 'sub' => self::appleClientId(),
            ]));
            $key = openssl_pkey_get_private(file_get_contents($path));
            if (!$key || !openssl_sign("{$header}.{$claims}", $der, $key, OPENSSL_ALGO_SHA256)) {
                Log::error('Apple client_secret 서명 실패(키 파일 확인)');
                return null;
            }
            return "{$header}.{$claims}." . $b64(self::derToRaw($der));
        });
    }

    /** openssl ECDSA 서명(DER) → JWT용 r||s 64바이트 */
    private static function derToRaw(string $der): string
    {
        $pos = 3; // 30 len 02
        if (ord($der[1]) & 0x80) {
            $pos += ord($der[1]) & 0x7f;
        }
        $rLen = ord($der[$pos]);
        $r = substr($der, $pos + 1, $rLen);
        $pos += 1 + $rLen + 1; // 02
        $sLen = ord($der[$pos]);
        $s = substr($der, $pos + 1, $sLen);
        $fix = fn(string $v) => str_pad(ltrim($v, "\0"), 32, "\0", STR_PAD_LEFT);
        return $fix($r) . $fix($s);
    }
}
