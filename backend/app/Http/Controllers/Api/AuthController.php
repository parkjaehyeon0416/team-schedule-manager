<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Models\Team;
use App\Services\SocialAuthService;
use App\Services\SocialRevokeService;
use App\Services\VerificationCode;
use App\Services\Reauth;
use App\Services\SmsGuard;
use App\Support\PasswordPolicy;
use App\Services\Sms\SmsServiceInterface;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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

    // ★ v18.67 로그인 실패 잠금 — 같은 이메일로 15분 안에 10번 틀리면 15분 잠금
    private const LOGIN_MAX_FAILS    = 10;
    private const LOGIN_FAIL_MINUTES = 15;
    // ★ v18.67 없는 계정일 때도 bcrypt 검사를 한 번 돌리려고 쓰는 가짜 해시(아무 비밀번호와도 안 맞음, cost 12 = 실제 해시와 같은 시간)
    private const DUMMY_HASH = '$2y$12$5V3w3eZY8JJSwqn3VC3K2eQxvE8.6KJ98CLRihwnhljbzsxgzGVma';

    // ★ v18.67 (리뷰 반영) 입력 모양만 바꿔서 같은 계정을 찾게 하는 우회 차단.
    //   DB 비교(utf8mb4_unicode_ci)는 악센트·대소문자·보이지 않는 글자(U+200C, 제어문자 등)를 무시해서,
    //   "다르게 생긴 입력 = 같은 계정"인데 잠금·횟수는 입력 문자열 기준으로 따로 셌음.
    //   - 이메일: 출력 가능한 ASCII만(로컬 MySQL로 확인 — 이 범위에선 대소문자 말고 같게 보는 글자가 없음)
    //   - 휴대폰 번호(아이디·비밀번호 찾기): 숫자와 하이픈만. 조회·키는 숫자만 남긴 값으로
    //   (/D: 끝의 줄바꿈도 허용 안 함)
    private const ASCII_EMAIL_RULE = 'regex:/^[\x21-\x7E]+$/D';
    private const PHONE_INPUT_RULE = 'regex:/^[0-9-]{9,20}$/D'; // 앱은 숫자만 보냄(stripPhoneFormatting), 예전 하이픈 입력도 받음
    private const INPUT_MESSAGES = [
        'email.regex' => '이메일 주소는 영문으로 정확히 입력해주세요.',
        'phone.regex' => '휴대폰 번호는 숫자만 입력해주세요.',
    ];

    // ★ v18.68 회원가입 휴대폰 인증(디자인 AUTH_SIGNUP_PROFILE) — 가입 전에 문자 인증 필수
    //   ① send: 인증번호 문자(SmsGuard 거침) → ② verify: 맞히면 phone_token(30분, 한 번만) → ③ register: phone_token 같이 보냄
    private const SIGNUP_PURPOSE       = 'signup';
    private const SIGNUP_TOKEN_MINUTES = 30;
    private const MOBILE_RE            = '/^01[016789][0-9]{7,8}$/D'; // 숫자만 남긴 휴대폰 번호(앱 MOBILE_RE와 같음)
    private const MSG_PHONE_FORMAT     = '휴대폰 번호 형식이 맞지 않아요.';
    private const MSG_PHONE_TAKEN      = '이미 가입된 휴대폰 번호예요. 아이디 찾기에서 확인해주세요.';

    public function __construct(private readonly SmsServiceInterface $sms)
    {
    }

    // ────────────────────────────────────
    // 회원가입
    // POST /api/auth/register
    // ★ v18.68 휴대폰 문자 인증을 마친 번호로만 가입(phone_token 필수) + 주요 공정(main_work_types, 선택)
    //   예전엔 전화번호 칸에 아무 값이나 넣어도 가입돼서, 남의 번호로 가입해 두면 그 번호 주인은 가입이 막히고
    //   (번호 고유값) 아이디 찾기·비밀번호 재설정 문자가 엉뚱한 계정 기준으로 나갔음.
    // ────────────────────────────────────
    public function register(Request $request)
    {
        // 1. 입력값 검증
        $validated = $request->validate([
            'name'         => 'required|string|max:100',
            // ★ v18.67 출력 가능한 ASCII만 — 로그인이 ASCII 이메일만 받으므로 가입도 같게(악센트 이메일로 가입하면 로그인 불가)
            'email'        => ['required', 'email', self::ASCII_EMAIL_RULE, 'unique:users,email'],
            // ★ 아이디(이메일) 찾기를 이름+전화번호로 지원하기 위해 필수로 수집
            // ★ v18.68 숫자·하이픈만(아이디 찾기와 같은 규칙). 이미 가입된 번호인지는 아래에서 숫자만 남겨 비교(하이픈 저장된 옛 번호까지)
            'phone'        => ['required', 'string', 'max:20', self::PHONE_INPUT_RULE],
            'password'     => PasswordPolicy::rules(), // ★ v18.62 영문+특수문자 8~16자
            // ★ platform 필드 추가 — 'web' 또는 'mobile'
            'platform'     => 'required|in:web,mobile',
            // ★ 이용약관/개인정보처리방침 동의 — 체크 안 하면 가입 자체가 안 됨
            'agree_terms'  => 'required|accepted',
            // ★ v18.68 휴대폰 인증 토큰 — 없을 때는 아래에서 "앱 업데이트" 안내(예전 앱)라 여기선 nullable
            'phone_token'  => 'nullable|string|max:200',
            // ★ v18.68 주요 공정(디자인 칩: 도배·타일·필름·도장·목공·기타) — 선택 안 해도 됨, 최대 10개·각 30자
            'main_work_types'   => 'nullable|array|max:10',
            'main_work_types.*' => 'required|string|max:30',
        ], PasswordPolicy::messages() + self::INPUT_MESSAGES);

        // 2. web으로 가입은 허용하지 않음 (운영자는 콘솔에서 수동 생성)
        if ($validated['platform'] === 'web') {
            return ApiResponse::error(
                '웹 관리자에서는 회원가입이 지원되지 않습니다. 모바일 앱을 이용해주세요.',
                'ERR_AUTH_006',
                403
            );
        }

        // ★ v18.68 휴대폰 인증 확인 — 인증한 번호(숫자만)와 지금 입력한 번호가 같아야 함.
        //   토큰은 가입이 끝난 뒤에만 지움 → 이메일 중복 같은 입력 오류는 고쳐서 다시 보내면 됨(30분 안)
        if (empty($validated['phone_token'])) {
            return ApiResponse::error('휴대폰 인증을 먼저 해주세요. 앱을 최신 버전으로 업데이트해야 할 수 있어요.', ErrorCode::AUTH_PHONE_UNVERIFIED, 422);
        }
        $tokenKey = self::signupTokenKey($validated['phone_token']);
        $verified = Cache::get($tokenKey);
        $digits = self::phoneDigits($validated['phone']);
        if (!is_array($verified) || !hash_equals((string) ($verified['phone'] ?? ''), $digits)) {
            return ApiResponse::error('휴대폰 인증이 만료됐어요. 다시 인증해주세요.', ErrorCode::AUTH_PHONE_UNVERIFIED, 422);
        }
        // 인증한 뒤에 같은 번호로 다른 가입이 먼저 끝난 경우 — 이 토큰은 더 쓸 데가 없으니 지움(앱은 인증을 풀고 처음부터)
        if (self::phoneTaken($digits)) {
            Cache::forget($tokenKey);
            return ApiResponse::error(self::MSG_PHONE_TAKEN, ErrorCode::AUTH_PHONE_TAKEN, 409);
        }

        // ★ v18.68 주요 공정 — 같은 값 두 번은 하나로, 선택 안 했으면 null
        $workTypes = array_values(array_unique($validated['main_work_types'] ?? []));

        // 모든 모바일 가입자는 일단 '팀 없는 개인'으로 시작함 — team/freelancer는
        // 가입 시점에 고르는 게 아니라, 이후 팀을 만들거나(store) 가입하면(join)
        // 자연스럽게 바뀌는 상태값일 뿐임.
        // '팀 없는 개인'은 스스로가 자기 데이터의 manager이므로 role_id=2를 줘야
        // 일정/현장 CUD(manager 이상 전용)를 본인 힘으로 할 수 있음.
        try {
            $user = User::create([
                'name'      => $validated['name'],
                'email'     => $validated['email'],
                'phone'     => $digits, // ★ v18.68 숫자만 저장(인증한 번호)
                'password'  => Hash::make($validated['password']),
                'role_id'   => 2,
                'user_type' => 'freelancer',
                'main_work_types' => $workTypes ?: null,
            ]);
        } catch (UniqueConstraintViolationException $e) {
            // ★ v18.68 검사와 저장 사이에 같은 번호·이메일로 먼저 가입된 경우(같은 토큰으로 동시에 두 번 보낸 요청 등)
            if (self::phoneTaken($digits)) {
                Cache::forget($tokenKey);
                return ApiResponse::error(self::MSG_PHONE_TAKEN, ErrorCode::AUTH_PHONE_TAKEN, 409);
            }
            $request->validate(['email' => 'unique:users,email']); // 이메일이면 평소와 같은 422(errors.email)
            throw $e;
        }
        Cache::forget($tokenKey); // ★ v18.68 가입이 끝난 토큰은 다시 못 씀

        // 3. 가입 즉시 로그인 처리 — 로그인 화면 재진입 없이 바로 앱 사용 가능
        $token = $user->createToken('auth-token')->plainTextToken;

        return ApiResponse::success([
            'user'  => $user,
            'token' => $token,
        ], '회원가입이 완료되었습니다.', 201);
    }

    // ────────────────────────────────────
    // ★ v18.68 회원가입 휴대폰 인증 — ① 인증번호 받기
    // POST /api/auth/signup/phone/send  {phone}
    //   200 {minutes:3} / 422 ERR_VALID_001 형식 / 409 ERR_AUTH_019 이미 가입된 번호 / 429 대기·상한·잠금 / 503 발송 실패
    //   아무 번호로나 보낼 수 있어서(로그인 전) 발송 제한은 전부 SmsGuard: 같은 번호 60초 대기, 번호별 하루 5통(용도 합산 10통),
    //   IP별 하루 요청 20번, 서비스 전체 하루 문자 상한 + 가입 인증 전용 상한(config verification.global_purpose_daily.signup)
    // ────────────────────────────────────
    public function signupPhoneSend(Request $request)
    {
        $digits = self::signupPhone($request->input('phone'));
        if ($digits === null) {
            return self::phoneFormatError();
        }

        // 요청 단위 제한(IP 하루 요청 수·서비스 전체 상한) — 가입 여부를 보기 전에 셈.
        //   "이미 가입된 번호" 응답으로 번호를 대입해 가입 여부를 훑는 것도 IP당 하루 20번으로 묶임
        if ($limited = SmsGuard::checkRequest(SmsGuard::SMS, self::SIGNUP_PURPOSE)) {
            return $limited;
        }
        if (self::phoneTaken($digits)) {
            return ApiResponse::error(self::MSG_PHONE_TAKEN, ErrorCode::AUTH_PHONE_TAKEN, 409);
        }
        if ($locked = VerificationCode::lockedResponse(self::SIGNUP_PURPOSE, $digits)) {
            return $locked;
        }
        // 60초 대기·하루 상한이면 429(대기는 data.retry_after), 발송 실패면 503 — 보내기에 성공해야 인증번호 저장
        $fail = SmsGuard::sendCode(SmsGuard::SMS, self::SIGNUP_PURPOSE, $digits, null, function (string $code) use ($digits) {
            $this->sms->send($digits, "[현장메이트] 회원가입 인증번호는 {$code} 입니다. (" . VerificationCode::TTL_MINUTES . "분간 유효)");
        });
        if ($fail) {
            return $fail;
        }

        return ApiResponse::success(['minutes' => VerificationCode::TTL_MINUTES], '인증번호를 보냈어요.');
    }

    // ────────────────────────────────────
    // ★ v18.68 회원가입 휴대폰 인증 — ② 인증번호 확인 → phone_token(30분, 가입 한 번)
    // POST /api/auth/signup/phone/verify  {phone, code}
    //   200 {phone_token, expires_in:1800} / 422 ERR_AUTH_010 틀림·만료 / 429 ERR_AUTH_017 잠금
    //   틀린 횟수는 VerificationCode가 번호+용도별로 1시간 누적(5번 → 5분 잠금, 10번 → 1시간 잠금)
    // ────────────────────────────────────
    public function signupPhoneVerify(Request $request)
    {
        $digits = self::signupPhone($request->input('phone'));
        if ($digits === null) {
            return self::phoneFormatError();
        }
        if ($locked = VerificationCode::lockedResponse(self::SIGNUP_PURPOSE, $digits)) {
            return $locked;
        }

        $wrong = fn() => ApiResponse::error('인증번호가 맞지 않아요. 다시 확인해주세요.', ErrorCode::AUTH_CODE_INVALID, 422);
        $code = $request->input('code');
        $code = is_int($code) ? (string) $code : $code;
        if (!is_string($code) || !preg_match('/^[0-9]{6}$/D', $code)) {
            return $wrong(); // 6자리 숫자가 아니면 맞을 수 없음(틀린 횟수는 안 셈)
        }
        if (VerificationCode::consume(self::SIGNUP_PURPOSE, $digits, $code) === null) {
            return VerificationCode::lockedResponse(self::SIGNUP_PURPOSE, $digits) ?? $wrong();
        }

        // 원문 토큰은 앱에만, 캐시 키는 sha1(토큰) — 캐시(실서버 DB)가 새어도 토큰을 못 씀
        $token = Str::random(64);
        Cache::put(self::signupTokenKey($token), ['phone' => $digits], now()->addMinutes(self::SIGNUP_TOKEN_MINUTES));

        return ApiResponse::success([
            'phone_token' => $token,
            'expires_in'  => self::SIGNUP_TOKEN_MINUTES * 60,
        ], '휴대폰 인증을 완료했어요.');
    }

    /** ★ v18.68 가입 인증 번호 입력 → 숫자만(숫자·하이픈만 받음). 휴대폰 번호 형식이 아니면 null */
    private static function signupPhone($raw): ?string
    {
        if (!is_string($raw) || !preg_match('/^[0-9-]{10,20}$/D', $raw)) {
            return null;
        }
        $digits = self::phoneDigits($raw);
        return preg_match(self::MOBILE_RE, $digits) ? $digits : null;
    }

    private static function phoneFormatError()
    {
        return response()->json([
            'success'    => false,
            'message'    => self::MSG_PHONE_FORMAT,
            'error_code' => ErrorCode::VALID_GENERAL,
            'errors'     => ['phone' => [self::MSG_PHONE_FORMAT]],
        ], 422);
    }

    /**
     * ★ v18.68 이미 가입된 번호인가 — 숫자만/하이픈(010-1234-5678) 두 모양 모두 비교.
     *   탈퇴하면 번호를 지우므로(v18.62) 탈퇴 계정 번호로는 다시 가입 가능. 번호가 남아 있는 삭제 계정(그 전 탈퇴분)은
     *   DB 고유값에 걸려 어차피 가입이 안 되므로 "가입된 번호"로 봄(문자를 보내고 마지막 단계에서 막히지 않게).
     */
    private static function phoneTaken(string $digits): bool
    {
        return User::withTrashed()->whereIn('phone', self::phoneVariants($digits))->exists();
    }

    private static function signupTokenKey(string $token): string
    {
        return 'signup_phone_token:' . sha1($token);
    }

    // ────────────────────────────────────
    // 로그인
    // POST /api/auth/login
    // ────────────────────────────────────
    public function login(Request $request)
    {
        // 1. 입력값 검증
        $request->validate([
            'email'    => ['required', 'email', self::ASCII_EMAIL_RULE], // ★ v18.67 악센트·보이지 않는 글자로 같은 계정 찾기 차단
            'password' => 'required',
            // ★ platform 필드 추가
            'platform' => 'required|in:web,mobile',
        ], self::INPUT_MESSAGES);

        // 2. 이메일로 사용자 찾기
        $user = User::with('role')->where('email', $request->email)->first();

        // ★ v18.67 계정 단위 로그인 실패 잠금 — IP를 바꿔 가며 한 계정에 비밀번호를 대입하는 것 방지.
        //   15분 안에 10번 틀리면 15분 잠금(IP 상관없음). 없는 이메일도 똑같이 세서 가입 여부가 안 드러남.
        //   잠금이 짧아서 남이 일부러 틀려도 주인이 오래 못 쓰게 되진 않음. 맞히면 횟수 초기화.
        //   (리뷰 반영) 키를 입력 문자열이 아니라 찾은 계정 id로 — 예전엔 악센트만 다른 이메일이 같은 계정을 찾으면서
        //   잠금은 따로 셌음(잠긴 뒤에도 다른 모양으로 계속 대입). 계정이 없을 때만 소문자로 맞춘 입력으로 셈.
        //   (위 ASCII 검사로 "같은 계정을 찾는 입력 = 소문자가 같은 입력"이라 두 방식이 갈라지지 않음)
        $who = $user ? 'user:' . $user->id : sha1(mb_strtolower(trim((string) $request->email)));
        $failKey = "login_fail:{$who}";
        $lockKey = "login_lock:{$who}";
        if (($until = (int) Cache::get($lockKey, 0)) > time()) {
            $min = max(1, (int) ceil(($until - time()) / 60));
            return ApiResponse::error("로그인을 여러 번 실패해서 잠시 막혔어요. {$min}분 뒤에 다시 시도해주세요.", ErrorCode::TOO_MANY_REQUESTS, 429);
        }

        // 3. 이메일 또는 비밀번호 불일치 확인
        // ★ v18.67 없는 이메일·비밀번호 없는(소셜) 계정도 같은 bcrypt 검사를 거쳐 응답 시간으로 가입 여부가 안 드러나게
        $hash = $user?->password ?: self::DUMMY_HASH;
        if (!Hash::check((string) $request->password, $hash) || !$user || !$user->password) {
            Cache::add($failKey, 0, now()->addMinutes(self::LOGIN_FAIL_MINUTES)); // DB 캐시는 없는 키를 increment 못 함
            if ((int) Cache::increment($failKey) >= self::LOGIN_MAX_FAILS) {
                Cache::forget($failKey);
                Cache::put($lockKey, time() + self::LOGIN_FAIL_MINUTES * 60, now()->addMinutes(self::LOGIN_FAIL_MINUTES));
            }
            return ApiResponse::error('이메일 또는 비밀번호가 틀렸습니다.', 'ERR_AUTH_001', 401);
        }
        Cache::forget($failKey);

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
            'auth_code'   => 'nullable|string', // ★ v18.64 Apple authorization code → 갱신 토큰(탈퇴 revoke용)
        ]);

        $profile = SocialAuthService::verify($data['provider'], $data['token']);
        if ($profile && $data['provider'] === 'apple' && !empty($data['auth_code'])) {
            $profile['rt'] = SocialRevokeService::appleExchange($data['auth_code']);
        }
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
            // ★ v18.62 보안 — 자동 연결은 ① 소셜 쪽에서 인증된 이메일이고 ② 기존 계정이 비밀번호 없는 소셜 가입 계정일 때만.
            //   이메일 가입은 이메일 인증을 안 해서, 남이 내 이메일로 먼저 가입해 두면 내가 구글로 로그인할 때
            //   그 사람 계정에 붙어 버리는 "선점 탈취"가 가능했음. 이메일 가입 계정이면 "이미 계정이 있어요"로
            //   비밀번호 로그인을 거쳐 연결(needs_signup 화면).
            $existing = ($profile['email'] && !empty($profile['email_verified']))
                ? User::where('email', $profile['email'])->where('user_type', '!=', 'operator')->whereNull('password')->first()
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

        // ★ v18.68 보안(리뷰 반영) — "이미 계정이 있어요"를 소셜 로그인으로 통과해 티켓의 소셜을 연결하는 건
        //   비밀번호도 인증번호 받을 곳(휴대폰·이메일)도 없는 계정만 — /me/reauth의 소셜 다시 로그인과 같은 규칙.
        //   예전엔 잠금 풀린 폰을 쥔 사람이 자기 구글로 티켓을 받고 → 주인의 카카오(카카오톡 한 번 탭)로 로그인하면
        //   본인 확인 없이 자기 구글이 주인 계정에 붙어, 나중에 그 구글로 언제든 들어올 수 있었음(로그인 연결 관리의 본인 확인 우회).
        //   비밀번호가 있으면 이메일·비밀번호 로그인(/auth/login + link_ticket — 비밀번호를 앎 = 본인 확인)으로 연결하고,
        //   아니면 로그인한 뒤 로그인 연결 관리에서 인증번호로 확인하고 연결. 로그인 토큰도 안 줌(앱은 메시지만 보여 줌).
        if ($linking && ($user->password || Reauth::channels($user))) {
            return ApiResponse::error(
                $user->password
                    ? '이 계정은 이메일·비밀번호로 로그인해야 연결할 수 있어요. 또는 로그인한 뒤 내 정보 › 로그인 연결 관리에서 본인 확인 후 연결해주세요.'
                    : '이 계정은 로그인한 뒤 내 정보 › 로그인 연결 관리에서 본인 확인 후 연결해주세요.',
                ErrorCode::AUTH_REAUTH_REQUIRED,
                422
            );
        }
        if ($linking && ($fail = $this->attachTicket($user, $data['link_ticket']))) {
            return $fail;
        }
        if ($data['provider'] === 'apple') {
            SocialAuthService::saveAppleToken($user, $profile['rt'] ?? null);
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
        if ($ticket['p'] === 'apple') {
            SocialAuthService::saveAppleToken($user, $ticket['rt'] ?? null);
        }

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
        // ★ v18.67 보안 — 소셜 쪽에서 인증된 이메일만 계정 이메일로 저장. 인증 안 된 이메일(남의 주소로 만든 구글·카카오 계정)을
        //   저장하면, 나중에 진짜 주인이 인증된 같은 이메일의 다른 소셜로 처음 로그인할 때 자동 연결로 이 계정에 들어와 버림(선점 탈취).
        //   인증 여부를 모르는 예전 연결 티켓(배포 전 15분)도 인증 안 된 것으로 봄.
        $email = !empty($profile['email_verified']) ? ($profile['email'] ?? null) : null;
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
        if (!$why && $ticket['p'] === 'apple') {
            SocialAuthService::saveAppleToken($user, $ticket['rt'] ?? null);
        }
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
     * 6자리 인증번호 문자 발송 + (성공하면) 저장. ★ v18.63 유효 3분, 5번 틀리면 5분 잠금(App\Services\VerificationCode)
     * ★ v18.67 SmsGuard 거침 — 같은 번호+용도 60초 대기, 번호별·하루 상한, 서비스 전체 상한.
     *   예전엔 번호를 먼저 저장하고 보냈어서 발송이 실패해도 번호가 생겼음 → 이제 보내기에 성공해야 저장.
     * @return \Illuminate\Http\JsonResponse|null 막히거나 발송 실패면 에러 응답(429/503), 보냈으면 null
     */
    private function issueVerificationCode(string $phone, string $purpose, ?string $payload = null)
    {
        return SmsGuard::sendCode(SmsGuard::SMS, $purpose, $phone, null, function (string $code) use ($phone) {
            $this->sms->send($phone, "[현장메이트] 인증번호는 {$code} 입니다. (" . VerificationCode::TTL_MINUTES . "분간 유효)");
        }, $payload);
    }

    /**
     * @return string|null 코드가 유효하면 payload(없으면 빈 문자열), 아니면 null
     */
    private function consumeVerificationCode(string $phone, string $purpose, string $code): ?string
    {
        return VerificationCode::consume($purpose, $phone, $code);
    }

    /** ★ v18.67 숫자만 남김 — 인증번호·발송 제한 키와 문자 받는 번호(SOLAPI도 숫자만 남겨 보냄) */
    private static function phoneDigits(?string $phone): string
    {
        return preg_replace('/\D/', '', (string) $phone);
    }

    /** ★ v18.67 숫자만 남긴 번호 → DB에서 찾을 모양 [01012345678, 010-1234-5678] (예전에 하이픈 넣어 저장된 번호도 찾게) */
    private static function phoneVariants(string $digits): array
    {
        if (strlen($digits) < 9) {
            return []; // "---------"처럼 숫자가 거의 없는 입력 — 아무 계정도 안 찾음(whereIn 빈 배열 = 결과 없음)
        }
        $dashed = strlen($digits) === 11
            ? substr($digits, 0, 3) . '-' . substr($digits, 3, 4) . '-' . substr($digits, 7)
            : substr($digits, 0, 3) . '-' . substr($digits, 3, 3) . '-' . substr($digits, 6);
        return array_values(array_unique([$digits, $dashed]));
    }

    /**
     * ★ v18.67 인증번호에 담아 둔 계정 찾기 + 지금도 그 번호인지 확인.
     *   payload가 숫자면 계정 id(v18.67부터), 아니면 배포 직전에 받은 번호(유효 3분)의 예전 값 — $legacy로 찾음.
     */
    private static function userFromPayload(string $payload, string $digits, callable $legacy): ?User
    {
        $user = ctype_digit($payload) ? User::find((int) $payload) : $legacy($payload);
        return ($user && self::phoneDigits($user->phone) === $digits) ? $user : null;
    }

    // ────────────────────────────────────
    // 아이디 찾기 — 1단계: 이름+전화번호로 계정 확인 후 인증코드 발송
    // POST /api/auth/find-email/request
    // ────────────────────────────────────
    public function findEmailRequest(Request $request)
    {
        $data = $request->validate([
            'name'  => 'required|string|max:100',
            'phone' => ['required', 'string', self::PHONE_INPUT_RULE], // ★ v18.67 숫자·하이픈만
        ], self::INPUT_MESSAGES);

        // ★ v18.67 요청 단위 제한(IP 하루 요청 수·서비스 전체 상한) — 계정을 찾기 전에 셈
        if ($limited = SmsGuard::checkRequest(SmsGuard::SMS, 'find_email')) {
            return $limited;
        }

        // ★ v18.67 숫자만 남긴 번호로 찾음(입력 그대로 비교하지 않음)
        $user = User::where('name', $data['name'])
            ->whereIn('phone', self::phoneVariants(self::phoneDigits($data['phone'])))
            ->first();

        if (!$user) {
            return ApiResponse::error(
                '일치하는 계정을 찾을 수 없습니다.',
                ErrorCode::AUTH_ACCOUNT_NOT_FOUND,
                404
            );
        }

        // ★ v18.67 (리뷰 반영) 잠금·대기·상한 키와 받는 번호는 입력이 아니라 찾은 계정에 저장된 번호(숫자만).
        //   payload = 계정 id → 2단계에서 이 계정의 이메일만 알려줌
        $target = self::phoneDigits($user->phone);
        if ($locked = VerificationCode::lockedResponse('find_email', $target)) {
            return $locked;
        }
        // ★ v18.67 60초 대기·하루 상한에 걸리면 429(남은 초는 data.retry_after), 발송 실패면 503
        if ($fail = $this->issueVerificationCode($target, 'find_email', (string) $user->id)) {
            return $fail;
        }

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
            'phone' => ['required', 'string', self::PHONE_INPUT_RULE], // ★ v18.67 숫자·하이픈만
            'code'  => 'required|string|size:6',
        ], self::INPUT_MESSAGES);

        // ★ v18.67 키는 숫자만 남긴 번호(1단계에서 저장된 번호를 숫자만 남긴 것과 같음) — 입력 모양을 바꿔도 같은 잠금·같은 번호
        $digits = self::phoneDigits($data['phone']);
        if ($locked = VerificationCode::lockedResponse('find_email', $digits)) {
            return $locked;
        }
        $payload = $this->consumeVerificationCode($digits, 'find_email', $data['code']);
        if ($payload === null) {
            if ($locked = VerificationCode::lockedResponse('find_email', $digits)) {
                return $locked;
            }
            return ApiResponse::error('인증번호가 올바르지 않거나 만료되었습니다.', ErrorCode::AUTH_CODE_INVALID, 422);
        }

        // ★ v18.67 1단계에서 찾은 계정(인증번호에 담긴 id). 예전 형식(빈 값)이면 이름+번호로
        $user = self::userFromPayload($payload, $digits, fn() => User::where('name', $data['name'])
            ->whereIn('phone', self::phoneVariants($digits))->first());
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
            'email' => ['required', 'email', self::ASCII_EMAIL_RULE], // ★ v18.67 ASCII만
            'name'  => 'required|string|max:100',
            'phone' => ['required', 'string', self::PHONE_INPUT_RULE], // ★ v18.67 숫자·하이픈만
        ], self::INPUT_MESSAGES);

        // ★ v18.67 요청 단위 제한(IP 하루 요청 수·서비스 전체 상한) — 계정이 있든 없든 똑같이 셈(응답 차이로 가입 여부가 안 드러나게)
        if ($limited = SmsGuard::checkRequest(SmsGuard::SMS, 'reset_password')) {
            return $limited;
        }

        $digits = self::phoneDigits($data['phone']);
        $user = User::where('email', $data['email'])
            ->where('name', $data['name'])
            ->whereIn('phone', self::phoneVariants($digits)) // ★ v18.67 숫자만 남긴 번호로 찾음
            ->first();

        // 계정 존재/일치 여부를 노출하지 않기 위해, 없어도 항상 같은 성공 응답을 줌
        // (실제 코드 발급/발송은 셋 다 일치할 때만)
        // ★ v18.67 잠금 확인은 숫자만 남긴 입력으로(계정이 있든 없든 같은 키 — 계정이 있으면 저장된 번호의 숫자와 같음)
        if ($locked = VerificationCode::lockedResponse('reset_password', $digits)) {
            return $locked;
        }
        if ($user) {
            // ★ v18.67 번호별 60초 대기·하루 상한에 걸리거나 발송이 실패해도 응답은 똑같이 "발송했습니다"(조용히 안 보냄).
            //   여기서만 429/503을 주면 "이 이메일+이름+번호 계정이 있다"가 드러남. 대기 중이면 직전 번호(3분)가 그대로 유효.
            //   (발송 실패는 SmsGuard가 오류 로그를 남김)
            // ★ v18.67 (리뷰 반영) 키·받는 번호는 찾은 계정에 저장된 번호(숫자만), payload = 계정 id(2단계는 이 id로 계정을 찾음)
            $this->issueVerificationCode(self::phoneDigits($user->phone), 'reset_password', (string) $user->id);
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
            'phone'    => ['required', 'string', self::PHONE_INPUT_RULE], // ★ v18.67 숫자·하이픈만
            'code'     => 'required|string|size:6',
            'password' => PasswordPolicy::rules(),
        ], PasswordPolicy::messages() + self::INPUT_MESSAGES);

        // ★ v18.67 키는 숫자만 남긴 번호 — 입력 모양을 바꿔도 같은 틀린 횟수·잠금·인증번호
        $digits = self::phoneDigits($data['phone']);
        if ($locked = VerificationCode::lockedResponse('reset_password', $digits)) {
            return $locked;
        }
        $payload = $this->consumeVerificationCode($digits, 'reset_password', $data['code']);
        if (!$payload) {
            if ($locked = VerificationCode::lockedResponse('reset_password', $digits)) {
                return $locked;
            }
            return ApiResponse::error('인증번호가 올바르지 않거나 만료되었습니다.', ErrorCode::AUTH_CODE_INVALID, 422);
        }

        // ★ v18.67 (리뷰 반영) 인증번호에 담긴 계정 id로 찾음(입력으로 다시 찾지 않음) + 지금도 같은 번호인지 확인.
        //   배포 직전에 받은 번호(유효 3분)는 payload가 이메일 — 예전처럼 이메일로 찾음
        $user = self::userFromPayload($payload, $digits, fn(string $email) => User::where('email', $email)->first());
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
    // ────────────────────────────────────
    // ★ v18.63 — 탈퇴 본인 확인 방법 안내 + 인증번호 발송
    // POST /api/account/withdraw-request  {send?: bool, channel?: phone|email}
    //   - 비밀번호 있음 → method=password (앱이 비밀번호 입력칸)
    //   - 비밀번호 없음(소셜 가입) → method=code(문자·이메일 인증번호 중 선택) 또는 social(둘 다 없으면 소셜 재로그인)
    //   본인 확인 처리는 App\Services\Reauth(처음 비밀번호 설정과 공용)
    // ────────────────────────────────────
    public function withdrawRequest(Request $request)
    {
        $user = $request->user();
        if ($user->password) {
            return ApiResponse::success(['method' => 'password', 'channels' => [], 'providers' => [], 'minutes' => VerificationCode::TTL_MINUTES]);
        }

        // send=true일 때만 발송(탈퇴 창을 열기만 해선 안 보냄)
        if ($request->boolean('send')) {
            $channel = (string) $request->input('channel');
            if ($fail = Reauth::send('withdraw', '회원 탈퇴', $channel, $user, $this->sms)) {
                return $fail;
            }
            return ApiResponse::success(Reauth::info($user), '인증번호를 보냈어요.');
        }

        return ApiResponse::success(Reauth::info($user), '본인 확인 방법을 알려드려요.');
    }

    public function withdraw(Request $request)
    {
        $user = $request->user();

        // ★ v18.63 — 비밀번호 없는 소셜 가입자는 전화번호(문자) 또는 이메일 인증번호로 본인 확인(둘 다 없으면 소셜 재로그인)
        //   (예전 v18.61까진 비밀번호가 없으면 탈퇴 자체가 불가능했음 — 애플 심사 5.1.1(v) 앱 안 계정 삭제 필수)
        if ($user->password) {
            $data = $request->validate(['password' => 'required|string']);
            // ★ v18.68 리뷰 반영 — 틀린 횟수·잠금을 /me/reauth·비밀번호 변경과 같이 셈(Reauth::checkPassword, 잠기면 429 ERR_AUTH_017)
            if ($fail = Reauth::checkPassword($user, $data['password'], '비밀번호가 일치하지 않습니다.')) {
                return $fail;
            }
        } elseif ($fail = Reauth::check('withdraw', $user, $request->only('channel', 'code', 'provider', 'token'))) {
            return $fail;
        }

        DB::table('team_members')
            ->where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->update(['deleted_at' => now()]);

        $user->tokens()->delete();
        DB::table('device_tokens')->where('user_id', $user->id)->delete(); // ★ v18.62 탈퇴 후 푸시 안 가게

        // ★ v18.64 — 카카오 연결 끊기 / Apple 토큰 revoke(애플 심사 필수). 실패해도 탈퇴는 진행
        foreach (['kakao', 'apple'] as $p) {
            if ($user->{SocialAuthService::column($p)}) {
                SocialAuthService::disconnect($user, $p);
            }
        }

        // ★ v18.67 — 공개 명함·프로필 사진·보고서 공유 링크·문의 첨부·원래 이메일 정리(AccountCleanupService)
        app(\App\Services\AccountCleanupService::class)->onWithdraw($user);

        // ★ v18.62 — 탈퇴한 계정에 남아 있던 연락처·소셜 연결 지움. 남겨 두면
        //   ① 같은 전화번호·같은 소셜 계정으로 다시 가입이 막히고(고유값 충돌) ② 필요 없는 개인정보를 계속 보관하게 됨.
        //   이름은 팀원들의 과거 일정·정산 기록에 표시돼야 해서 남김.
        $user->forceFill([
            // 이메일은 위 AccountCleanupService가 withdrawn_{id}_{시각}@deleted.local로 바꿈(재가입 가능, 원래 이메일 안 남김)
            'phone'           => null,
            'kakao_talk_id'   => null,
            'google_id'       => null,
            'kakao_id'        => null,
            'apple_id'        => null,
            'google_linked_at' => null,
            'kakao_linked_at'  => null,
            'apple_linked_at'  => null,
            'apple_refresh_token' => null,
            // ★ v18.68 리뷰 반영 — 비밀번호 해시·자동 로그인 토큰도 지움(계정 삭제 안내 "비밀번호와 로그인 토큰" 삭제와 같게).
            //   본인 확인이 다 끝난 여기서 지움(AccountCleanupService에서 지우면 그 함수를 확인 전에 불렀을 때 비밀번호 확인이 깨짐)
            'password'        => null,
            'remember_token'  => null,
        ])->save();
        $user->delete(); // SoftDeletes

        return ApiResponse::success(null, '회원 탈퇴가 완료되었습니다.');
    }
}
