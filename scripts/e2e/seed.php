<?php
/**
 * iOS 시뮬레이터 E2E(.github/workflows/ios-sim-e2e.yml)용 가상 데이터 만들기.
 *
 *   ※ CI 러너 안의 로컬 백엔드(http://127.0.0.1:8000, 빈 MySQL)에서만 씀. 실서버(workmatekr.com)에는 절대 쓰지 않음.
 *   ※ 비밀번호는 실행할 때마다 무작위로 만들고, 리포지토리에는 남기지 않음.
 *      만든 계정 정보는 E2E_ACCOUNTS_FILE(작업 안에서만 읽는 파일, 권한 600)에 KEY=VALUE로 씀.
 *
 * 만드는 것(전부 가상의 사람·주소):
 *   - 팀장 1명: 이메일+비밀번호 + 카카오 연결(가짜 kakao_id) + 휴대폰 → 로그인 연결 관리에서 [해제] → 본인 확인 시트를 볼 수 있음
 *   - 팀 1개(팀원 2명, 그중 1명은 부팀장)
 *   - 현장 2곳, 일당이 든 팀 일정 여러 개(어제·오늘·내일·다음 주) + 개인 일정 1개
 *   - 발송(sent) 상태 견적 1건(희망 시공일 있음) — 견적 상세의 완료(승인) 안내 확인용
 *   - 공개 명함 1장
 *
 * 사용:  php scripts/e2e/seed.php   (작업 폴더는 리포지토리 최상위, 백엔드 서버가 이미 떠 있어야 함)
 *   환경변수: E2E_API_BASE(기본 http://127.0.0.1:8000/api), E2E_ACCOUNTS_FILE(기본 ./e2e-accounts.env)
 *
 * 데이터는 실제 앱과 같은 API(팀 만들기·초대 코드 참여·부팀장 지정·현장·일정·견적·명함)로 만듦 → 앱이 만든 데이터와 모양이 같음.
 * 사용자 행만 직접 만듦(회원가입 API는 문자 인증이 필요해서) — 회원가입 컨트롤러와 같은 값(role_id 2, user_type freelancer).
 */

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

$root = dirname(__DIR__, 2);
require $root . '/backend/vendor/autoload.php';
$app = require $root . '/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$api = rtrim(getenv('E2E_API_BASE') ?: 'http://127.0.0.1:8000/api', '/');
$accountsFile = getenv('E2E_ACCOUNTS_FILE') ?: ($root . '/e2e-accounts.env');

// 안전장치: 로컬 주소가 아니면 아무것도 하지 않음
$host = parse_url($api, PHP_URL_HOST);
if (!in_array($host, ['127.0.0.1', 'localhost', '::1'], true)) {
    fwrite(STDERR, "seed.php: 로컬 백엔드에서만 실행합니다(E2E_API_BASE={$api})\n");
    exit(2);
}
if (DB::connection()->getDatabaseName() === '' || app()->environment('production')) {
    fwrite(STDERR, "seed.php: APP_ENV=production 에서는 실행하지 않습니다\n");
    exit(2);
}

function say(string $m): void { fwrite(STDOUT, "[seed] {$m}\n"); }

/** 비밀번호 규칙(영문+특수문자 8~16자)에 맞는 무작위 비밀번호 */
function randomPassword(): string
{
    return 'Qa!' . bin2hex(random_bytes(5)); // 13자
}

/** 로컬 API 호출(실패하면 응답을 보여 주고 멈춤) */
function call(string $method, string $path, ?string $token, array $body = []): array
{
    global $api;
    $req = Http::acceptJson()->timeout(30);
    if ($token) {
        $req = $req->withToken($token);
    }
    $res = $method === 'GET' ? $req->get($api . $path, $body) : $req->send($method, $api . $path, ['json' => $body]);
    if (!$res->successful()) {
        fwrite(STDERR, "[seed] {$method} {$path} 실패: HTTP {$res->status()} " . $res->body() . "\n");
        exit(1);
    }
    return $res->json() ?? [];
}

