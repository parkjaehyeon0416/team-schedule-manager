<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\DeviceToken;
use Illuminate\Http\Request;

/**
 * ★ v18.38 — 휴대폰 푸시 기기 토큰 등록/해제
 *   앱이 로그인 후 FCM 토큰을 등록하고, 로그아웃 시 해제한다.
 *   같은 기기에서 다른 계정으로 로그인하면 토큰의 주인을 새 사용자로 옮김(이전 계정 알림이 오지 않게).
 */
class DeviceTokenController extends Controller
{
    // POST /api/device-tokens  { token, platform? }
    public function store(Request $request)
    {
        $data = $request->validate([
            'token'    => 'required|string|max:255',
            'platform' => 'nullable|in:android,ios',
        ]);

        DeviceToken::updateOrCreate(
            ['token' => $data['token']],
            ['user_id' => $request->user()->id, 'platform' => $data['platform'] ?? 'android'],
        );

        return ApiResponse::success(null, '기기가 등록되었습니다.');
    }

    // DELETE /api/device-tokens  { token }
    public function destroy(Request $request)
    {
        $data = $request->validate(['token' => 'required|string|max:255']);

        DeviceToken::where('token', $data['token'])
            ->where('user_id', $request->user()->id)
            ->delete();

        return ApiResponse::success(null, '기기 등록이 해제되었습니다.');
    }
}
