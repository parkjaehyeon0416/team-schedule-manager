<?php

namespace App\Services;

use App\Constants\ErrorCode;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Services\Sms\SmsServiceInterface;

/**
 * ★ v18.63 — 비밀번호 없는(소셜 가입) 사용자의 중요한 작업 전 본인 확인 공용 처리.
 *   회원 탈퇴, 처음 비밀번호 설정에 씀.
 *   - 전화번호(문자) 또는 진짜 이메일로 6자리 인증번호(VerificationCode: 3분, 5번 틀리면 5분 잠금)
 *   - 둘 다 없으면 연결된 소셜 계정으로 다시 로그인(provider + token)
 */
class Reauth
{
    /** 인증번호를 받을 수 있는 곳 [phone => 가린 번호, email => 가린 이메일] */
    public static function channels(User $user): array
    {
        $ch = [];
        if ($user->phone) {
            $p = preg_replace('/\D/', '', $user->phone);
            $ch['phone'] = substr($p, 0, 3) . '-****-' . substr($p, -4);
        }
        if ($user->email && !str_ends_with($user->email, '@social.local')) {
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

    /** 인증번호 발송. 실패하면 에러 응답, 성공하면 null */
    public static function send(string $purpose, string $label, string $channel, User $user, SmsServiceInterface $sms)
    {
        if (!isset(self::channels($user)[$channel])) {
            return ApiResponse::error('선택할 수 없는 인증 방법입니다.', ErrorCode::AUTH_REAUTH_REQUIRED, 422);
        }
        $target = self::target($user, $channel);
        if ($locked = VerificationCode::lockedResponse($purpose, $target)) {
            return $locked;
        }
        $code = VerificationCode::issue($purpose, $target);
        try {
            if ($channel === 'phone') {
                $sms->send($target, "[현장메이트] {$label} 인증번호는 {$code} 입니다. (" . VerificationCode::TTL_MINUTES . "분간 유효)");
            } else {
                \Illuminate\Support\Facades\Mail::to($target)
                    ->send(new \App\Mail\VerificationCodeMail($code, $label, VerificationCode::TTL_MINUTES));
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('본인 확인 인증번호 발송 실패', ['user_id' => $user->id, 'purpose' => $purpose, 'channel' => $channel, 'error' => $e->getMessage()]);
            return ApiResponse::error('인증번호를 보내지 못했어요. 다른 방법을 고르거나 잠시 후 다시 시도해주세요.', ErrorCode::AUTH_REAUTH_REQUIRED, 503);
        }
        return null;
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
