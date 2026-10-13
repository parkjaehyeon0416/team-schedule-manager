<?php

namespace App\Services;

use App\Constants\ErrorCode;
use App\Http\Responses\ApiResponse;
use Illuminate\Support\Facades\Cache;

/**
 * ★ v18.63 — 인증번호 공용 처리(문자: 아이디·비밀번호 찾기 / 이메일: 회원 탈퇴)
 *   - 유효 시간 3분
 *   캐시(실서버는 DB 캐시)에 저장 — target은 전화번호 또는 이메일.
 *
 * ★ v18.67 보안 — 틀린 횟수를 "대상(번호·이메일)+용도" 기준으로 1시간 동안 쌓음.
 *   예전엔 새 번호를 받을 때마다(issue) 틀린 횟수가 0으로 돌아가서, 4번 틀리고 새로 받기를 반복하면
 *   잠금이 끝내 안 걸렸음(IP만 바꾸면 무한 대입 → 아이디 찾기·비밀번호 재설정으로 계정 탈취).
 *   이제 틀린 횟수는 새로 받아도 그대로 남고, 맞혔을 때만 지움:
 *     - 누적 5번째로 틀림 → 지금 번호 폐기 + 5분 잠금 (예전 "번호 하나당 5번 → 5분"과 같거나 더 엄격:
 *       새로 받은 번호는 남은 횟수만큼만 시도 가능)
 *     - 누적 10번째로 틀림(1시간 안) → 번호 폐기 + 1시간 잠금
 *   → 한 대상에 1시간에 최대 10번만 맞혀 볼 수 있음(IP를 몇 개 쓰든 같음).
 *   잠금은 길어야 1시간이라 남이 일부러 틀려서 주인을 영영 못 쓰게 만들 수는 없음.
 *   전화번호는 숫자만 남겨서 셈(010-1234-5678과 01012345678은 같은 대상, 보이지 않는 글자를 끼워도 같은 대상).
 */
class VerificationCode
{
    public const TTL_MINUTES       = 3;
    public const MAX_FAILS         = 5;  // 누적 5번(·10번…)째 틀릴 때마다 번호 폐기 + 짧은 잠금
    public const LOCK_MINUTES      = 5;
    public const WINDOW_FAILS      = 10; // ★ v18.67 1시간 안에 누적 10번 틀리면 긴 잠금
    public const WINDOW_MINUTES    = 60; // ★ v18.67 틀린 횟수를 쌓는 기간(첫 번째로 틀린 때부터)
    public const LONG_LOCK_MINUTES = 60; // ★ v18.67 긴 잠금 시간

    /** 잠겨 있으면 안내 에러 응답, 아니면 null */
    public static function lockedResponse(string $purpose, string $target)
    {
        $lock = self::lockInfo($purpose, $target);
        if (!$lock) {
            return null;
        }
        $min = max(1, (int) ceil(($lock['until'] - time()) / 60));
        return ApiResponse::error(
            "인증번호를 {$lock['fails']}번 틀려서 잠시 막혔어요. {$min}분 뒤에 다시 시도해주세요.",
            ErrorCode::AUTH_CODE_LOCKED,
            429
        );
    }

    /** ★ v18.67 잠겨 있는지만 확인 */
    public static function isLocked(string $purpose, string $target): bool
    {
        return self::lockInfo($purpose, $target) !== null;
    }

    /**
     * 새 번호 발급 + 저장. 발급한 6자리 번호를 돌려줌.
     * ★ v18.67 틀린 횟수는 초기화하지 않음(맞혔을 때만 초기화).
     *   발송이 필요한 곳은 SmsGuard::sendCode()를 씀 — 보내기에 성공한 뒤에만 저장(generate → 발송 → store).
     */
    public static function issue(string $purpose, string $target, ?string $payload = null): string
    {
        $code = self::generate();
        self::store($purpose, $target, $code, $payload);
        return $code;
    }

    /** ★ v18.67 6자리 번호 만들기(저장 안 함) */
    public static function generate(): string
    {
        return (string) random_int(100000, 999999);
    }

    /** ★ v18.67 번호 저장(이전 번호는 덮어씀). 틀린 횟수·잠금은 건드리지 않음 */
    public static function store(string $purpose, string $target, string $code, ?string $payload = null): void
    {
        Cache::put(self::key('code', $purpose, $target), ['code' => $code, 'payload' => $payload], now()->addMinutes(self::TTL_MINUTES));
    }

