<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
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
    public const PROVIDERS = ['google', 'kakao', 'apple']; // ★ v18.60 Apple 추가

    public const NAMES = ['google' => '구글', 'kakao' => '카카오', 'apple' => 'Apple'];

    /** @return array{id:string,email:?string,name:?string}|null */
    public static function verify(string $provider, string $token): ?array
    {
        return match ($provider) {
            'google' => self::verifyGoogle($token),
            'kakao'  => self::verifyKakao($token),
            'apple'  => self::verifyApple($token),
            default  => null,
        };
    }

    public static function column(string $provider): string
    {
        return $provider . '_id'; // google_id · kakao_id · apple_id
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

    /**
     * ★ v18.60 — Apple identity token(JWT RS256) 검증. 외부 라이브러리 없이 openssl로 서명 확인.
     *   애플 공개키(JWKS)는 6시간 캐시, 토큰의 kid가 없으면 한 번 새로 받음. iss·aud(번들 ID)·exp 확인.
     *   이메일은 처음 로그인 때만 들어오고('나의 이메일 가리기'면 privaterelay 주소), 이름은 토큰에 없음(앱이 따로 보냄).
     */
    private static function verifyApple(string $jwt): ?array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            return null;
        }
        [$h64, $p64, $s64] = $parts;
        $header = json_decode(self::b64url($h64), true);
        $claims = json_decode(self::b64url($p64), true);
        if (!is_array($header) || !is_array($claims) || ($header['alg'] ?? '') !== 'RS256' || empty($header['kid'])) {
            return null;
        }

        $jwk = self::appleKey($header['kid']);
        if (!$jwk || openssl_verify("{$h64}.{$p64}", self::b64url($s64), self::jwkToPem($jwk['n'], $jwk['e']), OPENSSL_ALGO_SHA256) !== 1) {
            return null;
        }

        if (($claims['iss'] ?? '') !== 'https://appleid.apple.com'
            || !in_array($claims['aud'] ?? null, (array) config('services.apple.client_ids'), true)
            || (int) ($claims['exp'] ?? 0) < time()
            || empty($claims['sub'])) {
            return null;
        }

        return ['id' => (string) $claims['sub'], 'email' => $claims['email'] ?? null, 'name' => null];
    }

    private static function appleKey(string $kid): ?array
    {
        $fetch = fn() => Http::timeout(10)->get('https://appleid.apple.com/auth/keys')->json('keys');
        $find = fn() => collect(Cache::remember('apple_jwks', now()->addHours(6), $fetch) ?? [])->firstWhere('kid', $kid);
        $key = $find();
        if (!$key) { // 애플이 키를 바꾼 직후일 수 있음 → 한 번 새로 받기
            Cache::forget('apple_jwks');
            $key = $find();
        }
        return $key && isset($key['n'], $key['e']) ? $key : null;
    }

    private static function b64url(string $s): string
    {
        return (string) base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4));
    }

    /** JWK(n, e) → PEM 공개키 (SubjectPublicKeyInfo DER을 직접 조립) */
    private static function jwkToPem(string $n, string $e): string
    {
        $len = function (int $l): string {
            if ($l < 0x80) {
                return chr($l);
            }
            $b = ltrim(pack('N', $l), "\0");
            return chr(0x80 | strlen($b)) . $b;
        };
        $int = function (string $bytes) use ($len): string {
            if (ord($bytes[0]) > 0x7f) {
                $bytes = "\0" . $bytes; // 양수로 표시
            }
            return "\x02" . $len(strlen($bytes)) . $bytes;
        };
        $seq = fn(string $c) => "\x30" . $len(strlen($c)) . $c;
        $rsaKey = $seq($int(self::b64url($n)) . $int(self::b64url($e)));
        $algo = $seq("\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00"); // OID rsaEncryption + NULL
        $bits = "\x03" . $len(strlen($rsaKey) + 1) . "\0" . $rsaKey;
        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($seq($algo . $bits)), 64, "\n") . "-----END PUBLIC KEY-----\n";
    }
}
