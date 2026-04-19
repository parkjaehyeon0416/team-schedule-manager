<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Http\Responses\ApiResponse;

class RoleMiddleware
{
    /**
     * handle() — 요청이 들어올 때 실행되는 함수
     * $role 파라미터: 라우트에서 전달한 권한 이름 (예: "manager", "member")
     */
    public function handle(Request $request, Closure $next, string $role): mixed
    {
        // 1. 로그인 사용자 가져오기
        $user = $request->user();

        // 2. 권한 등급 정의 (숫자가 낮을수록 높은 권한)
        $hierarchy = [
            'superadmin' => 1,
            'manager'    => 2,
            'member'     => 3,
        ];

        // 3. 사용자 권한이 요구 권한보다 높거나 같으면 통과
        //    예: superadmin(1) >= manager(2) 요구 → 통과
        //        member(3)     >= manager(2) 요구 → 차단
        $userLevel     = $hierarchy[$user->role->name] ?? 99;
        $requiredLevel = $hierarchy[$role]             ?? 99;

        if ($userLevel > $requiredLevel) {
            return ApiResponse::error('권한이 없습니다.', 'ERR_AUTH_002', 403);
        }

        // 4. 권한 통과 → 다음 단계로 진행
        return $next($request);
    }

}
