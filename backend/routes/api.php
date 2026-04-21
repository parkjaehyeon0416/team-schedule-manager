<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\SiteController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\CalculateController;
use App\Http\Controllers\Api\PhotoController;
use Illuminate\Support\Facades\Route;

// ═══════════════════════════════════════════════════════════════
// ─── 공개 라우트 (인증 불필요) ──
// ═══════════════════════════════════════════════════════════════
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);
});

// ═══════════════════════════════════════════════════════════════
// ─── 로그인 필수 라우트 ──
// ═══════════════════════════════════════════════════════════════
Route::middleware('auth:sanctum')->group(function () {

    // ── 내 정보 + 로그아웃 ──
    Route::get('/me',           [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // ═══════════════════════════════════════════════════════════
    // ── 조회 (member 이상 모두 가능) ──
    // ═══════════════════════════════════════════════════════════
    Route::get('/schedules',       [ScheduleController::class, 'index']);
    Route::get('/schedules/{id}',  [ScheduleController::class, 'show']);
    Route::get('/sites',           [SiteController::class, 'index']);
    Route::get('/sites/{id}',      [SiteController::class, 'show']);

    // 근태는 본인 것만 CRUD (member 이상)
    Route::apiResource('attendances', AttendanceController::class);

    // 팀 가입
    Route::post('/teams/join',     [TeamController::class, 'join']);

    // 평수 계산
    Route::post('calculate/area',  [CalculateController::class, 'area']);

    // ═══════════════════════════════════════════════════════════
    // ── 등록·수정·삭제 (manager 이상) ──
    // ═══════════════════════════════════════════════════════════
    Route::middleware('role:manager')->group(function () {
        // 일정 CUD
        Route::post('/schedules',        [ScheduleController::class, 'store']);
        Route::put('/schedules/{id}',    [ScheduleController::class, 'update']);
        Route::delete('/schedules/{id}', [ScheduleController::class, 'destroy']);

        // 현장 CUD
        Route::post('/sites',        [SiteController::class, 'store']);
        Route::put('/sites/{id}',    [SiteController::class, 'update']);
        Route::delete('/sites/{id}', [SiteController::class, 'destroy']);

        // 팀 관리
        Route::apiResource('teams', TeamController::class)
            ->only(['index', 'show', 'update', 'destroy']);

        // 현장 사진 업로드·삭제
        Route::post('schedules/{scheduleId}/photos',               [PhotoController::class, 'store']);
        Route::delete('schedules/{scheduleId}/photos/{photoId}',   [PhotoController::class, 'destroy']);
    });
});
