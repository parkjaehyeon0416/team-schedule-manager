<?php

use App\Http\Controllers\BusinessCardPageController;
use Illuminate\Support\Facades\Route;

// ★ v18.48 — 앱 소개 웹페이지(예전엔 API 상태 JSON) + 웹 이용약관·개인정보 처리방침(스토어 등록에 필요)
Route::get('/', [\App\Http\Controllers\LandingPageController::class, 'show']);
Route::get('/terms', [\App\Http\Controllers\LandingPageController::class, 'terms']);
Route::get('/privacy', [\App\Http\Controllers\LandingPageController::class, 'privacy']);

// ★ v14 — 명함 공개 웹페이지. 앱 설치 없이 누구나 볼 수 있어야 하므로(설계 원칙 2-3절)
//   /api 프리픽스가 붙는 api.php가 아니라 이 web.php에 등록한다.
// ⚠️ 이 프로젝트는 순수 API 서버라 SESSION_DRIVER=database인데 sessions 테이블이
//   마이그레이션되어 있지 않았음 — 지금까지 web.php에 실제 페이지를 둔 적이 없어서
//   드러나지 않았던 환경 설정 누락. session:table로 마이그레이션 추가해서 해결함
//   (php artisan session:table && php artisan migrate).
Route::get('/c/{code}', [BusinessCardPageController::class, 'show']);

// ★ v18.43 — 팀 초대 링크(카톡·문자로 공유) + 최신 APK 고정 주소
Route::get('/join/{code}', [\App\Http\Controllers\TeamInvitePageController::class, 'show'])->where('code', '[A-Za-z0-9]{4,12}');
// ★ v18.43 — 문자 속 공지·이벤트 바로가기
Route::get('/n/{id}', [\App\Http\Controllers\NoticePageController::class, 'show'])->whereNumber('id');
Route::get('/download/latest', [\App\Http\Controllers\TeamInvitePageController::class, 'latestApk']);

// ★ v18.40 — 웹 관리자(운영자용, frontend 폴더 React 앱). 빌드 결과는 public/admin-app 에 있고,
//   /admin 아래 모든 주소에서 같은 index.html을 돌려줘서 화면 이동(새로고침 포함)이 되게 함.
Route::get('/admin/{any?}', function () {
    return response()->file(public_path('admin-app/index.html'));
})->where('any', '.*');