// ── 0. 기본 데이터(실서버 배포 때와 같음: roles + work_types) ──
if (DB::table('roles')->count() === 0) {
    DB::table('roles')->insert([
        ['id' => 1, 'name' => 'superadmin', 'permissions' => null, 'created_at' => now(), 'updated_at' => now()],
        ['id' => 2, 'name' => 'manager',    'permissions' => null, 'created_at' => now(), 'updated_at' => now()],
        ['id' => 3, 'name' => 'member',     'permissions' => null, 'created_at' => now(), 'updated_at' => now()],
    ]);
    say('roles 3개 넣음');
}
if (DB::table('work_types')->count() === 0) {
    fwrite(STDERR, "[seed] work_types가 비어 있음 — 먼저 php artisan db:seed --class=WorkTypeSeeder\n");
    exit(1);
}
$dobaeId = (int) DB::table('work_types')->whereNull('team_id')->where('name', '도배')->value('id');
$filmId  = (int) DB::table('work_types')->whereNull('team_id')->where('name', '필름')->value('id');

// ── 1. 사용자 3명(가상) ──
$people = [
    'LEADER'  => ['name' => '한예시', 'email' => 'leader.e2e@example.com',  'phone' => '01099990001'],
    'MEMBER1' => ['name' => '오가상', 'email' => 'member1.e2e@example.com', 'phone' => '01099990002'],
    'MEMBER2' => ['name' => '윤샘플', 'email' => 'member2.e2e@example.com', 'phone' => '01099990003'],
];
$users = [];
$tokens = [];
$passwords = [];
foreach ($people as $key => $p) {
    if (User::where('email', $p['email'])->exists()) {
        fwrite(STDERR, "[seed] 이미 데이터가 있음({$p['email']}) — 빈 DB에서만 실행하세요\n");
        exit(1);
    }
    $passwords[$key] = randomPassword();
    $u = User::create([
        'name'      => $p['name'],
        'email'     => $p['email'],
        'phone'     => $p['phone'],
        'password'  => Hash::make($passwords[$key]),
        'role_id'   => 2,
        'user_type' => 'freelancer',
        'main_work_types' => ['도배', '필름'],
    ]);
    $users[$key] = $u;
    $tokens[$key] = $u->createToken('e2e-seed')->plainTextToken;
}
// 팀장은 카카오도 연결된 상태(가짜 id — 실제 카카오 계정 아님). 해제는 E2E에서 확인 창까지만 보고 취소함
$users['LEADER']->forceFill(['kakao_id' => 'e2e-fake-kakao-' . bin2hex(random_bytes(4)), 'kakao_linked_at' => now()->subDays(3)])->save();
say('사용자 3명 + 팀장 카카오 연결');

// ── 2. 팀(팀장) + 초대 코드로 팀원 2명 참여 + 부팀장 지정 ──
$team = call('POST', '/teams', $tokens['LEADER'], [
    'name' => '가상시공팀',
    'description' => 'E2E 점검용 가상 팀입니다.',
    'specialty' => '도배,필름',
    'activity_area' => '서울 가상구',
])['data'];
$teamId = (int) $team['id'];
$inviteCode = DB::table('teams')->where('id', $teamId)->value('invite_code');
call('POST', '/teams/join', $tokens['MEMBER1'], ['invite_code' => $inviteCode]);
call('POST', '/teams/join', $tokens['MEMBER2'], ['invite_code' => $inviteCode]);
call('PUT', "/teams/{$teamId}/members/{$users['MEMBER1']->id}/sub-leader", $tokens['LEADER'], ['enabled' => true]);
say("팀 {$teamId} + 팀원 2명(오가상=부팀장)");

// ── 3. 현장 2곳 ──
$today = now()->startOfDay();
$site1 = call('POST', '/sites', $tokens['LEADER'], [
    'address' => '서울특별시 가상구 예시로 12', 'apt_name' => '가상아파트', 'dong' => '101동', 'ho' => '1203호',
    'area_m2' => 84.5, 'customer' => '가상고객', 'team_id' => $teamId,
    'start_date' => $today->copy()->subDay()->toDateString(), 'end_date' => $today->copy()->addDays(7)->toDateString(),
])['data'];
$site2 = call('POST', '/sites', $tokens['LEADER'], [
    'address' => '서울특별시 가상구 샘플길 34', 'apt_name' => '샘플빌라', 'dong' => '2동', 'ho' => '301호',
    'area_m2' => 59.0, 'customer' => '샘플고객', 'team_id' => $teamId,
])['data'];
say('현장 2곳');

