<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\WageProfile;
use Illuminate\Http\Request;

/**
 * 내 단가 설정(MY_RATES) — 공정과 무관한 기본 일급 프로필.
 * 공정별 단가(TRADE_RATES)는 기존 WageSettingController가 담당.
 */
class WageProfileController extends Controller
{
    // GET /api/wage-profile — 없으면 기본값으로 즉석 생성 없이 디폴트 값만 응답
    public function show(Request $request)
    {
        $profile = WageProfile::firstOrNew(['user_id' => $request->user()->id]);

        return ApiResponse::success($profile, '단가 프로필 조회 성공');
    }

    // PUT /api/wage-profile — upsert
    public function update(Request $request)
    {
        $data = $request->validate([
            'full_day_wage' => 'required|integer|min:0',
            'half_day_wage' => 'required|integer|min:0',
            'overtime_hourly_wage' => 'required|integer|min:0',
            'night_holiday_premium_percent' => 'required|integer|min:0|max:200',
        ]);

        $profile = WageProfile::updateOrCreate(
            ['user_id' => $request->user()->id],
            $data,
        );

        return ApiResponse::success($profile, '단가 프로필이 저장되었습니다.');
    }
}
