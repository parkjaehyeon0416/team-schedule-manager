<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\SiteController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\CalculateController;
use App\Http\Controllers\Api\PhotoController;
use App\Http\Controllers\Api\SiteReportController;               // ★ v12
use App\Http\Controllers\Api\BusinessCardController;              // ★ v14
use App\Http\Controllers\Api\WorkTypeController;                // ★ v10.1
use App\Http\Controllers\Api\UserWageSettingController;         // ★ v10.1
use App\Http\Controllers\Api\MonthlySummaryController;          // ★ v10.1
use App\Http\Controllers\Api\TaxSummaryController;              // ★ v17
use App\Http\Controllers\Api\QuoteController;                   // ★ v12~v13
use App\Http\Controllers\Api\UserMaterialController;            // ★ v12
use App\Http\Controllers\Api\NotificationSettingController;     // ★ v18.1
use Illuminate\Support\Facades\Route;

// ═══════════════════════════════════════════════════════════════
// ─── 공개 라우트 (인증 불필요) ──
// ═══════════════════════════════════════════════════════════════
// ★ 브루트포스 방지 — IP당 분당 5회로 제한 (기존엔 rate limit이 전혀 없었음)
Route::prefix('auth')->middleware('throttle:5,1')->group(function () {
    Route::post('/register',         [AuthController::class, 'register']);
    Route::post('/login',            [AuthController::class, 'login']);
    Route::post('/find-email',       [AuthController::class, 'findEmail']);
    Route::post('/forgot-password',  [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password',   [AuthController::class, 'resetPassword']);
});

// ★ v13 — 공유 링크(비로그인 고객 열람). 인증 불필요, share_token 자체가 접근 키 역할.
Route::get('/report/{token}', [SiteReportController::class, 'publicView']);

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
    Route::post('/teams/leave',    [TeamController::class, 'leave']);

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
    // ── ★ v12~v13 견적서 (member 이상 — 작업자 본인도 견적 작성 가능) ──
    // ═══════════════════════════════════════════════════════════
    Route::get('/quotes',              [QuoteController::class, 'index']);
    Route::post('/quotes',             [QuoteController::class, 'store']);
    Route::get('/quotes/{id}',         [QuoteController::class, 'show']);
    Route::patch('/quotes/{id}/status', [QuoteController::class, 'updateStatus']);
    Route::post('/quotes/{id}/approve', [QuoteController::class, 'approve']);
    Route::get('/quotes/{id}/pdf',     [QuoteController::class, 'downloadPdf']);
    Route::delete('/quotes/{id}',      [QuoteController::class, 'destroy']);

    // 내 자재 목록 (견적 라인 자동완성용)
    Route::get('/materials',      [UserMaterialController::class, 'index']);
    Route::delete('/materials/{id}', [UserMaterialController::class, 'destroy']);

    // ═══════════════════════════════════════════════════════════
    // ── ★ v14 모바일 명함 (member 이상, 공개 열람은 web.php의 /c/{code}) ──
    // ═══════════════════════════════════════════════════════════
    Route::get('/business-card',    [BusinessCardController::class, 'show']);
    Route::put('/business-card',    [BusinessCardController::class, 'store']);
    Route::delete('/business-card', [BusinessCardController::class, 'destroy']);

    // ═══════════════════════════════════════════════════════════
    // ── ★ v10.1 공수·급여 자동 계산 API (member 이상) ──
    // ═══════════════════════════════════════════════════════════

    // 공정 목록 조회
    Route::get('/work-types', [WorkTypeController::class, 'index']);

    // 내 단가 프로파일 CRUD
    Route::get('/wage-settings',         [UserWageSettingController::class, 'index']);
    Route::post('/wage-settings',        [UserWageSettingController::class, 'store']);
    Route::delete('/wage-settings/{id}', [UserWageSettingController::class, 'destroy']);

    // ★ v18.1 — 내 알림 설정 조회/수정
    Route::get('/notification-settings', [NotificationSettingController::class, 'show']);
    Route::put('/notification-settings', [NotificationSettingController::class, 'update']);

    // 월별 수입 집계 조회
    Route::get('/monthly-summary', [MonthlySummaryController::class, 'show']);

    // ═══════════════════════════════════════════════════════════
    // ── ★ v17 수입·경비 정리 (세무사용, member 이상 — 본인 자료 조회) ──
    // ═══════════════════════════════════════════════════════════
    Route::get('/tax-summary',     [TaxSummaryController::class, 'show']);
    Route::get('/tax-summary/pdf', [TaxSummaryController::class, 'downloadPdf']);

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
