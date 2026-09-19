<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\SiteController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\CalculateController;
use App\Http\Controllers\Api\PhotoController;
use App\Http\Controllers\Api\SiteReportController;               // ★ v12
use App\Http\Controllers\Api\WorkTypeController;                // ★ v10.1
use App\Http\Controllers\Api\UserWageSettingController;         // ★ v10.1
use App\Http\Controllers\Api\MonthlySummaryController;          // ★ v10.1
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

    // ★ 추가 — 내 팀 멤버 목록 조회 (일정 등록 시 투입 인원 선택용)
    Route::get('/team/members',    [TeamController::class, 'members']);

    // 근태는 본인 것만 CRUD (member 이상)
    Route::apiResource('attendances', AttendanceController::class);

    // 팀 조회/가입/생성 (아직 팀이 없는 사용자도 자기 팀 여부를 확인해야 하므로 member 이상 전체 허용.
    // index/show는 컨트롤러 내부에서 본인 team_id로 스코프 처리, superadmin만 전체 조회)
    Route::get('/teams',           [TeamController::class, 'index']);
    Route::get('/teams/{id}',      [TeamController::class, 'show']);
    Route::post('/teams/join',     [TeamController::class, 'join']);
    Route::post('/teams',          [TeamController::class, 'store']);

    // 평수 계산
    Route::post('calculate/area',  [CalculateController::class, 'area']);

    // ═══════════════════════════════════════════════════════════
    // ── ★ v11 현장 사진 (member 이상 — 작업자도 업로드 가능) ──
    // ═══════════════════════════════════════════════════════════
    Route::get('schedules/{scheduleId}/photos',                [PhotoController::class, 'index']);   // ★ v11 신규
    Route::post('schedules/{scheduleId}/photos',               [PhotoController::class, 'store']);   // ★ v11 권한 변경 (manager → member)
    Route::delete('schedules/{scheduleId}/photos/{photoId}',   [PhotoController::class, 'destroy']); // ★ v11 권한 변경 (manager → member)

    // ★ v11.1.1 추가 — 사진 부분 수정 (현재는 paired_with_id만 지원)
    Route::patch('schedules/{scheduleId}/photos/{photoId}',    [PhotoController::class, 'update']);

    // ═══════════════════════════════════════════════════════════
    // ── ★ v12 자동 보고서 (PDF) — member 이상 (작업자 본인도 보고서 작성 가능) ──
    // ═══════════════════════════════════════════════════════════
    Route::get('schedules/{scheduleId}/reports',   [SiteReportController::class, 'index']);
    Route::post('schedules/{scheduleId}/reports',  [SiteReportController::class, 'store']);
    Route::get('reports/{id}',                     [SiteReportController::class, 'show']);
    Route::get('reports/{id}/download',            [SiteReportController::class, 'download']);
    Route::delete('reports/{id}',                  [SiteReportController::class, 'destroy']);

    // ═══════════════════════════════════════════════════════════
    // ── ★ v10.1 공수·급여 자동 계산 API (member 이상) ──
    // ═══════════════════════════════════════════════════════════

    // 공정 목록 조회
    Route::get('/work-types', [WorkTypeController::class, 'index']);

    // 내 단가 프로파일 CRUD
    Route::get('/wage-settings',         [UserWageSettingController::class, 'index']);
    Route::post('/wage-settings',        [UserWageSettingController::class, 'store']);
    Route::delete('/wage-settings/{id}', [UserWageSettingController::class, 'destroy']);

    // 월별 수입 집계 조회
    Route::get('/monthly-summary', [MonthlySummaryController::class, 'show']);

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

        // 팀 관리 — 수정/삭제만 manager 이상 (조회/생성/가입은 위 member+ 그룹으로 이동됨)
        Route::put('/teams/{id}',    [TeamController::class, 'update']);
        Route::delete('/teams/{id}', [TeamController::class, 'destroy']);

        // ★ v11 변경: 사진 라우트는 member 그룹으로 이동됨 (위)
    });
});
