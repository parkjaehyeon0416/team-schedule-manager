<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * ★ v18.43 — 일일 접속자 기록(운영자 통계용).
 * 로그인한 앱 사용자가 그날 처음 API를 부르면 daily_active_users에 1행.
 * 같은 날 두 번째부터는 캐시로 걸러서 DB를 건드리지 않음. 운영자 계정은 세지 않음.
 */
class TrackDailyActive
{
    public function handle(Request $request, Closure $next): mixed
    {
        // api 그룹 미들웨어라 auth:sanctum보다 먼저 돌 수 있음 → sanctum 가드로 직접 토큰 확인
        $user = $request->user('sanctum');
        if ($user && $user->user_type !== 'operator') {
            $date = now()->toDateString();
            if (Cache::add("dau:{$date}:{$user->id}", 1, now()->endOfDay())) {
                DB::table('daily_active_users')->insertOrIgnore(['date' => $date, 'user_id' => $user->id]);
            }
        }

        return $next($request);
    }
}
