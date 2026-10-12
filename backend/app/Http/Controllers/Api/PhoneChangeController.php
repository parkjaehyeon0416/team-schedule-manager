<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\BusinessCard;
use App\Models\User;
use App\Services\Reauth;
use App\Services\Sms\SmsServiceInterface;
use App\Services\SocialAuthService;
use App\Services\VerificationCode;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * ★ v18.66 — 휴대폰 번호 변경(없던 번호 등록 포함)은 인증을 거쳐야 함 (디자인: 프로필 설정 › 휴대폰 번호 [변경])
 *
 * 전화번호는 탈퇴·처음 비밀번호 설정 전 문자 본인 확인(Reauth)에 쓰임. 예전엔 PUT /profile로 그냥 바뀌어서,
 * 잠금 풀린 폰을 잠깐 쥔 사람이 자기 번호로 바꿔 두고 문자 인증을 통과할 수 있었음(계정 탈취).
 * 이제 둘 다 통과해야 저장:
 *   ① 지금 계정 주인 확인 — 비밀번호(있으면) / 없으면 지금 전화번호·이메일 인증번호(Reauth, 둘 다 없으면 소셜 다시 로그인)
 *   ② 새 번호로 보낸 6자리 문자 인증번호(VerificationCode: 3분, 5번 틀리면 5분 잠금)
 * 한쪽만 틀렸을 때 다른 쪽을 처음부터 다시 받지 않게:
 *   - ②를 먼저 확인 → ②가 틀리면 ①의 인증번호는 손대지 않음
 *   - ②가 맞으면 10분 동안 "통과" 기록(같은 번호 + 같은 인증번호로 다시 보내면 통과) → ①만 고쳐서 다시 보내면 됨
 * ★ v18.66 리뷰 반영:
 *   - 비밀번호 없는 사용자는 ①을 연결된 소셜 계정 다시 로그인으로도 통과 가능(지금 번호를 잃어버린 경우 —
 *     번호를 바꾸는 가장 흔한 이유. 실서버는 메일 발송 전이라 이메일 선택지도 없음). Reauth 공용 동작은 그대로 둠.
 *   - ② 새 번호 문자는 아무 번호로나 갈 수 있어서 같은 번호 다시 받기 60초 대기 + 하루 상한(계정 10통, 번호 5통)
 */
class PhoneChangeController extends Controller
{
    private const REAUTH_PURPOSE    = 'change_phone'; // ① 지금 번호·이메일로 보내는 본인 확인 인증번호
    private const NEW_PHONE_PURPOSE = 'new_phone';    // ② 새 번호로 보내는 인증번호
    private const PASSED_MINUTES    = 10;             // ② 통과 기록 유지 시간
    private const RESEND_SECONDS    = 60;             // ★ v18.66 같은 번호로 다시 받기까지 기다리는 시간(계정 상관없이 번호 기준)
    private const DAILY_PER_USER    = 10;             // ★ v18.66 한 계정이 하루에 받을 수 있는 새 번호 인증 문자
    private const DAILY_PER_PHONE   = 5;              // ★ v18.66 한 번호로 하루에 보내는 새 번호 인증 문자(여러 계정 합산)

    public function __construct(private readonly SmsServiceInterface $sms)
    {
    }

    // ① 본인 확인 방법 안내 + 인증번호 발송
    // POST /api/profile/phone/reauth  {send?: bool, channel?: phone|email}
    //   - 비밀번호 있음 → method=password (앱이 비밀번호 입력칸)
    //   - 비밀번호 없음 → method=code(문자·이메일 중 선택) 또는 social(둘 다 없으면 소셜 다시 로그인)
    //     ★ v18.66 providers는 method=code여도 항상 내려줌(지금 번호를 못 쓰면 소셜 다시 로그인으로 확인)
    public function reauth(Request $request)
    {
        $user = $request->user();
        if ($user->password) {
            return ApiResponse::success(['method' => 'password', 'channels' => [], 'providers' => [], 'minutes' => VerificationCode::TTL_MINUTES]);
        }
        // send=true일 때만 발송(화면을 열기만 해선 안 보냄)
        if ($request->boolean('send')) {
            if ($fail = Reauth::send(self::REAUTH_PURPOSE, '휴대폰 번호 변경', (string) $request->input('channel'), $user, $this->sms)) {
                return $fail;
            }
            return ApiResponse::success($this->reauthInfo($user), '인증번호를 보냈어요.');
        }
        return ApiResponse::success($this->reauthInfo($user), '본인 확인 방법을 알려드려요.');
    }

