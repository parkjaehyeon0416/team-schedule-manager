<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\BusinessCard;
use App\Models\Schedule;
use App\Models\SiteFile;
use App\Models\SiteReport;
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * 자동 보고서(PDF) 생성 컨트롤러
 *
 * v12: 기본 템플릿 1종으로 PDF 생성 (로그인 사용자 전용 다운로드).
 * ★ v13 추가: share_token 기반 공개 열람(publicView) — 고객은 로그인 없이 URL만으로 열람 가능,
 *             열람할 때마다 view_count 증가 + last_viewed_at 갱신.
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
     * ★ v13 신규 — 공유 링크를 통한 공개 열람 (인증 불필요)
     * GET /report/{token}
     *
     * 고객이 로그인 없이 URL 하나만으로 PDF를 볼 수 있도록 브라우저에 인라인으로 스트리밍한다.
     * 접근할 때마다 view_count를 증가시키고 last_viewed_at을 갱신한다(열람 추적).
     */
    public function publicView(string $token)
    {
        $report = SiteReport::where('share_token', $token)->first();

        if (!$report || !$report->pdf_path || !Storage::disk('public')->exists($report->pdf_path)) {
            // ★ 주의 — 이 프로젝트의 전역 예외 핸들러(bootstrap/app.php)는
            //   api/* 경로의 모든 Throwable을 500 + ERR_SERVER_001로 뭉개버린다.
            //   abort(404, ...)를 쓰면 실제로는 500이 나가므로, 다른 컨트롤러들처럼
            //   ApiResponse::error()를 직접 return해서 올바른 상태코드를 보장한다.
            return ApiResponse::error('존재하지 않거나 만료된 보고서 링크입니다.', ErrorCode::REPORT_NOT_FOUND, 404);
        }

        // 열람 추적 — 조회수 +1, 마지막 열람 시각 갱신
        $report->increment('view_count');
        $report->last_viewed_at = now();
        $report->save();

        return response()->file(
            Storage::disk('public')->path($report->pdf_path),
            ['Content-Disposition' => 'inline; filename="' . $report->title . '.pdf"']
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
            'cardQrDataUri'    => $this->buildCardQrDataUri($report),
        ]);

        $relativePath = 'reports/' . $report->share_token . '.pdf';
        Storage::disk('public')->put($relativePath, $pdf->output());

        return $relativePath;
    }

    /**
     * ★ v14 연동 — 보고서 작성자가 명함을 만들어뒀다면 명함 페이지로 연결되는 QR코드를
     * data URI(base64 PNG)로 만들어 PDF에 삽입한다. 명함이 없거나 비공개면 null(QR 생략).
     *
     * 기획서 BusinessCardFeature_v1.0 6-2절("보고서에도 명함 QR 자동 삽입")을
     * 견적서(QuotePdfService, 미구현) 없이 이 자동보고서 PDF에 적용한 것.
     */
    private function buildCardQrDataUri(SiteReport $report): ?string
    {
        $card = BusinessCard::where('user_id', $report->user_id)
            ->where('is_public', true)
            ->first();

        if (!$card) {
            return null;
        }

        // ⚠️ .env의 APP_URL이 실제 접속 가능한 주소와 다르면(예: 포트 누락) QR이 잘못된 곳을 가리킬 수 있음.
        $cardUrl = rtrim(config('app.url'), '/') . '/c/' . $card->share_code;

        $qrCode = new QrCode($cardUrl);
        $png = (new PngWriter())->write($qrCode)->getString();

        return 'data:image/png;base64,' . base64_encode($png);
    }
}
