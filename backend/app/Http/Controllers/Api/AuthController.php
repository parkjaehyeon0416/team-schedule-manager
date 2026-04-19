<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    // ────────────────────────────────────
    // 회원가입
    // POST /api/auth/register
    // ────────────────────────────────────
    public function register(Request $request)
    {
        // 1. 입력값 검증
        $validated = $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|min:6|confirmed',
            // confirmed: password_confirmation 필드와 일치해야 함
        ]);

        // 2. 사용자 생성 (비밀번호는 반드시 Hash::make로 암호화)
        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role_id'  => 3, // 기본: member(팀원)
        ]);

        return ApiResponse::success($user, '회원가입이 완료되었습니다.', 201);
    }

    // ────────────────────────────────────
    // 로그인
    // POST /api/auth/login
    // ────────────────────────────────────
    public function login(Request $request)
    {
        // 1. 입력값 검증
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        // 2. 이메일로 사용자 찾기
        $user = User::with('role')->where('email', $request->email)->first();

        // 3. 이메일 또는 비밀번호 불일치 확인
        if (!$user || !Hash::check($request->password, $user->password)) {
            return ApiResponse::error('이메일 또는 비밀번호가 틀렸습니다.', 'ERR_AUTH_001', 401);
        }

        // 4. Sanctum 토큰 발급
        //    createToken()은 토큰 이름을 받습니다 ('auth-token' — 임의로 지정)
        $token = $user->createToken('auth-token')->plainTextToken;

        // 5. 사용자 정보 + 토큰 반환
        return ApiResponse::success([
            'user'  => $user,
            'token' => $token,
        ], '로그인 성공');
    }

    // ────────────────────────────────────
    // 로그아웃
    // POST /api/auth/logout
    // ────────────────────────────────────
    public function logout(Request $request)
    {
        // 현재 사용 중인 토큰만 삭제 (다른 기기 토큰은 유지)
        $request->user()->currentAccessToken()->delete();
    return ApiResponse::success(null, '로그아웃 되었습니다.');
    }

    // ────────────────────────────────────
    // 내 정보 조회
    // GET /api/me
    // ────────────────────────────────────
    public function me(Request $request)
    {
        // auth:sanctum 미들웨어가 토큰을 검증하고 사용자 정보를 주입해줌
        $user = $request->user()->load('role', 'team');
        return ApiResponse::success($user);
    }
}
