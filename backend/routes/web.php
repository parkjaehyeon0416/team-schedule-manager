<?php

use App\Http\Controllers\BusinessCardPageController;
use Illuminate\Support\Facades\Route;

// ★ v18.48 — 앱 소개 웹페이지(예전엔 API 상태 JSON) + 웹 이용약관·개인정보 처리방침(스토어 등록에 필요)
Route::get('/', [\App\Http\Controllers\LandingPageController::class, 'show']);
Route::get('/terms', [\App\Http\Controllers\LandingPageController::class, 'terms']);
Route::get('/privacy', [\App\Http\Controllers\LandingPageController::class, 'privacy']);
// ★ v18.68 — 계정 삭제 안내(구글 플레이 등록정보의 "계정 삭제 URL"). 입력 폼 없는 안내문이라 열 때마다 세션 행이 쌓이지 않게 세션 미들웨어는 뺌
//   (PreventRequestForgery도 같이 빼야 함 — GET에도 XSRF 쿠키를 붙이려고 세션을 찾다가 500)
Route::get('/account-delete', [\App\Http\Controllers\LandingPageController::class, 'accountDelete'])
    ->withoutMiddleware([\Illuminate\Session\Middleware\StartSession::class, \Illuminate\View\Middleware\ShareErrorsFromSession::class, \Illuminate\Foundation\Http\Middleware\PreventRequestForgery::class]);
// ★ v18.70 — 고객 지원(App Store "지원 URL"). 계정 삭제 안내와 같은 안내문이라 세션 미들웨어 뺌
Route::get('/support', [\App\Http\Controllers\LandingPageController::class, 'support'])
    ->withoutMiddleware([\Illuminate\Session\Middleware\StartSession::class, \Illuminate\View\Middleware\ShareErrorsFromSession::class, \Illuminate\Foundation\Http\Middleware\PreventRequestForgery::class]);

// ★ v14 — 명함 공개 웹페이지. 앱 설치 없이 누구나 볼 수 있어야 하므로(설계 원칙 2-3절)
//   /api 프리픽스가 붙는 api.php가 아니라 이 web.php에 등록한다.
// ⚠️ 이 프로젝트는 순수 API 서버라 SESSION_DRIVER=database인데 sessions 테이블이
//   마이그레이션되어 있지 않았음 — 지금까지 web.php에 실제 페이지를 둔 적이 없어서
//   드러나지 않았던 환경 설정 누락. session:table로 마이그레이션 추가해서 해결함
//   (php artisan session:table && php artisan migrate).
Route::get('/c/{code}', [BusinessCardPageController::class, 'show']);
// ★ v18.68 — 공개 명함의 현장 사진(원본 대신 EXIF 없는 줄인 JPEG). 지금 그 명함에 보이는 사진만 열림.
//   사진마다 세션 행이 생기지 않게 세션 미들웨어는 뺌. IP당 분당 120장(한 페이지 최대 6장)
Route::get('/c/{code}/p/{photo}', [BusinessCardPageController::class, 'photo'])->whereNumber('photo')
    ->middleware('throttle:120,1,card-photo')
    // (PreventRequestForgery도 빼야 함 — GET에도 XSRF 쿠키를 붙이려고 세션을 찾다가 500)
    ->withoutMiddleware([\Illuminate\Session\Middleware\StartSession::class, \Illuminate\View\Middleware\ShareErrorsFromSession::class, \Illuminate\Foundation\Http\Middleware\PreventRequestForgery::class]);

// ★ v18.43 — 팀 초대 링크(카톡·문자로 공유) + 최신 APK 고정 주소
// ★ v18.67 IP당 분당 10번 — API(/teams/preview·join, v18.62)의 초대코드 맞히기 방지를 이 웹페이지로 우회하던 것 막음
Route::get('/join/{code}', [\App\Http\Controllers\TeamInvitePageController::class, 'show'])->where('code', '[A-Za-z0-9]{4,12}')
    ->middleware('throttle:10,1,join-web');
// ★ v18.43 — 문자 속 공지·이벤트 바로가기
Route::get('/n/{id}', [\App\Http\Controllers\NoticePageController::class, 'show'])->whereNumber('id');
Route::get('/download/latest', [\App\Http\Controllers\TeamInvitePageController::class, 'latestApk']);

// ★ v18.40 — 웹 관리자(운영자용, frontend 폴더 React 앱). 빌드 결과는 public/admin-app 에 있고,
//   /admin 아래 모든 주소에서 같은 index.html을 돌려줘서 화면 이동(새로고침 포함)이 되게 함.
Route::get('/admin/{any?}', function () {
    return response()->file(public_path('admin-app/index.html'));
})->where('any', '.*');
