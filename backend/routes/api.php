<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Responses\ApiResponse;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\SiteController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\CalculateController;
use App\Http\Controllers\Api\PhotoController;

// ───────────────────────────────────
// 인증 없이 접근 가능한 라우트 (공개 API)
// ───────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']); // 회원가입
    Route::post('/login',    [AuthController::class, 'login']);    // 로그인
});

// ───────────────────────────────────
// 로그인 필수 라우트 (토큰 검증)
// ───────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // 내 정보 + 로그아웃
    Route::get('/me',          [AuthController::class, 'me']);
    Route::post('/auth/logout',[AuthController::class, 'logout']);

    // ── 팀장(manager) 이상만 가능 ──
    Route::middleware('role:manager')->group(function () {
        Route::apiResource('schedules',  ScheduleController::class);
        Route::apiResource('sites',      SiteController::class);
        Route::apiResource('teams',      TeamController::class)->only(['index','show','update','destroy']);
    });

    // ── 팀원(member) 이상 모두 가능 ──
    Route::get('/schedules',     [ScheduleController::class, 'index']);
    Route::get('/schedules/{id}',[ScheduleController::class, 'show']);
    Route::get('/sites',         [SiteController::class, 'index']);
    Route::get('/sites/{id}',    [SiteController::class, 'show']);
    Route::apiResource('attendances', AttendanceController::class);
    Route::post('/teams/join',   [TeamController::class, 'join']);

    // 스케줄 CRUD (팀장·팀원 모두 조회 가능, 등록·수정·삭제는 팀장만)
    Route::apiResource('schedules', ScheduleController::class);

    // routes/api.php — auth 미들웨어 그룹 안에 추가
    Route::post('calculate/area', [CalculateController::class, 'area']);

    Route::post('schedules/{scheduleId}/photos', [PhotoController::class, 'store']);
    Route::delete('schedules/{scheduleId}/photos/{photoId}', [PhotoController::class, 'destroy']);

});


