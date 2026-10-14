<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * ★ v18.68 — 본인 확인(POST /me/reauth)을 통과하면 주는 한 번용 표(reauth_token).
 *   로그인 연결·해제(POST·DELETE /me/login-links)처럼 확인 화면과 실제 작업이 나뉜 곳에 씀.
 *   - 무작위 64자, 캐시엔 sha1만 키로 저장(값: 계정 id + 용도 + 끝나는 시각), 10분
 *   - 이 계정 + 이 용도에만 쓸 수 있음
 *   - 한 번만 — 실제로 작업할 때 consume(). 동시에 같은 표로 두 번 보내도 하나만 통과
 *     (Cache::pull은 읽고 지우기라 DB 캐시에선 둘 다 읽을 수 있음 → "썼음" 표시를 Cache::add로 먼저 잡음. add는 INSERT라 하나만 성공)
 *   - 작업 직전까지는 valid()로 보기만 함 → 소셜 토큰이 틀리거나 이미 다른 계정에 연결된 소셜이면 표가 남아서
 *     10분 안에 다시 시도할 수 있음. 작업 도중 막히면 restore()로 되돌림.
 */
class ReauthToken
{
    public const TTL_SECONDS = 600;

    /** 새 표 발급 */
    public static function issue(User $user, string $purpose): string
    {
        $token = Str::random(64);
        Cache::put(self::key($token), [
            'user_id' => $user->id,
            'purpose' => $purpose,
            'until'   => time() + self::TTL_SECONDS,
        ], self::TTL_SECONDS);
        return $token;
    }

    /** 이 계정·용도에 쓸 수 있는 표인지 보기만(안 씀) */
    public static function valid(mixed $token, User $user, string $purpose): bool
    {
        return self::read($token, $user, $purpose) !== null;
    }

    /**
     * 실제로 쓰기 — 성공하면 표에 담긴 값(되돌릴 때 restore에 넘김), 없거나 만료·이미 씀·다른 계정이면 null.
     */
    public static function consume(mixed $token, User $user, string $purpose): ?array
    {
        if (!self::read($token, $user, $purpose)) {
            return null;
        }
        if (!Cache::add(self::usedKey($token), 1, self::TTL_SECONDS)) {
            return null; // 같은 표로 동시에 들어온 다른 요청이 먼저 씀
        }
        $value = Cache::pull(self::key($token));
        return self::matches($value, $user, $purpose) ? $value : null;
    }

    /** 표를 쓴 뒤 작업이 실제로는 안 됐을 때(예: 저장 직전에 다른 계정이 그 소셜을 연결) — 남은 시간만큼 다시 쓸 수 있게 */
    public static function restore(string $token, array $value): void
    {
        $left = (int) ($value['until'] ?? 0) - time();
        if ($left > 0) {
            Cache::put(self::key($token), $value, $left);
        }
        Cache::forget(self::usedKey($token));
    }

    private static function read(mixed $token, User $user, string $purpose): ?array
    {
        if (!is_string($token) || strlen($token) < 32 || strlen($token) > 128) {
            return null;
        }
        if (Cache::has(self::usedKey($token))) {
            return null;
        }
        $value = Cache::get(self::key($token));
        return self::matches($value, $user, $purpose) ? $value : null;
    }

    private static function matches(mixed $value, User $user, string $purpose): bool
    {
        return is_array($value)
            && (int) ($value['user_id'] ?? 0) === (int) $user->id
            && ($value['purpose'] ?? null) === $purpose
            && (int) ($value['until'] ?? 0) > time();
    }

    private static function key(string $token): string
    {
        return 'reauth_token:' . sha1($token);
    }

    private static function usedKey(string $token): string
    {
        return 'reauth_token_used:' . sha1($token);
    }
}
