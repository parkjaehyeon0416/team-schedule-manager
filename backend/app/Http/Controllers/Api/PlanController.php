<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\PlanService;
use Illuminate\Http\Request;

/**
 * ★ v18.47 — 요금제 안내(앱 요금제 화면용): 요금제 목록·가격·무료 한도 + 내 현재 요금제.
 *   결제(앱스토어 구독) 연결은 2027년 1월 예정 — 그 전엔 출시 기념으로 전부 무료.
 */
class PlanController extends Controller
{
    // GET /plans
    public function index(Request $request)
    {
        return ApiResponse::success([
            'plans'       => collect(config('plans.plans'))->map(fn($p, $key) => $p + ['key' => $key])->values(),
            'features'    => config('plans.features'),
            'free_limits' => config('plans.free_limits'),
            'me'          => PlanService::summary($request->user()),
        ], '요금제 조회 성공');
    }
}
