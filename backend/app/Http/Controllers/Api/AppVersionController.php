<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Support\AppVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * ★ v18.69 — 앱 시작 때 업데이트가 필요한지 확인(로그인 불필요, IP당 분당 60번).
 *   GET /api/app/version?platform=android|ios&version=1.1.0
 *   update: 'required'(최소보다 낮음 → 강제 업데이트) | 'optional'(최신보다 낮음 → 선택 안내) | 'none'
 *   version이 없거나 못 읽으면 '모름'으로 보고 update='none'(min/latest는 그대로 알려 줌).
 *   query가 없으면 앱이 모든 요청에 붙이는 X-App-Platform·X-App-Version 헤더를 대신 읽음.
 *   안내 문구: notes(줄 목록, 앱이 체크 표시 줄로 그림) + message(같은 줄들을 "\n"으로 이은 글, 예전 앱 호환)
 */
class AppVersionController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $platform = AppVersion::platform($request->query('platform') ?? $request->header('X-App-Platform'));
        if ($platform === null) {
            throw ValidationException::withMessages(['platform' => ['플랫폼은 android 또는 ios 중 하나여야 해요.']]);
        }

        $current = AppVersion::normalize($request->query('version') ?? $request->header('X-App-Version'));
        $policy = AppVersion::policy($platform);

        return ApiResponse::success([
            'platform'       => $platform,
            'current'        => $current, // 정규화한 값("1.0" → "1.0.0"), 모르면 null
            'min_version'    => $policy['min_version'],
            'latest_version' => $policy['latest_version'],
            'update'         => AppVersion::status($current, $policy['min_version'], $policy['latest_version']),
            'message'        => $policy['message'], // 안내 줄들을 "\n"으로 이은 글(예전 앱 호환), 없으면 null
            'notes'          => $policy['notes'],   // ★ v18.69 — 안내 줄 목록(APP_UPDATE_MESSAGE를 "|"·줄바꿈으로 나눔, 최대 5줄), 없으면 []
            'store_url'      => $policy['store_url'],
            'apk_url'        => $policy['apk_url'], // Android만, iOS는 null
        ]);
    }
}
