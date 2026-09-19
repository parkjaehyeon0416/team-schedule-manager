<?php

use App\Http\Controllers\BusinessCardPageController;
use Illuminate\Support\Facades\Route;

// API 백엔드 전용 — 웹 페이지는 React 프론트엔드에서 제공
Route::get('/', function () {
    return response()->json([
        'app' => 'Team Schedule Manager API',
        'version' => '1.0',
        'status' => 'running',
    ]);
});

// ★ v14 — 명함 공개 웹페이지. 앱 설치 없이 누구나 볼 수 있어야 하므로(설계 원칙 2-3절)
//   /api 프리픽스가 붙는 api.php가 아니라 이 web.php에 등록한다.
// ⚠️ 이 프로젝트는 순수 API 서버라 SESSION_DRIVER=database인데 sessions 테이블이
//   마이그레이션되어 있지 않았음 — 지금까지 web.php에 실제 페이지를 둔 적이 없어서
//   드러나지 않았던 환경 설정 누락. session:table로 마이그레이션 추가해서 해결함
//   (php artisan session:table && php artisan migrate).
Route::get('/c/{code}', [BusinessCardPageController::class, 'show']);
