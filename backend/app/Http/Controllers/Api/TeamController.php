<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TeamController extends Controller
{
    /**
     * ─── ① 팀 목록 조회 ───
     *   superadmin: 전체 팀 목록
     *   manager/member: 본인이 소속된 모든 팀(★ v18.21 — 여러 팀 동시 소속 지원)
     *   각 팀에 active(지금 활성 팀인지) 플래그를 같이 내려줌.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->role_id === 1) {
            $teams = Team::orderByDesc('id')->get();
            return ApiResponse::success($teams, '전체 팀 목록 조회 성공');
        }

        $teams = $user->teams()->orderByDesc('teams.id')->get();
        $teams->each(fn ($team) => $team->is_active = $team->id === $user->team_id);

        return ApiResponse::success($teams, '팀 목록 조회 성공');
    }

    /**
     * ─── ② 팀 생성 ───
     *   ★ v18.21 — 이미 다른 팀에 소속되어 있어도 새 팀을 만들 수 있음(여러 팀 동시 소속).
     *   새로 만든 팀이 바로 "활성 팀"이 되고, 그 팀 안에서 manager로 등록됨.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => 'required|string|max:100',
        ]);

        $team = Team::create([
            'name'        => $data['name'],
            'invite_code' => $this->generateInviteCode(),
            'created_by'  => $user->id,
        ]);

        // superadmin은 팀 안에서도 그대로, 그 외는 팀 생성과 동시에 그 팀의 manager
        $roleInTeam = $user->role_id === 1 ? 1 : 2;

        $team->members()->attach($user->id, [
            'role_id'    => $roleInTeam,
            'joined_at'  => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 새로 만든 팀을 활성 팀으로 전환
        $user->team_id = $team->id;
        $user->user_type = 'team';
        if ($user->role_id > 2) {
            $user->role_id = 2;
        }
        $user->save();

        return ApiResponse::success($team, '팀이 생성되었습니다.', 201);
    }

    /**
     * ─── ③ 팀 상세 조회 ───
     */
    public function show(Request $request, string $id)
    {
        $user = $request->user();

        $team = Team::when($user->role_id !== 1, fn($q) => $q->whereIn('id', $user->teamIds()))
            ->find($id);

        if (!$team) {
            return ApiResponse::error('존재하지 않는 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        return ApiResponse::success($team, '팀 조회 성공');
    }

    /**
     * ─── ④ 팀 정보 수정 ───
     *   manager 이상 전용(라우트 미들웨어에서 이미 검증). 본인 팀만 수정 가능(superadmin 제외).
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();

        $team = Team::when($user->role_id !== 1, fn($q) => $q->where('id', $user->team_id))
            ->find($id);

        if (!$team) {
            return ApiResponse::error('존재하지 않는 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
        ]);

        $team->update($data);

        return ApiResponse::success($team, '팀 정보가 수정되었습니다.');
    }

    /**
     * ─── ⑤ 팀 삭제(해체) ───
     *   manager 이상 전용(라우트 미들웨어). 본인 팀만 삭제 가능(superadmin 제외).
     *
     *   해체해도 팀 소속이었던 일정/현장의 team_id는 그대로 둠(데이터 삭제도,
     *   개인 전환도 안 함) — Team은 SoftDeletes라 이름도 보존되므로, 팀원이었던
     *   사람이 나중에 "팀" 필터로 그때 일했던 기록을 계속 조회할 수 있음
     *   (Schedule::scopeForUser 참고). 팀원 전원만 소속 해제함:
     *     - team_id → null, role_id → 2(팀 없는 개인은 스스로 manager),
     *       user_type → freelancer
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();

        $team = Team::when($user->role_id !== 1, fn($q) => $q->whereIn('id', $user->teamIds()))
            ->find($id);

        if (!$team) {
            return ApiResponse::error('존재하지 않는 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        DB::transaction(function () use ($team) {
            $memberIds = DB::table('team_members')
                ->where('team_id', $team->id)
                ->whereNull('deleted_at')
                ->pluck('user_id');

            DB::table('team_members')
                ->where('team_id', $team->id)
                ->whereNull('deleted_at')
                ->update(['deleted_at' => now()]);

            // 이 팀이 활성 팀이었던 사람들은 남은 팀 중 하나로 전환(없으면 개인으로)
            foreach ($memberIds as $userId) {
                $affected = User::find($userId);
                if ($affected && $affected->team_id === $team->id) {
                    $this->switchActiveTeam($affected, $this->pickFallbackTeamId($affected, $team->id));
                }
            }

            $team->delete();
        });

        return ApiResponse::success(null, '팀이 해체되었습니다. 그동안의 일정·현장 기록은 각자 "팀" 필터에서 계속 조회할 수 있습니다.');
    }

    /**
     * ─── ⑧ 팀 탈퇴 ───
     *   본인이 스스로 팀을 나감. ★ v18.21 — 여러 팀 소속 중 하나만 나가는 것이므로
     *   body에 team_id를 받되, 생략하면 지금 활성 팀을 나가는 것으로 처리(하위호환).
     *   일정/현장의 team_id는 손대지 않음 — 탈퇴 후에도 "팀" 필터로 그때 일했던
     *   기록을 볼 수 있어야 하기 때문(Schedule::scopeForUser 참고).
     */
    public function leave(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'team_id' => 'nullable|integer',
        ]);
        $teamId = $data['team_id'] ?? $user->team_id;

        if (!$teamId) {
            return ApiResponse::error('소속된 팀이 없습니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        $membership = DB::table('team_members')
            ->where('team_id', $teamId)
            ->where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->first();

        if (!$membership) {
            return ApiResponse::error('소속된 팀이 없습니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        DB::table('team_members')
            ->where('id', $membership->id)
            ->update(['deleted_at' => now()]);

        // 나간 팀이 활성 팀이었으면 남은 팀 중 하나로 전환(없으면 개인으로)
        if ($user->team_id === (int) $teamId) {
            $this->switchActiveTeam($user, $this->pickFallbackTeamId($user, (int) $teamId));
        }

        return ApiResponse::success($user->fresh(), '팀에서 탈퇴했습니다. 그동안의 일정·현장 기록은 "팀" 필터에서 계속 조회할 수 있습니다.');
    }

    /**
     * ─── ⑥ 팀 가입 ───
     *   초대코드로 팀에 합류. ★ v18.21 — 이미 다른 팀에 소속되어 있어도 추가로
     *   가입 가능(여러 팀 동시 소속). 같은 팀에 이미 가입돼 있으면 에러.
     *   새로 가입한 팀이 바로 활성 팀이 됨.
     */
    public function join(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'invite_code' => 'required|string',
        ]);

        $team = Team::where('invite_code', $data['invite_code'])->first();

        if (!$team) {
            return ApiResponse::error('초대 코드가 유효하지 않습니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        $alreadyMember = DB::table('team_members')
            ->where('team_id', $team->id)
            ->where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->exists();

        if ($alreadyMember) {
            return ApiResponse::error('이미 가입된 팀입니다.', ErrorCode::TEAM_ALREADY_JOINED, 409);
        }

        // 초대코드로 들어온 사람은 팀장이 아니라 팀원
        DB::table('team_members')->insert([
            'team_id'    => $team->id,
            'user_id'    => $user->id,
            'role_id'    => 3,
            'joined_at'  => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 새로 가입한 팀을 활성 팀으로 전환 — 남의 팀에 들어가면서 manager 등급을
        // 유지한 채면 권한 상승이 되므로 반드시 member로 강등해야 함
        $this->switchActiveTeam($user, $team->id);

        return ApiResponse::success($user->fresh(), '팀에 가입되었습니다.');
    }

    /**
     * ─── ⑨ 활성 팀 전환 ───  ★ v18.21 신규 — 여러 팀 소속 중 "지금 활동할 팀"을 바꿈.
     *   일정/현장 등록, 팀원 목록 조회 등은 전부 이 활성 팀 기준으로 동작함.
     */
    public function switchActive(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'team_id' => 'required|integer',
        ]);

        $membership = DB::table('team_members')
            ->where('team_id', $data['team_id'])
            ->where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->first();

        if (!$membership) {
            return ApiResponse::error('소속되지 않은 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        $this->switchActiveTeam($user, (int) $data['team_id']);

        return ApiResponse::success($user->fresh(), '활성 팀이 변경되었습니다.');
    }

    /**
     * ─── ⑦ 내 팀 멤버 목록 조회 ───  (일정 등록 시 투입 인원 선택용)
     *   ★ v18.21 — team_members 기준으로 조회하도록 변경(users.team_id는 이제
     *   "활성 팀"만 가리켜서, 비활성 상태인 다른 팀의 멤버는 안 잡혔었음).
     *   ?team_id= 쿼리로 특정 팀을 지정할 수 있고, 생략하면 지금 활성 팀 기준.
     *
     *   응답 데이터:
     *     - id          : 사용자 고유 ID (투입 인원 등록 시 사용)
     *     - name        : 사용자 이름 (화면 표시용)
     *     - role_id     : 그 팀 안에서의 역할 레벨 (1=superadmin, 2=manager, 3=member)
     *
     *   보안:
     *     - 요청자가 실제로 소속된 팀인지 확인 → 다른 팀 노출 방지
     *     - email, phone 등 민감 정보 제외
     */
    public function members(Request $request)
    {
        $user = $request->user();
        $teamId = $request->query('team_id') ?: $user->team_id;

        if (!$teamId) {
            return ApiResponse::success([], '소속된 팀이 없습니다.');
        }

        if (!in_array((int) $teamId, $user->teamIds(), true) && $user->role_id !== 1) {
            return ApiResponse::error('소속되지 않은 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        $members = User::query()
            ->join('team_members', 'team_members.user_id', '=', 'users.id')
            ->where('team_members.team_id', $teamId)
            ->whereNull('team_members.deleted_at')
            ->whereNull('users.deleted_at')
            ->select('users.id', 'users.name', 'team_members.role_id')
            ->orderBy('team_members.role_id')
            ->orderBy('users.name')
            ->get();

        return ApiResponse::success($members, '팀원 목록 조회 성공');
    }

    /**
     * 활성 팀을 바꾸고, 그 팀 안에서의 역할(team_members.role_id)로 전역 role_id도
     * 맞춰줌 — RoleMiddleware가 전역 role_id 하나만 보고 권한을 판단하는 구조라서
     * (여러 팀에서 역할이 다를 수 있다는 한계는 알고 있음, v1은 활성 팀 기준으로만 동작).
     */
    private function switchActiveTeam(User $user, ?int $teamId): void
    {
        if ($teamId === null) {
            $user->team_id   = null;
            $user->role_id   = 2; // 팀 없는 개인은 스스로 manager
            $user->user_type = 'freelancer';
            $user->save();
            return;
        }

        $membership = DB::table('team_members')
            ->where('team_id', $teamId)
            ->where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->first();

        $user->team_id   = $teamId;
        $user->role_id   = $membership->role_id ?? 3;
        $user->user_type = 'team';
        $user->save();
    }

    /**
     * 특정 팀에서 나가고 난 뒤, 활성 팀으로 삼을 다른 소속 팀을 하나 고름(없으면 null).
     */
    private function pickFallbackTeamId(User $user, int $excludeTeamId): ?int
    {
        $fallback = DB::table('team_members')
            ->where('user_id', $user->id)
            ->where('team_id', '!=', $excludeTeamId)
            ->whereNull('deleted_at')
            ->orderByDesc('joined_at')
            ->first();

        return $fallback->team_id ?? null;
    }

    private function generateInviteCode(): string
    {
        do {
            $code = strtoupper(Str::random(6));
        } while (Team::where('invite_code', $code)->exists());

        return $code;
    }
}
