<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * ★ v18.23 — 내 프로필 설정(아바타 색상/이미지, 연락처, 카카오톡 아이디).
 *
 * 팀원/팀장끼리 서로의 프로필을 보고 연락할 수 있게 하는 게 목적이라,
 * 여기서 저장하는 정보는 TeamController::members()를 통해 같은 팀 사람들에게
 * 노출됨(전체 공개 아님 — 팀 소속 확인 후에만).
 */
class ProfileController extends Controller
{
    /**
     * 내 프로필 정보(연락처/카카오톡 아이디/아바타 색상) 수정
     * PUT /api/profile
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'phone'         => 'nullable|string|max:20',
            'kakao_talk_id' => 'nullable|string|max:50',
            'avatar_color'  => 'nullable|regex:/^#[0-9A-Fa-f]{6}$/',
        ]);

        $user->update($data);

        return ApiResponse::success($user->fresh(), '프로필이 수정되었습니다.');
    }

    /**
     * 프로필 이미지 업로드 (교체 시 기존 파일 삭제)
     * POST /api/profile/avatar
     */
    public function uploadAvatar(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg|max:5120',
        ]);

        if ($user->avatar_image_path) {
            Storage::disk('public')->delete($user->avatar_image_path);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar_image_path' => $path]);

        return ApiResponse::success($user->fresh(), '프로필 이미지가 등록되었습니다.');
    }

    /**
     * 프로필 이미지 삭제 (다시 색상 아바타로)
     * DELETE /api/profile/avatar
     */
    public function deleteAvatar(Request $request)
    {
        $user = $request->user();

        if ($user->avatar_image_path) {
            Storage::disk('public')->delete($user->avatar_image_path);
            $user->update(['avatar_image_path' => null]);
        }

        return ApiResponse::success($user->fresh(), '프로필 이미지가 삭제되었습니다.');
    }
}
