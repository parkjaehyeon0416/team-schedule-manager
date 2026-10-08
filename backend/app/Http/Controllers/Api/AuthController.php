<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Models\Team;
use App\Services\SocialAuthService;
use App\Services\Sms\SmsServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
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

    public function __construct(private readonly SmsServiceInterface $sms)
    {
    }

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

        // ★ v18.41 — 운영자가 정지한 계정은 로그인 차단
        if ($user->suspended_at) {
            return ApiResponse::error('이용이 정지된 계정입니다. 고객센터로 문의해주세요.', 'ERR_AUTH_009', 403);
        }

        // ★ v18.51 — "이미 계정이 있어요" → 쓰던 계정으로 로그인하면서 소셜 계정 연결
        if ($request->filled('link_ticket') && ($fail = $this->attachTicket($user, $request->input('link_ticket')))) {
            return $fail;
        }

        // ★ v18.56 — 마지막 접속(운영자 관리 목록에 표시)
        $user->forceFill(['last_login_at' => now()])->saveQuietly();

        // 5. Sanctum 토큰 발급
        $token = $user->createToken('auth-token')->plainTextToken;

        // 6. 사용자 정보 + 토큰 반환
        return ApiResponse::success([
            'user'  => $user,
            'token' => $token,
        ], '로그인 성공');
    }

    // ────────────────────────────────────
    // 소셜 로그인(구글/카카오)
    // POST /api/auth/social-login
    //
    // ★ v18.51 — 연결된 계정도 같은 이메일 계정도 없으면 바로 가입시키지 않고 needs_signup + link_ticket 반환
    //   → 앱이 "현장메이트가 처음이신가요?"를 보여주고 가입(social-signup) 또는 기존 계정 로그인(link_ticket 동봉)으로 이어감.
    //   flow=v2를 안 보내는 예전 앱은 기존처럼 즉시 가입.
    //   link_ticket을 함께 보내면 "쓰던 계정으로 로그인" 단계 — 로그인 후 티켓의 소셜 계정을 연결.
    // ────────────────────────────────────
    public function socialLogin(Request $request)
    {
        $data = $request->validate([
            'provider'    => 'required|in:google,kakao,apple',
            'name'        => 'nullable|string|max:100', // ★ v18.60 Apple은 이름을 토큰에 안 줘서 앱이 첫 로그인 때 받은 이름을 보냄
            'token'       => 'required|string', // 구글: id_token, 카카오: access_token
            'platform'    => 'required|in:web,mobile',
            'flow'        => 'nullable|in:v2',
            'link_ticket' => 'nullable|string',
        ]);

        $profile = SocialAuthService::verify($data['provider'], $data['token']);
        // ★ v18.60 — Apple은 이름을 토큰에 안 넣어 줌 → 앱이 첫 로그인 때 받은 이름 사용
        if ($profile && empty($profile['name']) && !empty($data['name'])) {
            $profile['name'] = $data['name'];
        }

        if (!$profile) {
            return ApiResponse::error(
                '소셜 로그인 인증에 실패했습니다. 다시 시도해주세요.',
                ErrorCode::AUTH_SOCIAL_TOKEN_INVALID,
                401
            );
        }

        $idColumn = SocialAuthService::column($data['provider']);
        $linking = !empty($data['link_ticket']);

        // 1) 이미 이 소셜 계정으로 가입된 유저인지 확인
        $user = User::with('role')->where($idColumn, $profile['id'])->first();

        if (!$user) {
            // 2) 같은 이메일로 가입된 계정이 있으면 소셜 ID만 연동
            // ★ v18.55 — 운영자(웹 관리자 전용) 계정에는 붙이지 않음(같은 이메일이어도 앱 계정으로 따로 가입)
            $existing = $profile['email']
                ? User::where('email', $profile['email'])->where('user_type', '!=', 'operator')->first()
                : null;

            if ($existing && !SocialAuthService::attach($existing, $data['provider'], $profile['id'])) {
                $user = $existing->fresh('role');
            } elseif ($linking) {
                // "쓰던 계정으로 로그인"에서 고른 소셜 계정에도 연결된 계정이 없음
                return ApiResponse::error(
                    '이 계정으로 가입된 현장메이트 계정이 없어요. 다른 방법으로 로그인해주세요.',
                    ErrorCode::AUTH_SOCIAL_NO_ACCOUNT,
                    404
                );
            } elseif (($data['flow'] ?? null) === 'v2') {
                // 3) 신규 — 앱에서 "처음이신가요?" 확인 후 가입
                return ApiResponse::success([
                    'needs_signup' => true,
                    'link_ticket'  => SocialAuthService::makeTicket($data['provider'], $profile),
                    'social'       => [
                        'provider' => $data['provider'],
                        'display'  => SocialAuthService::displayName($profile),
                    ],
                ], '연결된 계정이 없습니다.');
            } else {
                // 예전 앱 — 즉시 가입
                $user = $this->createSocialUser($data['provider'], $profile);
            }
        }

        // ★ v18.41 — 운영자가 정지한 계정은 로그인 차단
        if ($user->suspended_at) {
            return ApiResponse::error('이용이 정지된 계정입니다. 고객센터로 문의해주세요.', 'ERR_AUTH_009', 403);
        }

        if ($linking && ($fail = $this->attachTicket($user, $data['link_ticket']))) {
            return $fail;
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return ApiResponse::success([
            'user'  => $user->fresh('role'),
            'token' => $token,
        ], '로그인 성공');
    }

    // ────────────────────────────────────
    // ★ v18.51 — 소셜 신규 가입("처음이에요, 새로 시작할게요" → 약관 동의 후)
    // POST /api/auth/social-signup
    // ────────────────────────────────────
    public function socialSignup(Request $request)
    {
        $data = $request->validate([
            'link_ticket'      => 'required|string',
            'agree_terms'      => 'accepted',
            'marketing_opt_in' => 'sometimes|boolean',
        ]);

        $ticket = SocialAuthService::readTicket($data['link_ticket']);
        if (!$ticket) {
            return ApiResponse::error('시간이 지나 다시 로그인해야 해요.', ErrorCode::AUTH_SOCIAL_TICKET_INVALID, 422);
        }

        $col = SocialAuthService::column($ticket['p']);
        // 그 사이 다른 경로로 가입됐으면 그 계정으로 로그인
        $user = User::with('role')->where($col, $ticket['id'])->first()
            ?? DB::transaction(function () use ($ticket, $data) {
                $user = $this->createSocialUser($ticket['p'], $ticket);
                \App\Models\NotificationSetting::updateOrCreate(
                    ['user_id' => $user->id],
                    ['marketing_opt_in' => (bool) ($data['marketing_opt_in'] ?? false)]
                );
                return $user;
            });

        if ($user->suspended_at) {
            return ApiResponse::error('이용이 정지된 계정입니다. 고객센터로 문의해주세요.', 'ERR_AUTH_009', 403);
        }

        return ApiResponse::success([
            'user'  => $user->fresh('role'),
            'token' => $user->createToken('auth-token')->plainTextToken,
        ], '회원가입이 완료되었습니다.', 201);
    }

    private function createSocialUser(string $provider, array $profile): User
    {
        $email = $profile['email'] ?? null;
        // 같은 이메일 계정이 이미 있으면(소셜 연결이 다른 계정이라 연동 실패한 경우) 대체 이메일 사용
        if (!$email || User::withTrashed()->where('email', $email)->exists()) {
            $email = $provider . '_' . $profile['id'] . '@social.local';
        }
        $user = User::create([
            'name'      => $profile['name'] ?: '사용자',
            'email'     => $email,
            'password'  => null,
            'role_id'   => 2,
            'user_type' => 'freelancer',
        ]);
        $user->forceFill([SocialAuthService::column($provider) => $profile['id'], "{$provider}_linked_at" => now()])->save();
        return $user->load('role');
    }

    /** link_ticket의 소셜 계정을 $user에 연결. 실패 시 에러 응답 반환 */
    private function attachTicket(User $user, string $ticketStr)
    {
        $ticket = SocialAuthService::readTicket($ticketStr);
        if (!$ticket) {
            return ApiResponse::error('시간이 지나 다시 로그인해야 해요.', ErrorCode::AUTH_SOCIAL_TICKET_INVALID, 422);
        }
        $why = SocialAuthService::attach($user, $ticket['p'], $ticket['id']);
        if ($why) {
            $name = SocialAuthService::NAMES[$ticket['p']] ?? $ticket['p'];
            return ApiResponse::error(
                $why === 'taken'
                    ? "이미 다른 현장메이트 계정에 연결된 {$name} 계정이에요."
                    : "이 계정에는 이미 다른 {$name} 계정이 연결돼 있어요.",
                ErrorCode::AUTH_SOCIAL_TAKEN,
                409
            );
        }
        return null;
    }

    // ════════════════════════════════════════════════════════
    // 아이디(이메일) 찾기 / 비밀번호 재설정 — 공용 전화번호 인증코드 발급·검증
    // ════════════════════════════════════════════════════════

    /**
     * verification_codes에 6자리 코드를 upsert하고 SMS로 발송(지금은 log 드라이버).
     */
    private function issueVerificationCode(string $phone, string $purpose, ?string $payload = null): void
    {
        $code = (string) random_int(100000, 999999);

        DB::table('verification_codes')->updateOrInsert(
            ['phone' => $phone, 'purpose' => $purpose],
            [
                'code'       => $code,
                'payload'    => $payload,
                'expires_at' => now()->addMinutes(10),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        // ★ 실제 발송은 config('sms.driver')로 결정됨 — 지금은 'log'라 실제 문자
        //   대신 storage/logs/laravel.log에 코드가 찍힘. 나중에 다이렉트샌드 등
        //   실제 SMS 서비스를 붙일 땐 SmsServiceInterface 구현체 하나 추가하고
        //   .env의 SMS_DRIVER만 바꾸면 되고, 여기(AuthController)는 손댈 필요 없음.
        $this->sms->send($phone, "[현장메이트] 인증번호는 {$code} 입니다. (10분간 유효)");
    }

    /**
     * @return string|null 코드가 유효하면 payload(없으면 빈 문자열), 아니면 null
     */
    private function consumeVerificationCode(string $phone, string $purpose, string $code): ?string
    {
        $record = DB::table('verification_codes')
            ->where('phone', $phone)
            ->where('purpose', $purpose)
            ->first();

        if (!$record || $record->code !== $code || now()->greaterThan($record->expires_at)) {
            return null;
        }

        DB::table('verification_codes')
            ->where('phone', $phone)
            ->where('purpose', $purpose)
            ->delete();

        return $record->payload ?? '';
    }

    // ────────────────────────────────────
    // 아이디 찾기 — 1단계: 이름+전화번호로 계정 확인 후 인증코드 발송
    // POST /api/auth/find-email/request
    // ────────────────────────────────────
    public function findEmailRequest(Request $request)
    {
        $data = $request->validate([
            'name'  => 'required|string|max:100',
            'phone' => 'required|string|max:20',
        ]);

        $user = User::where('name', $data['name'])->where('phone', $data['phone'])->first();

        if (!$user) {
            return ApiResponse::error(
                '일치하는 계정을 찾을 수 없습니다.',
                ErrorCode::AUTH_ACCOUNT_NOT_FOUND,
                404
            );
        }

        $this->issueVerificationCode($data['phone'], 'find_email');

        return ApiResponse::success(null, '입력하신 전화번호로 인증번호를 발송했습니다.');
    }

    // ────────────────────────────────────
    // 아이디 찾기 — 2단계: 인증코드 확인 후 이메일 공개
    // POST /api/auth/find-email/verify
    // ────────────────────────────────────
    public function findEmailVerify(Request $request)
    {
        $data = $request->validate([
            'name'  => 'required|string|max:100',
            'phone' => 'required|string|max:20',
            'code'  => 'required|string|size:6',
        ]);

        if ($this->consumeVerificationCode($data['phone'], 'find_email', $data['code']) === null) {
            return ApiResponse::error('인증번호가 올바르지 않거나 만료되었습니다.', ErrorCode::AUTH_CODE_INVALID, 422);
        }

        $user = User::where('name', $data['name'])->where('phone', $data['phone'])->first();
        if (!$user) {
            return ApiResponse::error('일치하는 계정을 찾을 수 없습니다.', ErrorCode::AUTH_ACCOUNT_NOT_FOUND, 404);
        }

        // 전화번호 인증까지 마친 본인이므로 마스킹 없이 전체 이메일 반환
        return ApiResponse::success(['email' => $user->email], '계정을 찾았습니다.');
    }

    // ────────────────────────────────────
    // 비밀번호 재설정 — 1단계: 이메일+이름+전화번호 일치 확인 후 인증코드 발송
    // POST /api/auth/forgot-password
    // ────────────────────────────────────
    public function forgotPassword(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'name'  => 'required|string|max:100',
            'phone' => 'required|string|max:20',
        ]);

        $user = User::where('email', $data['email'])
            ->where('name', $data['name'])
            ->where('phone', $data['phone'])
            ->first();

        // 계정 존재/일치 여부를 노출하지 않기 위해, 없어도 항상 같은 성공 응답을 줌
        // (실제 코드 발급/발송은 셋 다 일치할 때만)
        if ($user) {
            $this->issueVerificationCode($data['phone'], 'reset_password', $user->email);
        }

        return ApiResponse::success(null, '입력하신 전화번호로 인증번호를 발송했습니다.');
    }

    // ────────────────────────────────────
    // 비밀번호 재설정 — 2단계: 인증코드 확인 + 비밀번호 변경
    // POST /api/auth/reset-password
    // ────────────────────────────────────
    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'phone'    => 'required|string|max:20',
            'code'     => 'required|string|size:6',
            'password' => 'required|min:6|confirmed',
        ]);

        $email = $this->consumeVerificationCode($data['phone'], 'reset_password', $data['code']);
        if (!$email) {
            return ApiResponse::error('인증번호가 올바르지 않거나 만료되었습니다.', ErrorCode::AUTH_CODE_INVALID, 422);
        }

        $user = User::where('email', $email)->where('phone', $data['phone'])->first();
        if (!$user) {
            return ApiResponse::error('인증번호가 올바르지 않거나 만료되었습니다.', ErrorCode::AUTH_CODE_INVALID, 422);
        }

        $user->update(['password' => Hash::make($data['password'])]);

        // 기존 로그인 세션(토큰) 전부 무효화
        $user->tokens()->delete();

        return ApiResponse::success(null, '비밀번호가 재설정되었습니다. 다시 로그인해주세요.');
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
        // ★ v18.21 — teams도 같이 내려줘서 앱이 "여러 팀 소속" 여부를 바로 알 수 있게 함
        $user = $request->user()->load('role', 'team', 'teams');
        // ★ v18.47 — 요금제 요약(출시 기념 무료 기간이면 launch_free_until 포함)
        $user->setAttribute('plan_info', \App\Services\PlanService::summary($user));
        return ApiResponse::success($user);
    }

    // ────────────────────────────────────
    // 회원 탈퇴  ★ DESIGN-CANVAS(APP_INFO) 추가 (2026-10-02)
    // DELETE /api/account
    //   비밀번호 재확인 후 계정을 소프트 삭제하고, 소속된 모든 팀에서 탈퇴 처리하며,
    //   발급된 모든 기기의 토큰을 폐기함. 일정/현장/견적 등 기존 기록은 삭제하지 않고
    //   그대로 남겨둠(팀원이었던 다른 사람들의 "팀" 필터 조회에 영향을 주지 않기 위함 —
    //   TeamController::destroy()의 탈퇴 정책과 동일한 원칙).
    // ────────────────────────────────────
    public function withdraw(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'password' => 'required|string',
        ]);

        if (!Hash::check($data['password'], $user->password)) {
            return ApiResponse::error('비밀번호가 일치하지 않습니다.', 'ERR_AUTH_001', 422);
        }

        DB::table('team_members')
            ->where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->update(['deleted_at' => now()]);

        $user->tokens()->delete();
        $user->update(['email' => $user->email.'.withdrawn.'.time()]); // 재가입 시 이메일 중복 방지
        $user->delete(); // SoftDeletes

        return ApiResponse::success(null, '회원 탈퇴가 완료되었습니다.');
    }
}
