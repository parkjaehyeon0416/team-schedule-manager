<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Services\Reauth;
use App\Services\ReauthToken;
use App\Services\SocialAuthService;
use App\Services\VerificationCode;
use Illuminate\Http\Request;

/**
 * ★ v18.51 — 내 정보 › 로그인 연결 관리 (디자인 MY_LOGIN_LINKS)
 * 카카오·구글 연결/해제. 이메일·비밀번호는 비밀번호가 있을 때만 "설정됨"(설정 기능은 준비 중).
 * 마지막 남은 로그인 방법은 해제할 수 없음.
 *
 * ★ v18.68 (디자인 MY_LOGIN_LINKS_VERIFY*) 연결·해제 전에 본인 확인 — 잠금 풀린 폰을 잠깐 쥔 사람이 자기 소셜 계정을
 *   연결해 두고 나중에 그걸로 로그인하거나, 주인의 로그인 방법을 끊어 버리는 걸 막음.
 *   ① POST /me/reauth/send — 문자·이메일 인증번호 보내기(Reauth::send, SmsGuard 제한)
 *   ② POST /me/reauth — 비밀번호 | 인증번호 | (비밀번호·받을 곳 둘 다 없으면) 소셜 다시 로그인 → reauth_token(10분, 한 번)
 *   ③ POST·DELETE /me/login-links 에 reauth_token — 없거나 만료·이미 씀이면 422 ERR_AUTH_018(앱이 확인 시트를 다시 엶)
 *      표는 실제로 연결·해제하기 직전에만 씀(소셜 토큰이 틀리거나 이미 다른 계정에 연결된 소셜이면 남아서 다시 시도 가능)
 */
class LoginLinkController extends Controller
{
    private const REAUTH_PURPOSE = 'login_link'; // ★ v18.68

    // GET /me/login-links
    public function index(Request $request)
    {
        return ApiResponse::success($this->summary($request->user()));
    }

    // ★ v18.68 ① 본인 확인 인증번호 보내기
    // POST /me/reauth/send  {purpose: login_link, channel: phone|email}
    public function reauthSend(Request $request)
    {
        $request->validate([
            'purpose' => 'required|in:' . self::REAUTH_PURPOSE,
            'channel' => 'required|string',
        ]);
        $fail = Reauth::send(self::REAUTH_PURPOSE, '로그인 연결 관리', (string) $request->input('channel'), $request->user(),
            app(\App\Services\Sms\SmsServiceInterface::class));
        if ($fail) {
            return $fail;
        }
        return ApiResponse::success(['minutes' => VerificationCode::TTL_MINUTES], '인증번호를 보냈어요.');
    }

    // ★ v18.68 ② 본인 확인 → reauth_token
    // POST /me/reauth  {purpose: login_link, password} | {purpose, channel, code} | {purpose, provider, token}
    //   - 비밀번호: 비밀번호 없는 계정은 422 ERR_AUTH_018. 틀리면 422 ERR_AUTH_001, 틀린 횟수는 인증번호처럼 잠금(429 ERR_AUTH_017)
    //   - 인증번호: Reauth::check와 같음(이 계정에서 고를 수 있는 받을 곳만, 틀리면 422 ERR_AUTH_010, 잠금 429)
    //   - 소셜 다시 로그인: 비밀번호도 받을 곳도 없는 계정만(아니면 422 ERR_AUTH_018 — 같은 폰에 카카오·구글이 로그인돼 있으면
    //     폰만 쥔 사람도 통과할 수 있어서, 다른 확인 방법이 있으면 그걸 쓰게 함)
    public function reauth(Request $request)
    {
        $request->validate([
            'purpose'  => 'required|in:' . self::REAUTH_PURPOSE,
            'password' => 'sometimes|required|string|max:255',
            'channel'  => 'nullable|string',
            'code'     => 'nullable|string',
            'provider' => 'nullable|string',
            'token'    => 'nullable|string',
        ]);
        $user = $request->user();
        $channels = Reauth::channels($user);

        if ($request->has('password')) {
            if (!$user->password) {
                return ApiResponse::error($channels ? '비밀번호가 없는 계정이에요. 인증번호로 확인해주세요.'
                    : '비밀번호가 없는 계정이에요. 연결된 소셜 계정으로 다시 로그인해주세요.', ErrorCode::AUTH_REAUTH_REQUIRED, 422);
            }
            if ($fail = Reauth::checkPassword($user, (string) $request->input('password'))) {
                return $fail;
            }
        } elseif ($request->filled('provider') || $request->filled('token')) {
            if ($user->password || $channels) {
                return ApiResponse::error('비밀번호나 인증번호로 확인해주세요.', ErrorCode::AUTH_REAUTH_REQUIRED, 422);
            }
            if ($fail = Reauth::check(self::REAUTH_PURPOSE, $user, $request->only('provider', 'token'))) {
                return $fail;
            }
        } else {
            if (!$channels) {
                return ApiResponse::error('인증번호를 받을 수 있는 곳이 없어요. 다른 방법으로 확인해주세요.', ErrorCode::AUTH_REAUTH_REQUIRED, 422);
            }
            if ($fail = Reauth::check(self::REAUTH_PURPOSE, $user, $request->only('channel', 'code'))) {
                // 틀림·만료 안내만 디자인 문구로(잠금 429·방법 선택 422는 그대로)
                $body = $fail->getData(true);
                if (($body['error_code'] ?? null) === ErrorCode::AUTH_CODE_INVALID) {
                    $fail->setData(['message' => '인증번호가 맞지 않아요. 다시 확인해주세요.'] + $body);
                }
                return $fail;
            }
        }

        return ApiResponse::success([
            'reauth_token' => ReauthToken::issue($user, self::REAUTH_PURPOSE),
            'expires_in'   => ReauthToken::TTL_SECONDS,
        ], '본인 확인을 마쳤어요.');
    }

