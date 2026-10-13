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
            'phone'         => ['nullable', 'string', 'max:20'],
            'kakao_talk_id' => 'nullable|string|max:50',
            'avatar_color'  => 'nullable|regex:/^#[0-9A-Fa-f]{6}$/',
        ]);

        // ★ v18.66 — 휴대폰 번호는 여기서 못 바꿈. 탈퇴·처음 비밀번호 설정의 문자 본인 확인에 쓰여서
        //   본인 확인 + 새 번호 문자 인증을 거치는 PUT /profile/phone(PhoneChangeController)으로만 바꿈.
        //   옛 버전 앱은 안 바뀐 번호도 같이 보내서, 지금 번호와 같으면(숫자만 비교) 그냥 넘어감.
        if (array_key_exists('phone', $data)) {
            if (preg_replace('/\D/', '', (string) $data['phone']) !== preg_replace('/\D/', '', (string) $user->phone)) {
                return ApiResponse::error(
                    '휴대폰 번호를 바꾸려면 문자 인증이 필요해요. 앱을 최신 버전으로 업데이트한 뒤 프로필 설정의 휴대폰 번호 [변경]에서 바꿔주세요.',
                    \App\Constants\ErrorCode::VALID_GENERAL,
                    422
                );
            }
            unset($data['phone']);
        }

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
        // ★ v18.67 보안 — 저장 전에 사진 머리글 확인(6000픽셀 이하) + 하루 20번까지 교체
        if ($fail = \App\Support\UploadGuard::imageError($request->file('avatar'))) {
            return $fail;
        }
        if ($fail = \App\Support\UploadGuard::dailyLimit('avatar', $user->id, 1, 20, '프로필 사진')) {
            return $fail;
        }

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
