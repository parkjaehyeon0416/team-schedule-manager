<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Services\SocialAuthService;
use Illuminate\Http\Request;

/**
 * ★ v18.51 — 내 정보 › 로그인 연결 관리 (디자인 MY_LOGIN_LINKS)
 * 카카오·구글 연결/해제. 이메일·비밀번호는 비밀번호가 있을 때만 "설정됨"(설정 기능은 준비 중).
 * 마지막 남은 로그인 방법은 해제할 수 없음.
 */
class LoginLinkController extends Controller
{
    // GET /me/login-links
    public function index(Request $request)
    {
        return ApiResponse::success($this->summary($request->user()));
    }

    // POST /me/login-links  {provider, token}
    public function link(Request $request)
    {
        $data = $request->validate([
            'provider' => 'required|in:google,kakao,apple',
            'token'    => 'required|string',
        ]);
        $user = $request->user();

        $profile = SocialAuthService::verify($data['provider'], $data['token']);
        if (!$profile) {
            return ApiResponse::error('소셜 로그인 인증에 실패했습니다. 다시 시도해주세요.', ErrorCode::AUTH_SOCIAL_TOKEN_INVALID, 401);
        }

        $why = SocialAuthService::attach($user, $data['provider'], $profile['id']);
        if ($why) {
            $name = SocialAuthService::NAMES[$data['provider']];
            return ApiResponse::error(
                $why === 'taken'
                    ? "이미 다른 현장메이트 계정에 연결된 {$name} 계정이에요."
                    : "이미 다른 {$name} 계정이 연결돼 있어요. 먼저 해제해주세요.",
                ErrorCode::AUTH_SOCIAL_TAKEN,
                409
            );
        }

        return ApiResponse::success($this->summary($user->fresh()), '연결했습니다.');
    }

    // DELETE /me/login-links/{provider}
    public function unlink(Request $request, string $provider)
    {
        abort_unless(in_array($provider, SocialAuthService::PROVIDERS, true), 404);
        $user = $request->user();
        $col = SocialAuthService::column($provider);

        if (!$user->{$col}) {
            return ApiResponse::success($this->summary($user));
        }
        if ($this->methodCount($user) <= 1) {
            return ApiResponse::error('최소 하나의 로그인 방법이 필요해요.', ErrorCode::AUTH_LOGIN_LINK_LAST, 422);
        }

        $user->forceFill([$col => null, "{$provider}_linked_at" => null])->save();

        return ApiResponse::success($this->summary($user->fresh()), '연결을 해제했습니다.');
    }

    // ★ v18.52 — 이메일·비밀번호 설정/변경 (디자인 MY_PASSWORD_SET)
    // PUT /me/password  {email?, current_password?, password, password_confirmation}
    // - 비밀번호가 없던 소셜 가입자: 바로 설정. 이메일이 없으면(가짜 @social.local) 이메일도 같이 받음
    // - 이미 비밀번호가 있으면 변경 → 현재 비밀번호 확인
    public function setPassword(Request $request)
    {
        $user = $request->user();
        $needsEmail = $this->needsEmail($user);
        $data = $request->validate([
            'email'            => [$needsEmail ? 'required' : 'prohibited', 'email', 'max:255', \Illuminate\Validation\Rule::unique('users', 'email')->ignore($user->id)],
            'current_password' => [$user->password ? 'required' : 'nullable', 'string'],
            'password'         => \App\Support\PasswordPolicy::rules(), // ★ v18.62
        ], [
            'email.unique'       => '이미 다른 계정에서 쓰는 이메일이에요.',
        ] + \App\Support\PasswordPolicy::messages());

        if ($user->password && !\Illuminate\Support\Facades\Hash::check($data['current_password'] ?? '', $user->password)) {
            return ApiResponse::error('현재 비밀번호가 맞지 않아요.', ErrorCode::AUTH_LOGIN_FAILED, 422);
        }
        // ★ v18.63 — 처음 설정(비밀번호 없던 소셜 가입자)도 본인 확인: 문자·이메일 인증번호(없으면 소셜 재로그인).
        //   예전엔 로그인만 돼 있으면 바로 설정돼서, 남이 잠깐 폰을 쓰는 사이 비밀번호를 만들어 둘 수 있었음.
        if (!$user->password
            && ($fail = \App\Services\Reauth::check('set_password', $user, $request->only('channel', 'code', 'provider', 'token')))) {
            return $fail;
        }

        $wasSet = (bool) $user->password;
        $user->forceFill(array_filter([
            'password' => \Illuminate\Support\Facades\Hash::make($data['password']),
            'email'    => $needsEmail ? $data['email'] : null,
        ]))->save();

        // ★ v18.62 — 비밀번호를 바꾸면 지금 이 기기만 남기고 다른 기기 로그인은 끊음(비밀번호가 새어 바꾼 경우 대비)
        if ($wasSet) {
            $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();
        }

        return ApiResponse::success($this->summary($user->fresh()), $wasSet ? '비밀번호를 변경했어요.' : '이메일 로그인을 설정했어요.');
    }

    // ★ v18.63 — 처음 비밀번호 설정 전 본인 확인 방법 안내 + 인증번호 발송
    // POST /me/password/verify  {send?: bool, channel?: phone|email}
    public function verifyRequest(Request $request)
    {
        $user = $request->user();
        if ($user->password) {
            return ApiResponse::success(['method' => 'password', 'channels' => [], 'providers' => [], 'minutes' => \App\Services\VerificationCode::TTL_MINUTES]);
        }
        if ($request->boolean('send')) {
            $fail = \App\Services\Reauth::send('set_password', '이메일 로그인 설정', (string) $request->input('channel'), $user,
                app(\App\Services\Sms\SmsServiceInterface::class));
            if ($fail) {
                return $fail;
            }
            return ApiResponse::success(\App\Services\Reauth::info($user), '인증번호를 보냈어요.');
        }
        return ApiResponse::success(\App\Services\Reauth::info($user), '본인 확인 방법을 알려드려요.');
    }

    private function needsEmail(User $user): bool
    {
        return str_ends_with($user->email, '@social.local');
    }

    private function methodCount(User $user): int
    {
        return ($user->google_id ? 1 : 0) + ($user->kakao_id ? 1 : 0) + ($user->apple_id ? 1 : 0) + ($user->password ? 1 : 0);
    }

    private function summary(User $user): array
    {
        $row = fn(string $p) => [
            'linked'    => (bool) $user->{SocialAuthService::column($p)},
            'linked_at' => $user->{"{$p}_linked_at"}?->toDateString(),
        ];
        return [
            'kakao' => $row('kakao'),
            'google' => $row('google'),
            'apple' => $row('apple'), // ★ v18.60
            'email' => [
                'set'   => (bool) $user->password,
                'email' => $this->needsEmail($user) ? null : $user->email,
            ],
            'count' => $this->methodCount($user),
        ];
    }
}
