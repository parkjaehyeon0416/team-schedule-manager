<?php

namespace App\Services;

use App\Constants\ErrorCode;
use App\Http\Responses\ApiResponse;
use Illuminate\Support\Facades\Cache;

/**
 * ★ v18.63 — 인증번호 공용 처리(문자: 아이디·비밀번호 찾기 / 이메일: 회원 탈퇴)
 *   - 유효 시간 3분
 *   - 5번 틀리면 그 번호는 폐기 + 5분 동안 새 요청·확인 모두 막힘
 *   캐시(실서버는 DB 캐시)에 저장 — target은 전화번호 또는 이메일.
 */
class VerificationCode
{
    public const TTL_MINUTES  = 3;
    public const MAX_FAILS    = 5;
    public const LOCK_MINUTES = 5;

    /** 잠겨 있으면 안내 에러 응답, 아니면 null */
    public static function lockedResponse(string $purpose, string $target)
    {
        $until = Cache::get(self::key('lock', $purpose, $target));
        if (!$until || $until <= time()) {
            return null;
        }
        $min = max(1, (int) ceil(($until - time()) / 60));
        return ApiResponse::error(
            "인증번호를 5번 틀려서 잠시 막혔어요. {$min}분 뒤에 다시 시도해주세요.",
            ErrorCode::AUTH_CODE_LOCKED,
            429
        );
    }

    /** 새 번호 발급(이전 번호·틀린 횟수는 초기화). 발급한 6자리 번호를 돌려줌 */
    public static function issue(string $purpose, string $target, ?string $payload = null): string
    {
        $code = (string) random_int(100000, 999999);
        Cache::put(self::key('code', $purpose, $target), ['code' => $code, 'payload' => $payload], now()->addMinutes(self::TTL_MINUTES));
        Cache::forget(self::key('fail', $purpose, $target));
        return $code;
    }

    /**
     * 번호 확인. 맞으면 발급 때 넣은 payload(없으면 빈 문자열), 틀리거나 만료면 null.
     * 5번째로 틀리면 번호를 지우고 5분 잠금.
     */
    public static function consume(string $purpose, string $target, string $code): ?string
    {
        $record = Cache::get(self::key('code', $purpose, $target));
        if (!is_array($record)) {
            return null;
        }

        if (!hash_equals((string) $record['code'], $code)) {
            $failKey = self::key('fail', $purpose, $target);
            Cache::add($failKey, 0, now()->addMinutes(self::TTL_MINUTES + self::LOCK_MINUTES)); // DB 캐시는 없는 키를 increment 못 함
            if ((int) Cache::increment($failKey) >= self::MAX_FAILS) {
                Cache::forget(self::key('code', $purpose, $target));
                Cache::forget($failKey);
                Cache::put(self::key('lock', $purpose, $target), time() + self::LOCK_MINUTES * 60, now()->addMinutes(self::LOCK_MINUTES));
            }
            return null;
        }

        Cache::forget(self::key('code', $purpose, $target));
        Cache::forget(self::key('fail', $purpose, $target));
        return (string) ($record['payload'] ?? '');
    }

    private static function key(string $kind, string $purpose, string $target): string
    {
        return "vcode_{$kind}:{$purpose}:" . sha1(mb_strtolower(trim($target)));
    }
}