    // ② 새 번호로 인증번호 발송
    // POST /api/profile/phone/code  {phone}
    public function sendCode(Request $request)
    {
        $user = $request->user();
        [$phone, $fail] = $this->checkNewPhone($request->input('phone'), $user);
        if ($fail) {
            return $fail;
        }
        if ($locked = VerificationCode::lockedResponse(self::NEW_PHONE_PURPOSE, $phone)) {
            return $this->withField($locked, 'phone');
        }

        // ★ v18.66 발송 제한 — 아직 가입 안 된 아무 번호로나 보낼 수 있어서(문자 괴롭히기·문자 요금 소모 방지)
        //   하루 상한(계정·번호) 먼저 → 같은 번호 60초 대기(Cache::add로 동시 요청도 하나만 통과)
        $day = now()->format('Ymd');
        $userKey = "new_phone_daily_user:{$user->id}:{$day}";
        $phoneKey = 'new_phone_daily_phone:' . sha1($phone) . ":{$day}";
        if ((int) Cache::get($userKey, 0) >= self::DAILY_PER_USER || (int) Cache::get($phoneKey, 0) >= self::DAILY_PER_PHONE) {
            return $this->fail('오늘은 인증번호를 더 받을 수 없어요. 내일 다시 시도해주세요.', ErrorCode::TOO_MANY_REQUESTS, 429, 'phone');
        }
        $coolKey = 'new_phone_cooldown:' . sha1($phone);
        if (!Cache::add($coolKey, time() + self::RESEND_SECONDS, self::RESEND_SECONDS)) {
            $left = max(1, (int) Cache::get($coolKey, 0) - time());
            return $this->fail("{$left}초 뒤에 다시 받아주세요.", ErrorCode::TOO_MANY_REQUESTS, 429, 'phone', ['retry_after' => $left]);
        }
        foreach ([$userKey, $phoneKey] as $key) {
            Cache::add($key, 0, now()->endOfDay()); // DB 캐시는 없는 키를 increment 못 함
            Cache::increment($key);
        }

        // payload에 사용자 id — 이 계정에서 요청한 인증번호만 이 계정 변경에 쓰이게
        $code = VerificationCode::issue(self::NEW_PHONE_PURPOSE, $phone, (string) $user->id);
        try {
            $this->sms->send($phone, "[현장메이트] 휴대폰 번호 변경 인증번호는 {$code} 입니다. (" . VerificationCode::TTL_MINUTES . "분간 유효)");
        } catch (\Throwable $e) {
            Log::error('새 휴대폰 번호 인증번호 발송 실패', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            Cache::forget($coolKey); // 안 나갔으니 바로 다시 시도할 수 있게(하루 상한 횟수는 그대로 셈)
            return $this->fail('인증번호를 보내지 못했어요. 번호를 확인하거나 잠시 후 다시 시도해주세요.', ErrorCode::SERVER_ERROR, 503, 'phone');
        }

        // resend_after: 앱이 [다시 받기]에 남은 시간 표시
        return ApiResponse::success(['minutes' => VerificationCode::TTL_MINUTES, 'resend_after' => self::RESEND_SECONDS], '인증번호를 보냈어요.');
    }

    // 저장 — ①②를 같은 요청에서 모두 통과해야 바뀜
    // PUT /api/profile/phone  {phone, phone_code, password? | channel+code? | provider+token?}
    public function update(Request $request)
    {
        $user = $request->user();
        [$phone, $fail] = $this->checkNewPhone($request->input('phone'), $user);
        if ($fail) {
            return $fail;
        }

        // ② 새 번호 인증번호 먼저 — 틀리면 여기서 끝(①의 인증번호는 그대로 남음)
        if ($fail = $this->checkNewPhoneCode($user, $phone, (string) $request->input('phone_code'))) {
            return $fail;
        }

        // ① 계정 주인 확인 — 틀려도 ②는 통과 기록이 남아서 ①만 고쳐 다시 보내면 됨
        if ($user->password) {
            if (!Hash::check((string) $request->input('password'), $user->password)) {
                return ApiResponse::error('현재 비밀번호가 맞지 않아요.', ErrorCode::AUTH_LOGIN_FAILED, 422);
            }
        } elseif ($request->filled('provider')) {
            // ★ v18.66 소셜 다시 로그인 — 문자·이메일 수단이 있어도 받음(지금 번호를 못 쓰는 경우)
            if ($fail = $this->checkSocial($user, (string) $request->input('provider'), (string) $request->input('token'))) {
                return $fail;
            }
        } elseif ($fail = Reauth::check(self::REAUTH_PURPOSE, $user, $request->only('channel', 'code', 'provider', 'token'))) {
            return $fail;
        }

        $old = $user->phone;
        try {
            DB::transaction(function () use ($user, $phone, $old) {
                $user->forceFill(['phone' => $phone])->save();
                // 명함 연락처가 옛 번호 그대로면 같이 바꿈(프로필 설정 저장 때도 명함 연락처 = 휴대폰 번호로 저장됨)
                if ($old) {
                    BusinessCard::where('user_id', $user->id)
                        ->whereIn('contact_phone', $this->variants($old))
                        ->update(['contact_phone' => $phone]);
                }
            });
        } catch (UniqueConstraintViolationException $e) {
            // 확인과 저장 사이에 다른 계정이 같은 번호를 먼저 등록한 경우
            return $this->fail('이미 다른 계정에서 쓰는 전화번호예요.', ErrorCode::VALID_GENERAL, 422, 'phone');
        }
        Cache::forget($this->passedKey($user));

        return ApiResponse::success($user->fresh(), '휴대폰 번호를 변경했어요.');
    }

    /**
     * 새 번호 검사(숫자만 남겨서). [번호, null] 또는 [null, 에러 응답]
     */
    private function checkNewPhone($raw, User $user): array
    {
        $phone = preg_replace('/\D/', '', (string) $raw);
        if (!preg_match('/^01[016789]\d{7,8}$/', $phone)) {
            return [null, $this->fail('휴대폰 번호를 정확히 입력해주세요.', ErrorCode::VALID_GENERAL, 422, 'phone')];
        }
        if ($phone === preg_replace('/\D/', '', (string) $user->phone)) {
            return [null, $this->fail('지금 쓰는 번호와 같아요.', ErrorCode::VALID_GENERAL, 422, 'phone')];
        }
        // 탈퇴 계정은 번호를 지우므로 남아 있는 번호는 모두 "쓰는 중"(DB 고유값도 탈퇴 계정 포함)
        $taken = User::withTrashed()
            ->whereIn('phone', $this->variants($phone))
            ->where('id', '!=', $user->id)
            ->exists();
        if ($taken) {
            return [null, $this->fail('이미 다른 계정에서 쓰는 전화번호예요.', ErrorCode::VALID_GENERAL, 422, 'phone')];
        }
        return [$phone, null];
    }

    /**
     * ② 새 번호 인증번호 확인. 통과하면 null, 아니면 에러 응답(errors.phone_code).
     */
    private function checkNewPhoneCode(User $user, string $phone, string $code): ?JsonResponse
    {
        $passed = Cache::get($this->passedKey($user));
        if (is_array($passed) && $passed['phone'] === $phone && hash_equals($passed['hash'], hash('sha256', $code))) {
            return null; // 직전 요청에서 이미 맞힌 번호(①만 틀렸던 경우)
        }

        if ($locked = VerificationCode::lockedResponse(self::NEW_PHONE_PURPOSE, $phone)) {
            return $this->withField($locked, 'phone_code');
        }
        if (strlen($code) !== 6 || VerificationCode::consume(self::NEW_PHONE_PURPOSE, $phone, $code) !== (string) $user->id) {
            $locked = VerificationCode::lockedResponse(self::NEW_PHONE_PURPOSE, $phone);
            return $locked
                ? $this->withField($locked, 'phone_code')
                : $this->fail('인증번호가 올바르지 않거나 만료되었습니다.', ErrorCode::AUTH_CODE_INVALID, 422, 'phone_code');
        }

        Cache::put($this->passedKey($user), ['phone' => $phone, 'hash' => hash('sha256', $code)], now()->addMinutes(self::PASSED_MINUTES));
        return null;
    }

    private function passedKey(User $user): string
    {
        return "phone_change_passed:{$user->id}";
    }

    /** ★ v18.66 Reauth::info + 연결된 소셜 계정 목록(method=code여도) — 지금 번호를 잃어버렸을 때 대안 */
    private function reauthInfo(User $user): array
    {
        $info = Reauth::info($user);
        $info['providers'] = $this->linkedProviders($user);
        return $info;
    }

    private function linkedProviders(User $user): array
    {
        return array_values(array_filter(
            SocialAuthService::PROVIDERS,
            fn($p) => !empty($user->{SocialAuthService::column($p)})
        ));
    }

    /** ★ v18.66 연결된 소셜 계정으로 다시 로그인했는지(토큰을 소셜 서버에서 확인 + 이 계정에 연결된 id인지). 통과하면 null */
    private function checkSocial(User $user, string $provider, string $token): ?JsonResponse
    {
        $profile = in_array($provider, $this->linkedProviders($user), true) && $token !== ''
            ? SocialAuthService::verify($provider, $token)
            : null;
        if (!$profile || (string) $user->{SocialAuthService::column($provider)} !== (string) $profile['id']) {
            return ApiResponse::error('이 계정에 연결된 소셜 계정으로 다시 로그인해주세요.', ErrorCode::AUTH_REAUTH_REQUIRED, 422);
        }
        return null;
    }

    /** 01012345678 → [01012345678, 010-1234-5678] (예전에 하이픈 넣어 저장된 번호도 같은 번호로 봄) */
    private function variants(string $phone): array
    {
        $d = preg_replace('/\D/', '', $phone);
        $dashed = strlen($d) === 11
            ? substr($d, 0, 3) . '-' . substr($d, 3, 4) . '-' . substr($d, 7)
            : substr($d, 0, 3) . '-' . substr($d, 3, 3) . '-' . substr($d, 6);
        return array_values(array_unique([$d, $dashed, $phone]));
    }

    /** 에러 응답 + 어느 칸 에러인지(errors.{field}) — 앱이 ①/② 중 어디에 띄울지 구분. ★ v18.66 $data: 다시 받기 남은 초(retry_after) 등 */
    private function fail(string $message, string $code, int $status, string $field, ?array $data = null): JsonResponse
    {
        return response()->json(array_filter([
            'success'    => false,
            'message'    => $message,
            'error_code' => $code,
            'errors'     => [$field => [$message]],
            'data'       => $data,
        ], fn($v) => $v !== null), $status);
    }

    private function withField(JsonResponse $response, string $field): JsonResponse
    {
        $body = $response->getData(true);
        return $this->fail($body['message'] ?? '잠시 후 다시 시도해주세요.', $body['error_code'] ?? '', $response->getStatusCode(), $field);
    }
}
