<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\NotificationSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class NotificationSettingController extends Controller
{
    /**
     * 내 알림 설정 조회 (없으면 기본값으로 생성해서 반환)
     * GET /api/notification-settings
     */
    public function show(Request $request)
    {
        $user = Auth::user();

        $setting = NotificationSetting::firstOrCreate(['user_id' => $user->id]);
        $setting->refresh(); // DB 컬럼 기본값(true 등)을 응답에 실어주기 위해 재조회

        return ApiResponse::success($setting, '알림 설정 조회 성공');
    }

    /**
     * 알림 설정 수정
     * PUT /api/notification-settings
     *
     * Body: schedule_reminder, team_activity, quote_update, report_view (전부 boolean, optional)
     */
    public function update(Request $request)
    {
        $user = Auth::user();

        $validator = Validator::make($request->all(), [
            'schedule_reminder' => 'sometimes|boolean',
            'team_activity'     => 'sometimes|boolean',
            'quote_update'      => 'sometimes|boolean',
            'report_view'       => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('입력값을 확인해주세요.', 'ERR_VALID_001', 422);
        }

        $setting = NotificationSetting::firstOrCreate(['user_id' => $user->id]);
        $setting->refresh();
        $setting->update($validator->validated());

        return ApiResponse::success($setting, '알림 설정이 저장되었습니다.');
    }
}
