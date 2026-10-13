<?php

namespace App\Http\Middleware;

use App\Constants\ErrorCode;
use App\Http\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;

/**
 * ★ v18.67 보안 — 운영자(user_type=operator) 계정은 일반 앱 API를 못 쓰게 막음.
 *   운영자는 웹 관리자(/api/admin/*, /api/me, /api/auth/*)만 쓰는데, 웹에서 받은 토큰을 그대로 앱 API에 쓰면
 *   일정·현장·사진·보고서·팀 기능에 들어올 수 있었음.
 *   지금은 일정·현장·사진·보고서·팀 앨범 컨트롤러가 HasMiddleware로 직접 붙임(routes/api.php는 안 건드림).
 *   팀·팀 공지·정산표 등 다른 앱 라우트에도 같은 미들웨어를 붙이면 운영자 차단이 완성됨.
 */
class BlockOperatorFromApp
{
    public function handle(Request $request, Closure $next): mixed
    {
        if ($request->user()?->user_type === 'operator') {
            return ApiResponse::error('운영자 계정은 앱 기능을 쓸 수 없어요. 운영자 웹에서 이용해 주세요.',
                ErrorCode::AUTH_NO_PERMISSION, 403);
        }

        return $next($request);
    }
}
