<?php

namespace App\Services;

use App\Constants\ErrorCode;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Services\Sms\SmsServiceInterface;

/**
 * ★ v18.63 — 비밀번호 없는(소셜 가입) 사용자의 중요한 작업 전 본인 확인 공용 처리.
 *   회원 탈퇴, 처음 비밀번호 설정에 씀.
 *   - 전화번호(문자) 또는 진짜 이메일로 6자리 인증번호(VerificationCode: 3분, 5번 틀리면 5분 잠금 · ★ v18.67 1시간 10번이면 1시간 잠금)
 *   - ★ v18.67 발송은 SmsGuard로 제한(60초 대기·하루 상한·서비스 전체 상한)
 *   - 둘 다 없으면 연결된 소셜 계정으로 다시 로그인(provider + token)
 * ★ v18.68 로그인 연결 관리(용도 login_link)는 비밀번호로도 확인 — checkPassword(): 틀린 횟수를 인증번호와 똑같이
 *   VerificationCode 잠금으로 셈(용도 reauth_pw, 대상 user:{id}). 통과하면 ReauthToken(10분, 한 번)을 줌.
 */
class Reauth
{
    public const PASSWORD_PURPOSE = 'reauth_pw'; // ★ v18.68 비밀번호 틀린 횟수·잠금 묶음 이름

    /** 인증번호를 받을 수 있는 곳 [phone => 가린 번호, email => 가린 이메일] */
    public static function channels(User $user): array
    {
        $ch = [];
        if ($user->phone) {
            $p = preg_replace('/\D/', '', $user->phone);
            $ch['phone'] = substr($p, 0, 3) . '-****-' . substr($p, -4);
        }
        // 메일 발송 설정(.env MAIL_MAILER=smtp 등)이 돼 있을 때만 이메일 선택지를 보여줌.
        //   log/array면 실제 메일이 안 나가는데 앱엔 "보냈어요"가 떠서 사용자가 기다리기만 하게 됨.
        if ($user->email && !str_ends_with($user->email, '@social.local') && self::mailReady()) {
            $ch['email'] = self::maskEmail($user->email);
        }
        return $ch;
    }

    /** 앱에 알려줄 확인 방법: code(문자·이메일) | social(소셜 재로그인) */
    public static function info(User $user): array
    {
        $channels = self::channels($user);
        return [
            'method'    => $channels ? 'code' : 'social',
            'channels'  => array_map(fn($type, $target) => ['type' => $type, 'target' => $target], array_keys($channels), $channels),
            'providers' => $channels ? [] : array_values(array_filter(
                SocialAuthService::PROVIDERS,
                fn($p) => !empty($user->{SocialAuthService::column($p)})
            )),
            'minutes'   => VerificationCode::TTL_MINUTES,
        ];
    }

    /**
     * 인증번호 발송. 실패하면 에러 응답, 성공하면 null
     * ★ v18.67 SmsGuard 거침 — 같은 곳 60초 대기, 하루 상한(대상·계정·IP), 서비스 전체 상한(문자·메일).
     *   보내기에 성공한 뒤에만 인증번호 저장(발송 실패 시 번호 안 남음).
     */
    public static function send(string $purpose, string $label, string $channel, User $user, SmsServiceInterface $sms)
    {
        if (!isset(self::channels($user)[$channel])) {
            return ApiResponse::error('선택할 수 없는 인증 방법입니다.', ErrorCode::AUTH_REAUTH_REQUIRED, 422);
        }
        $target = self::target($user, $channel);
        if ($locked = VerificationCode::lockedResponse($purpose, $target)) {
            return $locked;
        }
        $guardChannel = $channel === 'phone' ? SmsGuard::SMS : SmsGuard::EMAIL;
        if ($limited = SmsGuard::checkRequest($guardChannel, $purpose)) {
            return $limited;
        }
        $fail = SmsGuard::sendCode($guardChannel, $purpose, $target, $user->id, function (string $code) use ($channel, $target, $label, $sms) {
            if ($channel === 'phone') {
                $sms->send($target, "[현장메이트] {$label} 인증번호는 {$code} 입니다. (" . VerificationCode::TTL_MINUTES . "분간 유효)");
            } else {
                \Illuminate\Support\Facades\Mail::to($target)
                    ->send(new \App\Mail\VerificationCodeMail($code, $label, VerificationCode::TTL_MINUTES));
            }
        });
        if ($fail && $fail->getStatusCode() === 503) {
            // 발송 실패(문자 잔액·메일 서버 등) — 예전 응답 그대로(앱은 메시지만 보여 줌)
            return ApiResponse::error('인증번호를 보내지 못했어요. 다른 방법을 고르거나 잠시 후 다시 시도해주세요.', ErrorCode::AUTH_REAUTH_REQUIRED, 503);
        }
        return $fail;
    }

    /**
     * 본인 확인 검사. $data: {channel, code} 또는 {provider, token}. 통과하면 null, 아니면 에러 응답.
     */
    public static function check(string $purpose, User $user, array $data)
    {
        $channels = self::channels($user);

        if ($channels) {
            $channel = $data['channel'] ?? null;
            $code = (string) ($data['code'] ?? '');
            if (!isset($channels[$channel]) || strlen($code) !== 6) {
                return ApiResponse::error('본인 확인을 위해 인증번호를 입력해주세요.', ErrorCode::AUTH_REAUTH_REQUIRED, 422);
            }
            $target = self::target($user, $channel);
            if ($locked = VerificationCode::lockedResponse($purpose, $target)) {
                return $locked;
            }
            if (VerificationCode::consume($purpose, $target, $code) === null) {
                return VerificationCode::lockedResponse($purpose, $target)
                    ?? ApiResponse::error('인증번호가 올바르지 않거나 만료되었습니다.', ErrorCode::AUTH_CODE_INVALID, 422);
            }
            return null;
        }

        $provider = $data['provider'] ?? null;
        $profile = in_array($provider, SocialAuthService::PROVIDERS, true) && !empty($data['token'])
            ? SocialAuthService::verify($provider, $data['token'])
            : null;
        if (!$profile || $user->{SocialAuthService::column($provider)} !== $profile['id']) {
            return ApiResponse::error('이 계정에 연결된 소셜 계정으로 다시 로그인해주세요.', ErrorCode::AUTH_REAUTH_REQUIRED, 422);
        }
        return null;
    }

