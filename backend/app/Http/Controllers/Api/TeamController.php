<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TeamController extends Controller
{
    /**
     * ─── ① 팀 목록 조회 ───
     *   superadmin: 전체 팀 목록
     *   manager/member: 본인 소속 팀만 (없으면 빈 배열)
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->role_id === 1) {
            $teams = Team::orderByDesc('id')->get();
            return ApiResponse::success($teams, '전체 팀 목록 조회 성공');
        }

        $teams = $user->team_id
            ? Team::where('id', $user->team_id)->get()
            : collect();

        return ApiResponse::success($teams, '팀 목록 조회 성공');
    }

    /**
     * ─── ② 팀 생성 ───
     *   member 이상 누구나 호출 가능 — 아직 팀이 없는 사용자가 새 팀을 만들면
     *   그 사용자를 팀장(manager)으로 승격하고 해당 팀에 소속시킴.
     *   이미 팀이 있는 사용자는 새 팀을 만들 수 없음(탈퇴 후 재생성 정책은 추후 결정).
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->team_id) {
            return ApiResponse::error('이미 소속된 팀이 있습니다.', ErrorCode::TEAM_ALREADY_JOINED, 409);
        }

        $data = $request->validate([
            'name' => 'required|string|max:100',
        ]);

        $team = Team::create([
            'name'        => $data['name'],
            'invite_code' => $this->generateInviteCode(),
            'created_by'  => $user->id,
        ]);

        $user->team_id = $team->id;
        // superadmin은 그대로 유지, member는 팀 생성과 동시에 manager로 승격
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

        $team = Team::when($user->role_id !== 1, fn($q) => $q->where('id', $user->team_id))
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
     * ─── ⑤ 팀 삭제 ───
     *   manager 이상 전용(라우트 미들웨어). 본인 팀만 삭제 가능(superadmin 제외).
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();

        $team = Team::when($user->role_id !== 1, fn($q) => $q->where('id', $user->team_id))
            ->find($id);

        if (!$team) {
            return ApiResponse::error('존재하지 않는 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        $team->delete();

        return ApiResponse::success(null, '팀이 삭제되었습니다.');
    }

    /**
     * ─── ⑥ 팀 가입 ───
     *   초대코드로 팀에 합류
     */
    public function join(Request $request)
    {
        $user = $request->user();

        if ($user->team_id) {
            return ApiResponse::error('이미 팀에 소속된 사용자입니다.', ErrorCode::TEAM_ALREADY_JOINED, 409);
        }

        $data = $request->validate([
            'invite_code' => 'required|string',
        ]);

        $team = Team::where('invite_code', $data['invite_code'])->first();

        if (!$team) {
            return ApiResponse::error('초대 코드가 유효하지 않습니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        $user->team_id = $team->id;
        $user->save();

        return ApiResponse::success($user->fresh(), '팀에 가입되었습니다.');
    }

    /**
     * ─── ⑦ 내 팀 멤버 목록 조회 ───  ★ 신규 추가 (일정 등록 시 투입 인원 선택용)
     *
     *   응답 데이터:
     *     - id          : 사용자 고유 ID (투입 인원 등록 시 사용)
     *     - name        : 사용자 이름 (화면 표시용)
     *     - role_id     : 권한 레벨 (1=superadmin, 2=manager, 3=member)
     *
     *   보안:
     *     - 로그인 사용자의 team_id 기준으로 필터링 → 다른 팀 노출 방지
     *     - email, phone 등 민감 정보 제외
     *     - SoftDelete된 사용자(deleted_at IS NOT NULL) 제외
     */
    public function members(Request $request)
    {
        $user = $request->user();

        // 팀에 소속되지 않은 사용자인 경우 — 빈 배열 반환 (에러 아님)
        if (!$user->team_id) {
            return ApiResponse::success([], '소속된 팀이 없습니다.');
        }

        // 같은 팀 멤버 조회 (본인 포함)
        $members = User::where('team_id', $user->team_id)
            ->whereNull('deleted_at')           // SoftDelete된 사용자 제외
            ->select('id', 'name', 'role_id')   // 민감 정보(email, phone 등) 제외
            ->orderBy('role_id')                // superadmin(1) → manager(2) → member(3) 순
            ->orderBy('name')                   // 같은 role 내에서는 이름 가나다 순
            ->get();

        return ApiResponse::success($members, '팀원 목록 조회 성공');
    }

    private function generateInviteCode(): string
    {
        do {
            $code = strtoupper(Str::random(6));
        } while (Team::where('invite_code', $code)->exists());

        return $code;
    }
}
