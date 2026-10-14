<?php

namespace App\Services;

use App\Constants\ErrorCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * ★ v18.67 — 인증번호(문자·이메일) 발송 공용 관문. 인증번호를 보내는 모든 곳이 이걸 거침:
 *   아이디 찾기(find_email) · 비밀번호 재설정(reset_password) · 본인 확인 Reauth(withdraw / set_password / change_phone)
 *   · 새 번호 인증(new_phone) · ★ v18.68 회원가입 휴대폰 인증(signup)
 *
 * 왜: 예전엔 새 번호 인증에만 대기·하루 상한이 있어서, 아이디·비밀번호 찾기로 남의 번호에 문자 폭탄(IP당 하루 7,200통),
 *   새 계정을 계속 만들어 아무 번호로나 새 번호 인증 문자, 본인 확인 메일로 Gmail 하루 한도 소진이 가능했음.
 *
 * 제한(숫자는 config/verification.php):
 *   1) 요청 단위 checkRequest() — 계정이 있든 없든 매 요청 부름(응답 차이로 가입 여부가 드러나지 않게)
 *      - 서비스 전체 하루 상한(문자 500·메일 400)이 이미 찼으면 429 + 경고 로그
 *      - IP별 하루 요청 수(20)
 *   2) 대상 단위 sendCode() — 실제로 보낼 때
 *      - 같은 대상+용도 60초 대기(Cache::add라 동시 요청도 하나만 통과)
 *      - 서비스 전체 하루 상한(문자·메일, 새 번호 인증 200·회원가입 200은 따로 + 둘은 전체에서 예약분 100을 뺀 데까지만) / 계정별 하루(10) / 대상별 하루(10, 용도 합산) / 대상+용도별 하루(5)
 *      - 보내기에 성공한 뒤에만 인증번호 저장 — 발송이 실패하면 번호도 안 남고 센 횟수도 되돌림
 *        (예전엔 저장 후 발송이라, 문자 잔액이 떨어져도 번호가 계속 새로 생겨 조용히 대입할 수 있었음)
 */
class SmsGuard
{
    public const SMS   = 'sms';
    public const EMAIL = 'email';

    /**
     * 요청 단위 검사 — 서비스 전체 상한이 찼는지 + IP 하루 요청 수(요청마다 1 증가).
     * 통과하면 null, 막히면 429 응답.
     */
    public static function checkRequest(string $channel, ?string $purpose = null): ?JsonResponse
    {
        $day = self::day();

        // 서비스 전체 상한 — 이미 찼으면 계정 유무와 상관없이 모두 429
        $global = self::globalLimits($channel, $purpose, $day);
        foreach ($global as [$key, $limit, $label]) {
            if ((int) Cache::get($key, 0) >= $limit) {
                self::warnOnce("full:{$label}", "[인증번호 발송 상한] 오늘 {$label} 상한({$limit}통)이 다 차서 발송을 막는 중", ['label' => $label, 'limit' => $limit]);
                return self::error('global');
            }
        }

        // IP별 하루 요청 수
        $ip = (string) (request()?->ip() ?? 'unknown');
        $ipKey = 'vguard_ip:' . sha1($ip) . ":{$day}";
        Cache::add($ipKey, 0, now()->endOfDay()); // DB 캐시는 없는 키를 increment 못 함
        if ((int) Cache::increment($ipKey) > (int) config('verification.per_ip_daily', 20)) {
            return self::error('ip');
        }
        return null;
    }

    /**
     * 대상 단위 검사 + 발송 + (성공하면) 인증번호 저장.
     *
     * @param  string        $channel  sms | email
     * @param  string        $purpose  find_email | reset_password | withdraw | set_password | change_phone | new_phone
     * @param  string        $target   전화번호 또는 이메일
     * @param  int|null      $userId   로그인한 계정(없으면 null — 아이디·비밀번호 찾기)
     * @param  callable      $send     fn(string $code): void — 실제 발송(실패하면 예외)
     * @param  string|null   $payload  VerificationCode에 같이 저장할 값
     * @return JsonResponse|null  null=보냄 / 429=제한(data.reason, 대기면 data.retry_after) / 503=발송 실패
     */
    public static function sendCode(string $channel, string $purpose, string $target, ?int $userId, callable $send, ?string $payload = null): ?JsonResponse
    {
        $day = self::day();
        $hash = sha1(self::targetKey($channel, $target));
        $resend = max(1, (int) config('verification.resend_seconds', 60));

        // 1) 같은 대상+용도 다시 받기 대기 (v18.66 새 번호 인증과 같은 키 모양)
        $coolKey = "{$purpose}_cooldown:{$hash}";
        if (!Cache::add($coolKey, time() + $resend, $resend)) {
            $left = max(1, (int) Cache::get($coolKey, 0) - time());
            return self::error('cooldown', ['retry_after' => min($left, $resend)]);
        }

        // 2) 하루 상한 — 먼저 올려 보고(동시 요청도 정확히 셈) 넘으면 되돌림
        $counters = [];
        foreach (self::globalLimits($channel, $purpose, $day) as [$key, $limit, $label]) {
            $counters[] = [$key, $limit, 'global', $label];
        }
        if ($userId) {
            $counters[] = ["vguard_user:{$userId}:{$day}", (int) config('verification.per_user_daily', 10), 'daily', null];
        }
        $counters[] = ["vguard_target:{$hash}:{$day}", (int) config('verification.per_target_daily', 10), 'daily', null];
        $counters[] = ["vguard_target:{$purpose}:{$hash}:{$day}", (int) config('verification.per_target_purpose_daily', 5), 'daily', null];

        $taken = [];
        foreach ($counters as [$key, $limit, $reason, $label]) {
            Cache::add($key, 0, now()->endOfDay());
            $n = (int) Cache::increment($key);
            $taken[] = $key;
            if ($n > $limit) {
                self::release($taken, $coolKey);
                if ($reason === 'global') {
                    self::warnOnce("full:{$label}", "[인증번호 발송 상한] 오늘 {$label} 상한({$limit}통)이 다 차서 발송을 막는 중", ['label' => $label, 'limit' => $limit]);
                }
                return self::error($reason);
            }
            if ($reason === 'global' && $n >= (int) ceil($limit * (float) config('verification.warn_ratio', 0.8))) {
                self::warnOnce("near:{$label}", "[인증번호 발송 상한] 오늘 {$label}이 상한({$limit}통)의 " . (int) round((float) config('verification.warn_ratio', 0.8) * 100) . '%를 넘음', ['label' => $label, 'count' => $n, 'limit' => $limit]);
            }
        }

        // 3) 발송 → 성공해야 저장
        $code = VerificationCode::generate();
        try {
            $send($code);
        } catch (\Throwable $e) {
            self::release($taken, $coolKey); // 안 나갔으니 바로 다시 시도할 수 있게, 센 횟수도 되돌림
            Log::error('인증번호 발송 실패', ['purpose' => $purpose, 'channel' => $channel, 'user_id' => $userId, 'error' => $e->getMessage()]);
            return self::error('send_failed');
        }
        VerificationCode::store($purpose, $target, $code, $payload);
        return null;
    }

