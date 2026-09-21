<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\WorkType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class WorkTypeController extends Controller
{
    /**
     * 공정 목록 조회
     * GET /api/work-types
     *
     * 반환: 공용 공정 + 우리 팀 커스텀 공정 + 내가 만든 개인 커스텀 공정
     * 정렬: sort_order ASC → id ASC
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $query = WorkType::where('is_active', true)->forUser($user)
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc');

        $workTypes = $query->get([
            'id',
            'name',
            'code',
            'color',
            'icon',
            'team_id',
            'owner_id',
            'sort_order',
        ]);

        return ApiResponse::success($workTypes, '공정 목록 조회 성공');
    }

    /**
     * 커스텀 공정 추가
     * POST /api/work-types
     *
     * 팀 소속이면 팀 공정으로(team_id), 아니면(프리랜서) 개인 공정으로(owner_id) 등록.
     * 일정/현장과 동일하게 is_personal=true를 주면 팀 소속이어도 개인 전용으로 등록 가능.
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        $data = $request->validate([
            'name'        => 'required|string|max:50',
            'code'        => 'nullable|string|max:30',
            'color'       => 'nullable|string|max:7',
            'icon'        => 'nullable|string|max:30',
            'sort_order'  => 'nullable|integer',
            'is_personal' => 'nullable|boolean',
        ]);

        $wantsPersonal = $request->boolean('is_personal') || !$user->team_id;

        // 팀 전체가 공유하는 공정을 추가하는 거라면 manager 이상만 — 개인용은 누구나 가능
        if (!$wantsPersonal && $user->role_id > 2) {
            return ApiResponse::error('팀 공정 추가는 팀장 이상만 가능합니다.', 'ERR_AUTH_002', 403);
        }

        $workType = WorkType::create([
            'name'       => $data['name'],
            'code'       => $data['code'] ?? null,
            'color'      => $data['color'] ?? '#1890ff',
            'icon'       => $data['icon'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active'  => true,
            'team_id'    => $wantsPersonal ? null : $user->team_id,
            'owner_id'   => $wantsPersonal ? $user->id : null,
        ]);

        return ApiResponse::success($workType, '공정이 추가되었습니다.', 201);
    }

    /**
     * 커스텀 공정 수정 (공용 공정은 수정 불가)
     * PUT /api/work-types/{id}
     */
    public function update(Request $request, string $id)
    {
        $user = Auth::user();

        $workType = WorkType::editableBy($user)->find($id);
        if (!$workType) {
            return ApiResponse::error('공정을 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
        }

        $data = $request->validate([
            'name'       => 'sometimes|string|max:50',
            'code'       => 'nullable|string|max:30',
            'color'      => 'nullable|string|max:7',
            'icon'       => 'nullable|string|max:30',
            'sort_order' => 'nullable|integer',
        ]);

        $workType->update($data);

        return ApiResponse::success($workType, '공정이 수정되었습니다.');
    }

    /**
     * 커스텀 공정 삭제 (공용 공정은 삭제 불가) — SoftDelete
     * DELETE /api/work-types/{id}
     */
    public function destroy(Request $request, string $id)
    {
        $user = Auth::user();

        $workType = WorkType::editableBy($user)->find($id);
        if (!$workType) {
            return ApiResponse::error('공정을 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
        }

        $workType->delete();

        return ApiResponse::success(null, '공정이 삭제되었습니다.');
    }
}
