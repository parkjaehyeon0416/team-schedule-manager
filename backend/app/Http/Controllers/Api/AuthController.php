<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Models\Team;
use App\Notifications\PasswordResetCodeNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    // ════════════════════════════════════════════════════════
    // 플랫폼 정책 — user_type과 접근 가능 플랫폼의 매칭
    // ════════════════════════════════════════════════════════
    //
    // user_type = 'operator'  → 웹 관리자만 접속 (앱 운영자)
    // user_type = 'team'      → 모바일 앱만 접속 (팀 소속 사용자)
    // user_type = 'freelancer'→ 모바일 앱만 접속 (프리랜서)
    //
    // 이 정책은 로그인 시 platform 파라미터로 검증됨
    // ════════════════════════════════════════════════════════

    /**
     * user_type별 허용 플랫폼 매핑
     *
     * 'web'    → 웹 관리자 (localhost:3000)
     * 'mobile' → 모바일 앱 (React Native)
     */
    private const PLATFORM_MAP = [
        'operator'   => 'web',
        'team'       => 'mobile',
        'freelancer' => 'mobile',
    ];

    // ────────────────────────────────────
    // 회원가입
    // POST /api/auth/register
    // ────────────────────────────────────
    public function register(Request $request)
    {
        // 1. 입력값 검증
        $validated = $request->validate([
            'name'         => 'required|string|max:100',
            'email'        => 'required|email|unique:users,email',
            // ★ 아이디(이메일) 찾기를 이름+전화번호로 지원하기 위해 필수로 수집
            'phone'        => 'required|string|max:20|unique:users,phone',
            'password'     => 'required|min:6|confirmed',
            // ★ platform 필드 추가 — 'web' 또는 'mobile'
            'platform'     => 'required|in:web,mobile',
            // ★ 이용약관/개인정보처리방침 동의 — 체크 안 하면 가입 자체가 안 됨
            'agree_terms'  => 'required|accepted',
        ]);

        // 2. web으로 가입은 허용하지 않음 (운영자는 콘솔에서 수동 생성)
        if ($validated['platform'] === 'web') {
            return ApiResponse::error(
                '웹 관리자에서는 회원가입이 지원되지 않습니다. 모바일 앱을 이용해주세요.',
                'ERR_AUTH_006',
                403
            );
        }

        // 모든 모바일 가입자는 일단 '팀 없는 개인'으로 시작함 — team/freelancer는
        // 가입 시점에 고르는 게 아니라, 이후 팀을 만들거나(store) 가입하면(join)
        // 자연스럽게 바뀌는 상태값일 뿐임.
        // '팀 없는 개인'은 스스로가 자기 데이터의 manager이므로 role_id=2를 줘야
        // 일정/현장 CUD(manager 이상 전용)를 본인 힘으로 할 수 있음.
        $user = User::create([
            'name'      => $validated['name'],
            'email'     => $validated['email'],
            'phone'     => $validated['phone'],
            'password'  => Hash::make($validated['password']),
            'role_id'   => 2,
            'user_type' => 'freelancer',
        ]);

        // 3. 가입 즉시 로그인 처리 — 로그인 화면 재진입 없이 바로 앱 사용 가능
        $token = $user->createToken('auth-token')->plainTextToken;

        return ApiResponse::success([
            'user'  => $user,
            'token' => $token,
        ], '회원가입이 완료되었습니다.', 201);
    }

    // ────────────────────────────────────
    // 로그인
    // POST /api/auth/login
    // ────────────────────────────────────
    public function login(Request $request)
    {
        // 1. 입력값 검증
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
            // ★ platform 필드 추가
            'platform' => 'required|in:web,mobile',
        ]);

        // 2. 이메일로 사용자 찾기
        $user = User::with('role')->where('email', $request->email)->first();

        // 3. 이메일 또는 비밀번호 불일치 확인
        if (!$user || !Hash::check($request->password, $user->password)) {
            return ApiResponse::error('이메일 또는 비밀번호가 틀렸습니다.', 'ERR_AUTH_001', 401);
        }

        // 4. ★ 플랫폼 접근 권한 검증
        //    user_type에 따라 허용된 플랫폼만 접속 가능
        $allowedPlatform = self::PLATFORM_MAP[$user->user_type] ?? null;

        if ($allowedPlatform !== $request->platform) {
            // 웹에서 모바일 사용자가 로그인 시도
            if ($request->platform === 'web') {
                return ApiResponse::error(
                    '이 계정은 모바일 앱 전용입니다. 모바일 앱에서 로그인해주세요.',
                    'ERR_AUTH_007',
                    403
                );
            }
            // 모바일에서 운영자 계정으로 로그인 시도
            if ($request->platform === 'mobile') {
                return ApiResponse::error(
                    '운영자 계정은 모바일 앱 이용이 불가합니다. 웹 관리자에서 로그인해주세요.',
                    'ERR_AUTH_008',
                    403
                );
            }
        }

        // 5. Sanctum 토큰 발급
        $token = $user->createToken('auth-token')->plainTextToken;

        // 6. 사용자 정보 + 토큰 반환
        return ApiResponse::success([
            'user'  => $user,
            'token' => $token,
        ], '로그인 성공');
    }

    // ────────────────────────────────────
    // 아이디(이메일) 찾기 — 이름 + 전화번호로 조회
    // POST /api/auth/find-email
    // ────────────────────────────────────
    public function findEmail(Request $request)
    {
        $data = $request->validate([
            'name'  => 'required|string|max:100',
            'phone' => 'required|string|max:20',
        ]);

        $user = User::where('name', $data['name'])
            ->where('phone', $data['phone'])
            ->first();

        if (!$user) {
            return ApiResponse::error(
                '일치하는 계정을 찾을 수 없습니다.',
                ErrorCode::AUTH_ACCOUNT_NOT_FOUND,
                404
            );
        }

        return ApiResponse::success([
            'email' => $this->maskEmail($user->email),
        ], '계정을 찾았습니다.');
    }

    // ────────────────────────────────────
    // 비밀번호 재설정 — 1단계: 인증코드 발송
    // POST /api/auth/forgot-password
    // ────────────────────────────────────
    public function forgotPassword(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $data['email'])->first();

        // 계정 존재 여부를 노출하지 않기 위해, 없어도 항상 같은 성공 응답을 줌
        // (실제 코드 발송/저장은 계정이 있을 때만)
        if ($user) {
            $code = (string) random_int(100000, 999999);

            DB::table('password_reset_codes')->updateOrInsert(
                ['email' => $user->email],
                [
                    'code'       => $code,
                    'expires_at' => now()->addMinutes(10),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            // ★ 실제 발송 채널은 .env MAIL_MAILER 설정을 따름 — 지금은 'log'라
            //   storage/logs/laravel.log에 코드가 찍힘. 나중에 SMTP/SES로 바꿔도
            //   이 코드는 그대로 둔 채 .env만 바꾸면 됨.
            $user->notify(new PasswordResetCodeNotification($code));
        }

        return ApiResponse::success(null, '입력하신 이메일로 인증코드를 발송했습니다.');
    }

    // ────────────────────────────────────
    // 비밀번호 재설정 — 2단계: 인증코드 확인 + 비밀번호 변경
    // POST /api/auth/reset-password
    // ────────────────────────────────────
    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'code'     => 'required|string|size:6',
            'password' => 'required|min:6|confirmed',
        ]);

        $reset = DB::table('password_reset_codes')
            ->where('email', $data['email'])
            ->first();

        if (!$reset || $reset->code !== $data['code'] || now()->greaterThan($reset->expires_at)) {
            return ApiResponse::error(
                '인증코드가 올바르지 않거나 만료되었습니다.',
                ErrorCode::AUTH_RESET_CODE_INVALID,
                422
            );
        }

        $user = User::where('email', $data['email'])->first();
        if (!$user) {
            return ApiResponse::error(
                '인증코드가 올바르지 않거나 만료되었습니다.',
                ErrorCode::AUTH_RESET_CODE_INVALID,
                422
            );
        }

        $user->update(['password' => Hash::make($data['password'])]);

        // 사용한 코드 + 기존 로그인 세션(토큰) 전부 무효화
        DB::table('password_reset_codes')->where('email', $data['email'])->delete();
        $user->tokens()->delete();

        return ApiResponse::success(null, '비밀번호가 재설정되었습니다. 다시 로그인해주세요.');
    }

    /**
     * 이메일 마스킹 — 예: test1234@example.com → te****@example.com
     */
    private function maskEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email);
        $visible = Str::substr($local, 0, min(2, strlen($local)));

        return $visible . str_repeat('*', max(strlen($local) - strlen($visible), 2)) . '@' . $domain;
    }

    // ────────────────────────────────────
    // 로그아웃
    // POST /api/auth/logout
    // ────────────────────────────────────
    public function logout(Request $request)
    {
        // 현재 사용 중인 토큰만 삭제 (다른 기기 토큰은 유지)
        $request->user()->currentAccessToken()->delete();
        return ApiResponse::success(null, '로그아웃 되었습니다.');
    }

    // ────────────────────────────────────
    // 내 정보 조회
    // GET /api/me
    // ────────────────────────────────────
    public function me(Request $request)
    {
        // auth:sanctum 미들웨어가 토큰을 검증하고 사용자 정보를 주입해줌
        $user = $request->user()->load('role', 'team');
        return ApiResponse::success($user);
    }
}
