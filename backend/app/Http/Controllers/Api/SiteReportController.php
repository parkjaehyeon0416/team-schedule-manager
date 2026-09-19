<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Schedule;
use App\Models\SiteFile;
use App\Models\SiteReport;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * 자동 보고서(PDF) 생성 컨트롤러 — ★ v12 신규
 *
 * 로드맵 v2.3 기준 v12 1순위 작업: 기본 템플릿 1종으로 PDF 생성.
 * 공유 URL(share_token 활용) + 열람 추적은 v13에서 다룬다 (이 컨트롤러는 로그인 사용자 전용 다운로드만 지원).
 */
class SiteReportController extends Controller
{
    /**
     * 일정에 연결된 보고서 목록 조회
     * GET /api/schedules/{scheduleId}/reports
     */
    public function index(Request $request, int $scheduleId)
    {
        $schedule = $this->findScheduleForUser($request, $scheduleId);
        if (!$schedule) {
            return ApiResponse::error('일정을 찾을 수 없습니다.', ErrorCode::SCHEDULE_NOT_FOUND, 404);
        }

        $reports = SiteReport::where('schedule_id', $schedule->id)
            ->orderByDesc('id')
            ->get();

        return ApiResponse::success($reports, '보고서 목록 조회 성공');
    }

    /**
     * 보고서 생성 (PDF 즉시 생성 + 저장)
     * POST /api/schedules/{scheduleId}/reports
     *
     * Body: title(required), client_name, client_contact, greeting_message
     */
    public function store(Request $request, int $scheduleId)
    {
        $user = $request->user();

        $schedule = $this->findScheduleForUser($request, $scheduleId);
        if (!$schedule) {
            return ApiResponse::error('일정을 찾을 수 없습니다.', ErrorCode::SCHEDULE_NOT_FOUND, 404);
        }

        if (!$schedule->site_id) {
            return ApiResponse::error('현장이 연결되지 않은 일정은 보고서를 생성할 수 없습니다.',
                ErrorCode::REPORT_NO_SITE_LINKED, 422);
        }

        $data = $request->validate([
            'title'            => 'required|string|max:200',
            'client_name'      => 'nullable|string|max:100',
            'client_contact'   => 'nullable|string|max:100',
            'greeting_message' => 'nullable|string',
        ]);

        $report = SiteReport::create([
            'schedule_id'       => $schedule->id,
            'user_id'           => $user->id,
            'title'             => $data['title'],
            'client_name'       => $data['client_name'] ?? null,
            'client_contact'    => $data['client_contact'] ?? null,
            'greeting_message'  => $data['greeting_message'] ?? null,
            'template_id'       => 'basic',
            'share_token'       => $this->generateShareToken(),
        ]);

        try {
            $pdfPath = $this->renderAndStorePdf($report, $schedule);
        } catch (\Throwable $e) {
            $report->delete();
            return ApiResponse::error('PDF 생성 중 오류가 발생했습니다.', ErrorCode::REPORT_PDF_FAILED, 500);
        }

        $report->pdf_path = $pdfPath;
        $report->save();

        return ApiResponse::success($report, '보고서가 생성되었습니다.', 201);
    }

    /**
     * 보고서 상세(메타데이터) 조회
     * GET /api/reports/{id}
     */
    public function show(Request $request, string $id)
    {
        $report = $this->findReportForUser($request, $id);
        if (!$report) {
            return ApiResponse::error('존재하지 않는 보고서입니다.', ErrorCode::REPORT_NOT_FOUND, 404);
        }

        return ApiResponse::success($report, '보고서 조회 성공');
    }

    /**
     * PDF 파일 다운로드
     * GET /api/reports/{id}/download
     */
    public function download(Request $request, string $id)
    {
        $report = $this->findReportForUser($request, $id);
        if (!$report || !$report->pdf_path || !Storage::disk('public')->exists($report->pdf_path)) {
            return ApiResponse::error('존재하지 않는 보고서입니다.', ErrorCode::REPORT_NOT_FOUND, 404);
        }

        return response()->download(
            Storage::disk('public')->path($report->pdf_path),
            $report->title . '.pdf'
        );
    }

    /**
     * 보고서 삭제
     * DELETE /api/reports/{id}
     */
    public function destroy(Request $request, string $id)
    {
        $report = $this->findReportForUser($request, $id);
        if (!$report) {
            return ApiResponse::error('존재하지 않는 보고서입니다.', ErrorCode::REPORT_NOT_FOUND, 404);
        }

        if ($report->pdf_path) {
            Storage::disk('public')->delete($report->pdf_path);
        }
        $report->delete();

        return ApiResponse::success(null, '보고서가 삭제되었습니다.');
    }

    // ─────────────────────────────────────────────
    // 내부 헬퍼
    // ─────────────────────────────────────────────

    private function findScheduleForUser(Request $request, int $scheduleId): ?Schedule
    {
        $user = $request->user();

        return Schedule::when($user->team_id, fn($q) => $q->where('team_id', $user->team_id))
            ->find($scheduleId);
    }

    private function findReportForUser(Request $request, string $id): ?SiteReport
    {
        $user = $request->user();

        return SiteReport::whereHas('schedule', function ($q) use ($user) {
            $q->when($user->team_id, fn($q2) => $q2->where('team_id', $user->team_id));
        })->find($id);
    }

    private function generateShareToken(): string
    {
        do {
            $token = Str::random(64);
        } while (SiteReport::where('share_token', $token)->exists());

        return $token;
    }

    private function renderAndStorePdf(SiteReport $report, Schedule $schedule): string
    {
        $site = $schedule->site;

        $photos = SiteFile::where('site_id', $schedule->site_id)
            ->where('file_type', 'photo')
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();

        $photosByCategory = $photos->groupBy(fn($p) => $p->photo_category ?? 'other');

        // 시공 전/후 페어 — after 사진 중 paired_with_id가 있는 것만 대상
        $beforeById = $photos->where('photo_category', 'before')->keyBy('id');
        $pairs = $photos->where('photo_category', 'after')
            ->filter(fn($p) => $p->paired_with_id && $beforeById->has($p->paired_with_id))
            ->map(fn($p) => [
                'before' => $beforeById->get($p->paired_with_id),
                'after'  => $p,
            ])
            ->values();

        $pdf = Pdf::loadView('reports.basic', [
            'report'           => $report,
            'schedule'         => $schedule,
            'site'             => $site,
            'photosByCategory' => $photosByCategory,
            'pairs'            => $pairs,
        ]);

        $relativePath = 'reports/' . $report->share_token . '.pdf';
        Storage::disk('public')->put($relativePath, $pdf->output());

        return $relativePath;
    }
}
