<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'google_id',
        'kakao_id',
        // ★ v18.23 — 팀원 간 프로필/연락처 공유
        'avatar_color',
        'avatar_image_path',
        'kakao_talk_id',
        'role_id',
        'team_id',
        // ★ v1.9 추가 — 프리랜서 모드 지원
        'user_type',
        'individual_plan',
        'individual_plan_expires_at',
        // ★ v18.47 요금제(free·pro·team·team_pro) — config/plans.php, PlanService
        'plan',
        'plan_expires_at',
        // ★ v18.68 회원가입 '주요 공정'(복수 선택, 선택 안 하면 null)
        'main_work_types',
    ];
    protected $hidden = ['password', 'remember_token', 'operator_phone', 'apple_refresh_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'suspended_at' => 'datetime', // ★ v18.41 회원 관리 — 계정 정지
        'google_linked_at' => 'datetime', // ★ v18.51 로그인 연결 관리
        'kakao_linked_at' => 'datetime',
        'apple_linked_at' => 'datetime', // ★ v18.60
        'apple_refresh_token' => 'encrypted', // ★ v18.64 탈퇴 revoke용
        'password_set_at' => 'datetime', // ★ v18.56 운영자 관리
        'last_login_at' => 'datetime',
        'plan_expires_at' => 'datetime',
        'main_work_types' => 'array', // ★ v18.68 json 컬럼 → 문자열 배열
        'password' => 'hashed',
    ];

    // ── 관계 설정 ──

    /**
     * belongsTo: "이 User는 하나의 Role에 속한다"
     * User::find(1)->role  →  SELECT * FROM roles WHERE id = user.role_id
     */
    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * belongsTo: "이 User는 하나의 (활성) Team에 속한다"
     *   ★ v18.21부터 team_id는 "지금 활동 중인 팀"만 가리킴 — 실제 소속 팀
     *   전체는 teams()/teamIds() 참고 (여러 팀 동시 소속 가능).
     */
    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * ★ v18.21 — 여러 팀 동시 소속. team_members 중간 테이블을 통해 연결.
     *   $user->teams  →  이 사람이 소속된 모든 Team 목록
     */
    public function teams()
    {
        return $this->belongsToMany(Team::class, 'team_members')
                    ->withPivot('role_id', 'joined_at')
                    ->wherePivotNull('deleted_at')
                    ->withTimestamps();
    }

    /**
     * 이 사람이 소속된 모든 팀의 id 배열 (Schedule/Site의 "team" 스코프에서
     * 여러 팀 게시판을 한 캘린더로 합치는 데 사용).
     */
    public function teamIds(): array
    {
        return $this->teams()->pluck('teams.id')->all();
    }

    /**
     * ★ v18.44 — 팀별 역할로 권한 판단. 예전엔 전역 role_id(=활성 팀 역할) 하나로만 봐서,
     *   A팀 팀장·B팀 팀원인 사람이 B팀을 활성으로 두면 A팀 일을 못 했음.
     *   [team_id => role_id] (한 요청 안에서는 한 번만 조회)
     */
    private ?array $teamRoleMap = null;

    public function teamRoles(): array
    {
        // ★ v18.67 보안 — 운영자 계정은 팀 권한(팀장·부팀장) 없음. 혹시 팀에 들어가 있어도 앱 API에서 팀 관리 불가
        if ($this->isOperator()) {
            return $this->teamRoleMap = [];
        }
        return $this->teamRoleMap ??= \Illuminate\Support\Facades\DB::table('team_members')
            ->where('user_id', $this->id)
            ->whereNull('deleted_at')
            ->pluck('role_id', 'team_id')
            ->map(fn($r) => (int) $r)
            ->all();
    }

    /**
     * ★ v18.72 — 내가 차단한 사람 id 목록 (Apple 1.2). 한 요청 안에서는 한 번만 조회 — teamRoleMap과 같은 방식.
     *   팀 공지·팀 앨범·팀 활동·알림에서만 거르고, 팀원 목록·일정·정산 같은 업무 기록은 거르지 않음.
     */
    private ?array $blockedMap = null;

    public function blockedUserIds(): array
    {
        return $this->blockedMap ??= \Illuminate\Support\Facades\DB::table('user_blocks')
            ->where('blocker_id', $this->id)
            ->pluck('blocked_id')
            ->map(fn($v) => (int) $v)
            ->all();
    }

    /** ★ v18.72 — 내가 이 사람을 차단했나 */
    public function hasBlocked(int $userId): bool
    {
        return in_array($userId, $this->blockedUserIds(), true);
    }

    /** ★ v18.72 — 이 사람을 차단한 사람들 id (알림·푸시 받는 사람에서 빼는 용도) */
    public static function blockerIdsOf(int $userId): array
    {
        return \Illuminate\Support\Facades\DB::table('user_blocks')
            ->where('blocked_id', $userId)
            ->pluck('blocker_id')
            ->map(fn($v) => (int) $v)
            ->all();
    }

    /** ★ v18.67 — 운영자(웹 관리자 전용) 계정인가 */
    public function isOperator(): bool
    {
        return $this->user_type === 'operator';
    }

    /**
     * 그 팀에서 팀장이면 true
     *   ★ v18.67 보안 — 예전엔 role_id=1(운영자 superadmin)이면 "모든 팀의 팀장"으로 통과시켜서, 운영자 토큰으로
     *   일반 앱 API를 부르면 남의 팀 일정·현장·사진·근태를 관리할 수 있었음. 운영자는 웹 관리자(/api/admin)만 쓰고
     *   팀 권한이 필요 없어서 그 우회를 없앰(운영자 웹 API는 이 함수를 쓰지 않음).
     */
    public function isLeaderOf(?int $teamId): bool
    {
        if (!$teamId) {
            return false;
        }
        $role = $this->teamRoles()[$teamId] ?? null;
        return $role !== null && $role <= 2;
    }

    /**
     * ★ v18.67 — 지금 그 팀 소속(팀장·부팀장·팀원)인가. 팀을 나간 사람은 false.
     *   나간 팀의 옛 기록은 "보기"만 되고(v18.7), 사진 올리기·보고서 만들기 같은 쓰기는 지금 소속일 때만.
     */
    public function isMemberOf(?int $teamId): bool
    {
        return $teamId && !$this->isOperator() && in_array((int) $teamId, array_map('intval', $this->teamIds()), true);
    }

    /** 내가 팀장인 팀 id 목록 */
    public function ledTeamIds(): array
    {
        return array_keys(array_filter($this->teamRoles(), fn($r) => $r <= 2));
    }

    /**
     * ★ v18.47 — 부팀장: 팀장이 일정 배정 권한을 나눠 준 팀원. 팀 요금제(team_sub_leader)일 때만 효력.
     *   [team_id => true] (한 요청 안에서 한 번만 조회)
     */
    private ?array $subLeaderMap = null;

    public function subLeaderTeamIds(): array
    {
        // ★ v18.67 보안 — 운영자 계정은 팀 권한 없음(teamRoles와 같음)
        if ($this->isOperator()) {
            return $this->subLeaderMap = [];
        }
        $this->subLeaderMap ??= \Illuminate\Support\Facades\DB::table('team_members')
            ->where('user_id', $this->id)
            ->whereNull('deleted_at')
            ->where('is_sub_leader', true)
            ->pluck('team_id')
            ->map(fn($id) => (int) $id)
            ->filter(fn($id) => \App\Services\PlanService::teamCan($id, 'team_sub_leader'))
            ->values()
            ->all();
        return $this->subLeaderMap;
    }

    public function isSubLeaderOf(?int $teamId): bool
    {
        return $teamId && in_array($teamId, $this->subLeaderTeamIds(), true);
    }

    /**
     * 그 팀의 일정·현장을 등록/수정/삭제하고 팀원을 배정할 수 있나 — 팀장 또는 부팀장.
     *   팀 정보 수정·해체·부팀장 지정·정산표 같은 "팀 운영"은 isLeaderOf(팀장만)로 따로 검사.
     */
    public function canAssignIn(?int $teamId): bool
    {
        return $this->isLeaderOf($teamId) || $this->isSubLeaderOf($teamId);
    }

    /** 일정·현장을 관리할 수 있는 팀 id 목록(팀장 + 부팀장) */
    public function assignableTeamIds(): array
    {
        return array_values(array_unique(array_merge($this->ledTeamIds(), $this->subLeaderTeamIds())));
    }
}