    /**
     * 번호 확인. 맞으면 발급 때 넣은 payload(없으면 빈 문자열), 틀리거나 만료면 null.
     * ★ v18.67 틀린 횟수는 대상+용도별로 1시간 누적 — 5번째에 번호 폐기 + 5분 잠금, 10번째에 1시간 잠금.
     */
    public static function consume(string $purpose, string $target, string $code): ?string
    {
        if (self::isLocked($purpose, $target)) {
            return null; // 잠금 중엔 맞는 번호도 안 받음(호출하는 곳에서 먼저 막지만 한 번 더)
        }
        $record = Cache::get(self::key('code', $purpose, $target));
        if (!is_array($record)) {
            return null;
        }

        if (!hash_equals((string) $record['code'], $code)) {
            $failKey = self::key('fail', $purpose, $target);
            Cache::add($failKey, 0, now()->addMinutes(self::WINDOW_MINUTES)); // DB 캐시는 없는 키를 increment 못 함
            $fails = (int) Cache::increment($failKey);
            if ($fails >= self::WINDOW_FAILS) {
                Cache::forget(self::key('code', $purpose, $target));
                Cache::forget($failKey); // 긴 잠금이 끝나면 처음부터 다시 셈
                self::lock($purpose, $target, self::LONG_LOCK_MINUTES, $fails);
            } elseif ($fails % self::MAX_FAILS === 0) {
                Cache::forget(self::key('code', $purpose, $target));
                self::lock($purpose, $target, self::LOCK_MINUTES, $fails); // 틀린 횟수는 그대로 남김
            }
            return null;
        }

        Cache::forget(self::key('code', $purpose, $target));
        Cache::forget(self::key('fail', $purpose, $target));
        return (string) ($record['payload'] ?? '');
    }

    private static function lock(string $purpose, string $target, int $minutes, int $fails): void
    {
        Cache::put(
            self::key('lock', $purpose, $target),
            ['until' => time() + $minutes * 60, 'fails' => $fails],
            now()->addMinutes($minutes)
        );
    }

    /** @return array{until:int,fails:int}|null */
    private static function lockInfo(string $purpose, string $target): ?array
    {
        $raw = Cache::get(self::key('lock', $purpose, $target));
        // v18.66까지는 잠금 끝나는 시각(정수)만 저장했음 — 배포 직후 남아 있는 값도 읽음
        $lock = is_array($raw) ? $raw : ($raw ? ['until' => (int) $raw, 'fails' => self::MAX_FAILS] : null);
        if (!$lock || (int) ($lock['until'] ?? 0) <= time()) {
            return null;
        }
        return ['until' => (int) $lock['until'], 'fails' => (int) ($lock['fails'] ?? self::MAX_FAILS)];
    }

    /**
     * ★ v18.67 대상 정규화 — '@'가 없으면 전화번호로 보고 숫자만 남김(문자 서비스 SOLAPI가 실제로 보내는 번호와 같게),
     *   이메일은 공백·보이지 않는 글자를 지우고 소문자.
     *   (리뷰 반영) 예전엔 "숫자와 일부 기호로만 된 문자열"만 숫자로 줄여서, 가운데에 보이지 않는 글자(예: U+200C)를 끼운
     *   번호는 그대로 남았음 → DB에선 같은 계정·같은 휴대폰인데(utf8mb4_unicode_ci가 그 글자를 무시) 틀린 횟수·잠금·
     *   인증번호가 입력 모양마다 따로 생겨 "대상별 1시간 10번" 잠금을 피할 수 있었음. 이제 무엇이 섞여도 숫자만 남김.
     *   (부르는 곳도 입력 대신 DB에서 찾은 번호로 키를 만듦 — AuthController 아이디·비밀번호 찾기)
     */
    public static function normalizeTarget(string $target): string
    {
        if (!str_contains($target, '@')) {
            return preg_replace('/\D/', '', $target); // 바이트 단위 — ASCII 숫자 0~9만 남음(전각 숫자 등도 지움)
        }
        $t = preg_replace('/[\p{C}\p{Z}\s]+/u', '', $target) ?? trim($target); // UTF-8이 깨진 값이면 앞뒤 공백만 지움
        return mb_strtolower($t);
    }

    private static function key(string $kind, string $purpose, string $target): string
    {
        return "vcode_{$kind}:{$purpose}:" . sha1(self::normalizeTarget($target));
    }
}