    // POST /me/login-links  {provider, token, auth_code?, reauth_token}
    public function link(Request $request)
    {
        $data = $request->validate([
            'provider' => 'required|in:google,kakao,apple',
            'token'    => 'required|string',
            'auth_code' => 'nullable|string', // ★ v18.64 Apple 갱신 토큰용
        ]);
        $user = $request->user();

        // ★ v18.68 본인 확인 표 — 여기선 보기만(소셜 확인·연결 실패면 표가 남아서 다시 시도 가능)
        $reauthToken = $request->input('reauth_token');
        if (!ReauthToken::valid($reauthToken, $user, self::REAUTH_PURPOSE)) {
            return $this->reauthRequired();
        }

        $profile = SocialAuthService::verify($data['provider'], $data['token']);
        if (!$profile) {
            return ApiResponse::error('소셜 로그인 인증에 실패했습니다. 다시 시도해주세요.', ErrorCode::AUTH_SOCIAL_TOKEN_INVALID, 401);
        }

        // ★ v18.68 연결 직전에 표를 씀(동시에 같은 표로 두 번 와도 하나만). 연결이 막히면(이미 다른 계정에 연결 등) 되돌림
        $used = ReauthToken::consume($reauthToken, $user, self::REAUTH_PURPOSE);
        if (!$used) {
            return $this->reauthRequired();
        }
        $why = SocialAuthService::attach($user, $data['provider'], $profile['id']);
        if ($why) {
            ReauthToken::restore($reauthToken, $used);
            $name = SocialAuthService::NAMES[$data['provider']];
            return ApiResponse::error(
                $why === 'taken'
                    ? "이미 다른 현장메이트 계정에 연결된 {$name} 계정이에요."
                    : "이미 다른 {$name} 계정이 연결돼 있어요. 먼저 해제해주세요.",
                ErrorCode::AUTH_SOCIAL_TAKEN,
                409
            );
        }

        if ($data['provider'] === 'apple' && !empty($data['auth_code'])) {
            SocialAuthService::saveAppleToken($user, \App\Services\SocialRevokeService::appleExchange($data['auth_code']));
        }

        return ApiResponse::success($this->summary($user->fresh()), '연결했습니다.');
    }

    // DELETE /me/login-links/{provider}  JSON 본문 {reauth_token} (★ v18.68 — 쿼리로 와도 받음)
    public function unlink(Request $request, string $provider)
    {
        abort_unless(in_array($provider, SocialAuthService::PROVIDERS, true), 404);
        $user = $request->user();
        $col = SocialAuthService::column($provider);

        // ★ v18.68 본인 확인 표 — 실제로 해제할 때만 씀(이미 해제됨·마지막 방법이면 표가 남음)
        $reauthToken = $request->input('reauth_token');
        if (!ReauthToken::valid($reauthToken, $user, self::REAUTH_PURPOSE)) {
            return $this->reauthRequired();
        }

        if (!$user->{$col}) {
            return ApiResponse::success($this->summary($user));
        }
        if ($this->methodCount($user) <= 1) {
            return ApiResponse::error('최소 하나의 로그인 방법이 필요해요.', ErrorCode::AUTH_LOGIN_LINK_LAST, 422);
        }
        if (!ReauthToken::consume($reauthToken, $user, self::REAUTH_PURPOSE)) {
            return $this->reauthRequired();
        }

        SocialAuthService::disconnect($user, $provider); // ★ v18.64 카카오 unlink / Apple revoke
        $user->forceFill(array_merge(
            [$col => null, "{$provider}_linked_at" => null],
            $provider === 'apple' ? ['apple_refresh_token' => null] : []
        ))->save();

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

        // ★ v18.68 리뷰 반영 — 지금 비밀번호 확인도 /me/reauth와 같은 틀린 횟수·잠금(Reauth::checkPassword, 429 ERR_AUTH_017).
        //   예전엔 Hash::check만 해서 /me/reauth가 잠긴 뒤에도 여기서 계속 맞혀 보고, 맞히면 비밀번호를 바꿀 수 있었음.
        if ($user->password
            && ($fail = Reauth::checkPassword($user, (string) ($data['current_password'] ?? ''), '현재 비밀번호가 맞지 않아요.'))) {
            return $fail;
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
            'reauth' => Reauth::loginLinkInfo($user), // ★ v18.68 연결·해제 전 본인 확인 방법
        ];
    }

    /** ★ v18.68 본인 확인 표가 없거나 만료·이미 씀 → 앱이 확인 시트를 다시 엶 */
    private function reauthRequired()
    {
        return ApiResponse::error('본인 확인이 필요해요. 다시 확인해주세요.', ErrorCode::AUTH_REAUTH_REQUIRED, 422);
    }
}
