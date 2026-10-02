<?php

namespace App\Http\Middleware;

use App\Http\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;

/**
 * ★ v18.40 — 운영자(user_type=operator) 전용 API 보호.
 * 운영자 계정은 웹 관리자에서만 로그인 가능(AuthController PLATFORM_MAP)하고, 공지·이벤트 관리 등 운영 기능을 씀.
 */
class OperatorMiddleware
{
    public function handle(Request $request, Closure $next): mixed
    {
        if ($request->user()?->user_type !== 'operator') {
            return ApiResponse::error('운영자만 사용할 수 있습니다.', 'ERR_AUTH_002', 403);
        }

        return $next($request);
    }
}
