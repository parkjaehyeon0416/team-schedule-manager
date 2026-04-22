<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Models\Team;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    /**
     * ─── ① 팀 목록 조회 ───
     *   superadmin 전용 (모든 팀 보기)
     *   ※ v7 후반부에서 구현 예정
     */
    public function index()
    {
        return ApiResponse::error('아직 구현되지 않았습니다.', 'ERR_NOT_IMPLEMENTED', 501);
    }

    /**
     * ─── ② 팀 생성 ───
     *   superadmin 전용
     *   ※ v7 후반부에서 구현 예정
     */
    public function store(Request $request)
    {
        return ApiResponse::error('아직 구현되지 않았습니다.', 'ERR_NOT_IMPLEMENTED', 501);
    }

    /**
     * ─── ③ 팀 상세 조회 ───
     *   ※ v7 후반부에서 구현 예정
     */
    public function show(string $id)
    {
        return ApiResponse::error('아직 구현되지 않았습니다.', 'ERR_NOT_IMPLEMENTED', 501);
    }

    /**
     * ─── ④ 팀 정보 수정 ───
     *   manager 이상 전용
     *   ※ v7 후반부에서 구현 예정
     */
    public function update(Request $request, string $id)
    {
        return ApiResponse::error('아직 구현되지 않았습니다.', 'ERR_NOT_IMPLEMENTED', 501);
    }

    /**
     * ─── ⑤ 팀 삭제 ───
     *   superadmin 전용
     *   ※ v7 후반부에서 구현 예정
     */
    public function destroy(string $id)
    {
        return ApiResponse::error('아직 구현되지 않았습니다.', 'ERR_NOT_IMPLEMENTED', 501);
    }

    /**
     * ─── ⑥ 팀 가입 ───
     *   초대코드로 팀에 합류
     *   ※ v7 후반부에서 구현 예정
     */
    public function join(Request $request)
    {
        return ApiResponse::error('아직 구현되지 않았습니다.', 'ERR_NOT_IMPLEMENTED', 501);
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
}