    /** 다시 받기까지 기다리는 초(앱 표시용) */
    public static function resendSeconds(): int
    {
        return max(1, (int) config('verification.resend_seconds', 60));
    }

    // ─── 내부 ───

    /**
     * ★ v18.67 (리뷰 반영) 대기·하루 상한을 세는 대상 키.
     *   문자는 숫자만 남긴 번호 = SOLAPI가 실제로 보내는 번호. 입력에 보이지 않는 글자나 기호를 섞어도 같은 휴대폰이면
     *   같은 키라서 60초 대기·하루 5통·10통이 새로 시작되지 않음(예전엔 입력 모양마다 따로 셌음).
     *   메일은 VerificationCode와 같은 정규화(공백·보이지 않는 글자 제거 + 소문자).
     */
    private static function targetKey(string $channel, string $target): string
    {
        return $channel === self::SMS
            ? preg_replace('/\D/', '', $target)
            : VerificationCode::normalizeTarget($target);
    }

    /** @return array<int, array{0:string,1:int,2:string}> [키, 상한, 이름] */
    private static function globalLimits(string $channel, ?string $purpose, string $day): array
    {
        $limits = $channel === self::EMAIL
            ? [["vguard_global:email:{$day}", (int) config('verification.global_email_daily', 400), '서비스 전체 인증 메일']]
            : [["vguard_global:sms:{$day}", (int) config('verification.global_sms_daily', 500), '서비스 전체 인증 문자']];
        $per = config("verification.global_purpose_daily.{$purpose}");
        if ($purpose && $per !== null) {
            // ★ v18.68 따로 묶은 용도(새 번호·회원가입 — 아무 번호로나 보낼 수 있음)는 서비스 전체 상한에서 예약분을 뺀 데까지만.
            //   용도별 상한을 합치면 전체 상한에 닿아도(env를 올려도) 아이디·비밀번호 찾기·본인 확인 몫은 항상 남음
            $reserve = max(0, (int) config('verification.global_reserved_daily', 100));
            $limits[0][1] = max(0, $limits[0][1] - $reserve);
            $limits[0][2] .= '(예약분 제외)';
            $limits[] = ["vguard_global_purpose:{$purpose}:{$day}", (int) $per, "서비스 전체 {$purpose} 인증"];
        }
        return $limits;
    }

    private static function release(array $keys, string $coolKey): void
    {
        foreach ($keys as $key) {
            Cache::decrement($key);
        }
        Cache::forget($coolKey);
    }

    private static function warnOnce(string $what, string $message, array $context): void
    {
        if (Cache::add('vguard_warned:' . sha1($what) . ':' . self::day(), 1, now()->endOfDay())) {
            Log::warning($message, $context);
        }
    }

    private static function error(string $reason, array $data = []): JsonResponse
    {
        [$message, $code, $status] = match ($reason) {
            'cooldown'    => [($data['retry_after'] ?? 60) . '초 뒤에 다시 받아주세요.', ErrorCode::TOO_MANY_REQUESTS, 429],
            'daily'       => ['오늘은 인증번호를 더 받을 수 없어요. 내일 다시 시도해주세요.', ErrorCode::TOO_MANY_REQUESTS, 429],
            'ip'          => ['오늘은 인증번호 요청이 너무 많아요. 내일 다시 시도해주세요.', ErrorCode::TOO_MANY_REQUESTS, 429],
            'global'      => ['지금은 인증번호 요청이 많아 보낼 수 없어요. 잠시 후 다시 시도해주세요.', ErrorCode::TOO_MANY_REQUESTS, 429],
            default       => ['인증번호를 보내지 못했어요. 잠시 후 다시 시도해주세요.', ErrorCode::SERVER_ERROR, 503],
        };
        return response()->json([
            'success'    => false,
            'message'    => $message,
            'error_code' => $code,
            'data'       => ['reason' => $reason] + $data,
        ], $status);
    }

    private static function day(): string
    {
        return now()->format('Ymd');
    }
}
