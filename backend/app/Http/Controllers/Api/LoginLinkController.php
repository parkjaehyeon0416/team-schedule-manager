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
            'provider' => 'required|in:google,kakao',
            'token'    => 'required|string',
        ]);
        $user = $request->user();

        $profile = SocialAuthService::verify($data['provider'], $data['token']);
        if (!$profile) {
            return ApiResponse::error('소셜 로그인 인증에 실패했습니다. 다시 시도해주세요.', ErrorCode::AUTH_SOCIAL_TOKEN_INVALID, 401);
        }

        $why = SocialAuthService::attach($user, $data['provider'], $profile['id']);
        if ($why) {
            $name = $data['provider'] === 'google' ? '구글' : '카카오';
            return ApiResponse::error(
                $why === 'taken'
                    ? "이미 다른 WorkMate 계정에 연결된 {$name} 계정이에요."
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

    private function methodCount(User $user): int
    {
        return ($user->google_id ? 1 : 0) + ($user->kakao_id ? 1 : 0) + ($user->password ? 1 : 0);
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
            'email' => [
                'set'   => (bool) $user->password,
                'email' => str_ends_with($user->email, '@social.local') ? null : $user->email,
            ],
            'count' => $this->methodCount($user),
        ];
    }
}