// ── 4. 일당이 든 팀 일정 + 개인 일정 ──
$all = [$users['LEADER']->id, $users['MEMBER1']->id, $users['MEMBER2']->id];
$schedules = [
    ['d' => -1, 'title' => '가상아파트 도배 철거', 'site' => $site1, 'wt' => $dobaeId, 'wage' => 230000, 'units' => 1.0, 'users' => $all],
    ['d' => 0,  'title' => '가상아파트 도배',      'site' => $site1, 'wt' => $dobaeId, 'wage' => 250000, 'units' => 1.0, 'users' => $all, 'start' => '08:00', 'end' => '17:00'],
    ['d' => 1,  'title' => '샘플빌라 필름',        'site' => $site2, 'wt' => $filmId,  'wage' => 240000, 'units' => 1.5, 'users' => [$users['LEADER']->id, $users['MEMBER2']->id]],
    ['d' => 7,  'title' => '샘플빌라 마감 도배',   'site' => $site2, 'wt' => $dobaeId, 'wage' => 250000, 'units' => 0.5, 'users' => [$users['MEMBER1']->id]],
];
foreach ($schedules as $s) {
    call('POST', '/schedules', $tokens['LEADER'], array_filter([
        'date' => $today->copy()->addDays($s['d'])->toDateString(),
        'title' => $s['title'],
        'site_id' => $s['site']['id'],
        'team_id' => $teamId,
        'work_type_id' => $s['wt'],
        'daily_wage' => $s['wage'],
        'work_units' => $s['units'],
        'user_ids' => $s['users'],
        'start_time' => $s['start'] ?? null,
        'end_time' => $s['end'] ?? null,
    ], fn($v) => $v !== null));
}
call('POST', '/schedules', $tokens['LEADER'], [
    'date' => $today->copy()->addDays(2)->toDateString(),
    'title' => '개인 견적 방문',
    'is_personal' => true,
    'address' => '서울특별시 가상구 예시로 56',
    'daily_wage' => 0,
    'start_time' => '10:00',
    'end_time' => '11:00',
]);
say('일정 5개');

// ── 5. 발송 상태 견적(희망 시공일 있음) ──
$quote = call('POST', '/quotes', $tokens['LEADER'], [
    'client_name' => '가상고객',
    'client_contact' => '010-9999-0100',
    'address' => '서울특별시 가상구 예시로 12 가상아파트 101동 1203호',
    'site_id' => $site1['id'],
    'work_type_id' => $dobaeId,
    'desired_date' => $today->copy()->addDays(10)->toDateString(),
    'tax_type' => 'separate',
    'memo' => 'E2E 점검용 가상 견적',
    'lines' => [
        ['name' => '실크 벽지 시공', 'spec' => '거실·방 3', 'quantity' => 30, 'unit' => '평', 'unit_price' => 25000],
        ['name' => '부자재', 'quantity' => 1, 'unit' => '식', 'unit_price' => 80000],
    ],
])['data'];
call('PATCH', "/quotes/{$quote['id']}/status", $tokens['LEADER'], ['status' => 'sent']);
say("견적 {$quote['id']} (발송)");

// ── 6. 공개 명함 ──
call('PUT', '/business-card', $tokens['LEADER'], [
    'display_name' => '한예시',
    'contact_phone' => '010-9999-0001',
    'job_title' => '도배 팀장',
    'years_experience' => 12,
    'service_area' => '서울 가상구',
    'specialty' => '도배,필름',
    'tagline' => '깔끔한 마감을 약속드려요 (가상 명함)',
    'is_public' => true,
    'showcase_mode' => 'none',
]);
say('공개 명함');

// 시드용 토큰은 지움(앱은 직접 로그인함)
foreach ($users as $u) {
    $u->tokens()->where('name', 'e2e-seed')->delete();
}

// ── 7. 계정 정보 파일(작업 안에서만) ──
$signupPw = randomPassword();
$lines = [
    'LEADER_EMAIL=' . $people['LEADER']['email'],
    'LEADER_PW=' . $passwords['LEADER'],
    'LEADER_NAME=' . $people['LEADER']['name'],
    'MEMBER1_EMAIL=' . $people['MEMBER1']['email'],
    'MEMBER1_PW=' . $passwords['MEMBER1'],
    'MEMBER2_EMAIL=' . $people['MEMBER2']['email'],
    'MEMBER2_PW=' . $passwords['MEMBER2'],
    'SIGNUP_EMAIL=signup.e2e.' . bin2hex(random_bytes(3)) . '@example.com',
    'SIGNUP_PW=' . $signupPw,
    'SIGNUP_PHONE=01099990077',
    'TEAM_NAME=가상시공팀',
    'QUOTE_ID=' . $quote['id'],
];
file_put_contents($accountsFile, implode("\n", $lines) . "\n");
@chmod($accountsFile, 0600);
say("계정 정보 → {$accountsFile} (권한 600)");
