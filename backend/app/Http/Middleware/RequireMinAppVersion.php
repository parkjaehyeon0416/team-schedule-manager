<?php

namespace App\Http\Middleware;

use App\Constants\ErrorCode;
use App\Support\AppVersion;
use Closure;
use Illuminate\Http\Request;

/**
 * ★ v18.69 — 최소 버전보다 낮은 앱은 API를 못 쓰게 막음(426 + ERR_APP_001 → 앱은 강제 업데이트 화면).
 *   api 그룹 맨 앞에서 돌아서(bootstrap/app.php prepend) 인증·라우트 바인딩·throttle보다 먼저 판단.
 *   막는 조건: X-App-Version 헤더가 있고 + X-App-Platform이 android|ios이고 + 그 플랫폼 최소 버전보다 낮을 때만.
 *   안 막는 경우: 헤더 없음(v18.68 이하 옛 앱·브라우저·운영자 웹), 플랫폼 헤더 없음/이상함, 버전 못 읽음,
 *   그리고 아래 EXEMPT 경로(버전 확인 자체, 옛 앱도 로그아웃은 되게, 운영자 웹, 서명 파일 링크).
 */
class RequireMinAppVersion
{
    private const EXEMPT = [
        'api/app/version',
        'api/auth/logout',
        'api/admin',
        'api/admin/*',
        'api/files/*', // signed:relative 견적서·세무·정산표 파일 링크(브라우저·다운로드 매니저가 엶)
    ];

    public function handle(Request $request, Closure $next): mixed
    {
        $raw = $request->header('X-App-Version');
        if ($raw === null || trim($raw) === '' || $request->isMethod('OPTIONS') || $request->is(...self::EXEMPT)) {
            return $next($request);
        }

        $platform = AppVersion::platform($request->header('X-App-Platform'));
        $version = AppVersion::normalize($raw);
        if ($platform === null || $version === null) {
            return $next($request);
        }

        $policy = AppVersion::policy($platform);
        if (!AppVersion::isBelow($version, $policy['min_version'])) {
            return $next($request);
        }

        return response()->json([
            'success'    => false,
            'message'    => '새 버전으로 업데이트해야 계속 쓸 수 있어요.',
            'error_code' => ErrorCode::APP_UPDATE_REQUIRED,
            'data'       => [
                'min_version'    => $policy['min_version'],
                'latest_version' => $policy['latest_version'],
                'store_url'      => $policy['store_url'],
                'apk_url'        => $policy['apk_url'], // Android만, iOS는 null
                'message'        => $policy['message'], // .env APP_UPDATE_MESSAGE(선택) 줄들을 "\n"으로 이은 글, 없으면 null
                'notes'          => $policy['notes'],   // 같은 문구의 줄 목록(최대 5줄), 없으면 []
            ],
        ], 426);
    }
}
