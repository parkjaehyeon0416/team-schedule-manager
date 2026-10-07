<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Site;
use Illuminate\Http\Request;

class SiteController extends Controller
{
    // ─── ① 현장 목록 조회 ───
    public function index(Request $request)
    {
        $user = $request->user();

        $scope = $request->query('scope', 'all');
        if (!in_array($scope, ['all', 'personal', 'team'], true)) {
            $scope = 'all';
        }

        $sites = Site::forUser($user, $scope)
            ->orderByDesc('id')
            ->get();
        $sites->each(fn(Site $s) => $s->can_edit = $s->canEditBy($user));

        return ApiResponse::success($sites, '현장 목록 조회 성공');
    }

    // ─── ② 현장 등록 ───
    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'address'  => 'required|string|max:255',
            'apt_name' => 'nullable|string|max:255',
            'dong'     => 'nullable|string|max:50',
            'ho'       => 'nullable|string|max:50',
            'area_m2'  => 'nullable|numeric|min:0',
            'memo'     => 'nullable|string',
            'is_personal' => 'nullable|boolean',
            // ★ DESIGN-CANVAS(SITE_CREATE) 추가 필드
            'start_date' => 'nullable|date',
            'end_date'   => 'nullable|date',
            'customer'   => 'nullable|string|max:100',
            'team_id'    => 'nullable|integer',
        ]);

        // ★ 디자인의 "팀 선택" — 내가 소속된 팀 중 하나를 명시적으로 고를 수 있음.
        //   지정 안 하면 기존처럼 활성 팀(또는 개인)으로 자동 결정.
        $requestedTeamId = $data['team_id'] ?? null;
        unset($data['team_id']);

        if ($requestedTeamId !== null && !in_array($requestedTeamId, $user->teamIds(), true)) {
            return ApiResponse::error('소속되지 않은 팀입니다.', ErrorCode::SITE_NOT_FOUND, 422);
        }
        // ★ v18.44 — 팀 현장은 "그 팀에서" 팀장일 때만(활성 팀과 무관). 개인 현장은 누구나.
        if ($requestedTeamId !== null && !$user->canAssignIn($requestedTeamId)) {
            return ApiResponse::error('팀 현장은 그 팀의 팀장·부팀장만 등록할 수 있어요.', 'ERR_AUTH_002', 403);
        }

        $wantsPersonal = $requestedTeamId === null
            ? ($request->boolean('is_personal') || !$user->canAssignIn($user->team_id))
            : false;
        unset($data['is_personal']);

        $teamId = $wantsPersonal ? null : ($requestedTeamId ?? $user->team_id);
        $ownerId = $wantsPersonal ? $user->id : null;

        // ★ v18.16 — 주소+동/호까지 완전히 같은 현장 중복 등록 방지(더블탭 방지 목적).
        $duplicate = Site::where('address', $data['address'])
            ->when(
                $data['dong'] ?? null,
                fn($q, $dong) => $q->where('dong', $dong),
                fn($q) => $q->whereNull('dong'),
            )
            ->when(
                $data['ho'] ?? null,
                fn($q, $ho) => $q->where('ho', $ho),
                fn($q) => $q->whereNull('ho'),
            )
            ->when($teamId, fn($q, $id) => $q->where('team_id', $id), fn($q) => $q->whereNull('team_id'))
            ->when($ownerId, fn($q, $id) => $q->where('owner_id', $id), fn($q) => $q->whereNull('owner_id'))
            ->exists();

        if ($duplicate) {
            return ApiResponse::error(
                '이미 동일한 주소로 등록된 현장이 있습니다.',
                ErrorCode::SITE_DUPLICATE,
                409,
            );
        }

        $site = Site::create([
            ...$data,
            'team_id'    => $teamId,
            'owner_id'   => $ownerId,
            'created_by' => $user->id,
        ]);

        return ApiResponse::success($site, '현장이 등록되었습니다.', 201);
    }

    // ─── ③ 현장 상세 조회 ───
    public function show(Request $request, string $id)
    {
        $user = $request->user();

        $site = Site::forUser($user)
            ->find($id);

        if (!$site) {
            return ApiResponse::error('현장을 찾을 수 없습니다.', ErrorCode::SITE_NOT_FOUND, 404);
        }
        $site->can_edit = $site->canEditBy($user);

        return ApiResponse::success($site, '현장 조회 성공');
    }

    // ─── ④ 현장 수정 ───
    public function update(Request $request, string $id)
    {
        $user = $request->user();

        $site = Site::editableBy($user)
            ->find($id);

        if (!$site) {
            return ApiResponse::error('현장을 찾을 수 없습니다.', ErrorCode::SITE_NOT_FOUND, 404);
        }

        $data = $request->validate([
            'address'  => 'sometimes|string|max:255',
            'apt_name' => 'nullable|string|max:255',
            'dong'     => 'nullable|string|max:50',
            'ho'       => 'nullable|string|max:50',
            'area_m2'  => 'nullable|numeric|min:0',
            'memo'     => 'nullable|string',
            // ★ DESIGN-CANVAS(SITE_EDIT) 추가 필드
            'start_date' => 'nullable|date',
            'end_date'   => 'nullable|date',
            'customer'   => 'nullable|string|max:100',
            'status'     => 'nullable|in:scheduled,in_progress,done',
            'team_id'    => 'nullable|integer',
        ]);

        if (array_key_exists('team_id', $data)) {
            $requestedTeamId = $data['team_id'];
            if ($requestedTeamId !== null && !in_array($requestedTeamId, $user->teamIds(), true)) {
                return ApiResponse::error('소속되지 않은 팀입니다.', ErrorCode::SITE_NOT_FOUND, 422);
            }
            if ($requestedTeamId !== null && !$user->canAssignIn($requestedTeamId)) {
                return ApiResponse::error('팀 현장은 그 팀의 팀장·부팀장만 등록할 수 있어요.', 'ERR_AUTH_002', 403);
            }
            $data['owner_id'] = $requestedTeamId === null ? $user->id : null;
        }

        $site->update($data);

        return ApiResponse::success($site, '현장이 수정되었습니다.');
    }

    // ─── ⑤ 현장 삭제 ───
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();

        $site = Site::editableBy($user)
            ->find($id);

        if (!$site) {
            return ApiResponse::error('현장을 찾을 수 없습니다.', ErrorCode::SITE_NOT_FOUND, 404);
        }

        $site->delete();

        return ApiResponse::success(null, '현장이 삭제되었습니다.');
    }
}
