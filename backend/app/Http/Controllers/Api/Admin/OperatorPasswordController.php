<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

/**
 * ★ v18.40 — 운영자 비밀번호 설정 (admin:invite-operator 가 문자로 보낸 1회용 링크에서 호출)
 * POST /api/operator/set-password  { token, password, password_confirmation }
 */
class OperatorPasswordController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'token'    => 'required|string|size:64',
            'password' => \App\Support\PasswordPolicy::rules(), // ★ v18.62
        ], \App\Support\PasswordPolicy::messages());

        // 1회용: 꺼내면서 바로 삭제
        $userId = Cache::pull("operator_setpw:{$data['token']}");
        $user = $userId ? User::find($userId) : null;

        if (!$user || $user->user_type !== 'operator') {
            return ApiResponse::error('링크가 만료되었거나 이미 사용되었습니다. 다시 요청해주세요.', 'ERR_AUTH_002', 410);
        }

        $user->password = Hash::make($data['password']);
        $user->password_set_at = now(); // ★ v18.56 운영자 관리 — "초대 중" → "활성"
        $user->save();
        $user->tokens()->delete(); // 기존 로그인 세션 정리

        return ApiResponse::success(['email' => $user->email], '비밀번호가 설정되었습니다. 로그인해주세요.');
    }
}
