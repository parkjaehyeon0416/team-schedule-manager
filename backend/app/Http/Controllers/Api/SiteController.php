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

        $sites = Site::forUser($user)
            ->orderByDesc('id')
            ->get();

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
        ]);

        $site = Site::create([
            ...$data,
            'team_id'    => $user->team_id,
            'owner_id'   => $user->team_id ? null : $user->id,
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

        return ApiResponse::success($site, '현장 조회 성공');
    }

    // ─── ④ 현장 수정 ───
    public function update(Request $request, string $id)
    {
        $user = $request->user();

        $site = Site::forUser($user)
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
        ]);

        $site->update($data);

        return ApiResponse::success($site, '현장이 수정되었습니다.');
    }

    // ─── ⑤ 현장 삭제 ───
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();

        $site = Site::forUser($user)
            ->find($id);

        if (!$site) {
            return ApiResponse::error('현장을 찾을 수 없습니다.', ErrorCode::SITE_NOT_FOUND, 404);
        }

        $site->delete();

        return ApiResponse::success(null, '현장이 삭제되었습니다.');
    }
}