    /**
     * ★ v18.68 로그인 연결 관리 화면에 줄 본인 확인 정보.
     *   info()와 달리 비밀번호 유무를 같이 주고, providers는 연결된 소셜 전부(앱은 비밀번호·받을 곳이 둘 다 없을 때만 씀)
     */
    public static function loginLinkInfo(User $user): array
    {
        return [
            'has_password' => (bool) $user->password,
            'channels'     => self::info($user)['channels'],
            'providers'    => array_values(array_filter(
                SocialAuthService::PROVIDERS,
                fn($p) => !empty($user->{SocialAuthService::column($p)})
            )),
            'minutes'      => VerificationCode::TTL_MINUTES,
        ];
    }

    /**
     * ★ v18.68 비밀번호로 본인 확인. 통과하면 null, 아니면 에러 응답(비밀번호 없는 계정은 부르는 곳에서 먼저 막음).
     *   틀린 횟수는 인증번호와 같은 VerificationCode 잠금 — 1시간 안 누적 5번째 틀림 → 5분, 10번째 → 1시간 잠금(429 ERR_AUTH_017).
     *   잠긴 동안엔 맞는 비밀번호도 안 받음. 맞히면 틀린 횟수 지움.
     *   VerificationCode는 "저장된 번호와 비교"할 때만 횟수를 세고 지우므로, 고정된 표시값을 저장한 뒤
     *   틀렸으면 다른 값으로, 맞혔으면 같은 값으로 consume() — 잠금 규칙·키를 따로 만들지 않고 그대로 씀.
     *   (성공·실패 모두 같은 표시값을 저장해서 동시에 들어와도 맞는 비밀번호가 실패로 세이지 않음)
     * ★ v18.68 리뷰 반영 — 로그인한 상태에서 지금 비밀번호를 묻는 곳은 전부 이걸로 확인(틀린 횟수·잠금을 같이 셈):
     *   /me/reauth, PUT /me/password(비밀번호 변경), DELETE /account(탈퇴), PUT /profile/phone(번호 변경).
     *   예전엔 /me/reauth만 잠기고 나머지는 Hash::check만 해서, 잠긴 뒤에도 다른 화면으로 시간당 600번쯤 맞혀 볼 수 있었음.
     *   $wrongMessage — 틀렸을 때 안내(화면마다 예전 문구 유지). 빈 비밀번호는 맞을 수 없어서 횟수에 안 넣음.
     *   맞혀도 bcrypt 확인하는 사이 동시에 들어온 틀린 시도들로 잠겼으면 안 받음(잠금 응답).
     */
    public static function checkPassword(User $user, string $password, string $wrongMessage = '비밀번호가 맞지 않아요. 다시 입력해주세요.')
    {
        $target = "user:{$user->id}";
        if ($locked = self::passwordLocked($target)) {
            return $locked;
        }
        if ($password === '') {
            return ApiResponse::error($wrongMessage, ErrorCode::AUTH_LOGIN_FAILED, 422);
        }
        $mark = 'password';
        VerificationCode::store(self::PASSWORD_PURPOSE, $target, $mark);
        if ($user->password && \Illuminate\Support\Facades\Hash::check($password, $user->password)) {
            if ($locked = self::passwordLocked($target)) {
                return $locked; // ★ v18.68 확인하는 사이 잠김
            }
            VerificationCode::consume(self::PASSWORD_PURPOSE, $target, $mark); // 틀린 횟수 지움
            return null;
        }
        VerificationCode::consume(self::PASSWORD_PURPOSE, $target, ''); // 틀린 횟수 +1 (5·10번째면 잠금)
        return self::passwordLocked($target)
            ?? ApiResponse::error($wrongMessage, ErrorCode::AUTH_LOGIN_FAILED, 422);
    }

    /** ★ v18.68 비밀번호 잠금 응답 — 안내 문구만 "비밀번호를 N번 틀려서…"로 */
    private static function passwordLocked(string $target)
    {
        $locked = VerificationCode::lockedResponse(self::PASSWORD_PURPOSE, $target);
        if ($locked) {
            $body = $locked->getData(true);
            $body['message'] = str_replace('인증번호를', '비밀번호를', (string) ($body['message'] ?? ''));
            $locked->setData($body);
        }
        return $locked;
    }

    /** 실제로 메일이 나가는 설정인지(log·array는 기록만 하고 안 보냄) */
    public static function mailReady(): bool
    {
        return !in_array(config('mail.default'), ['log', 'array', null, ''], true);
    }

    /** chulsoo@gmail.com → chu****@gmail.com */
    public static function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        return mb_substr($local, 0, 3) . str_repeat('*', max(2, mb_strlen($local) - 3)) . '@' . $domain;
    }

    private static function target(User $user, string $channel): string
    {
        return $channel === 'phone' ? $user->phone : $user->email;
    }
}
