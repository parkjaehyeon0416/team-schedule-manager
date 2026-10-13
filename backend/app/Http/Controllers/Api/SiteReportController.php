<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\BusinessCard;
use App\Models\Schedule;
use App\Models\Site;
use App\Models\SiteFile;
use App\Models\SiteReport;
use App\Support\ReportPhotoCache;
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * 자동 보고서(PDF) 생성 컨트롤러
 *
 * v12: 기본 템플릿 1종으로 PDF 생성 (로그인 사용자 전용 다운로드).
 * ★ v13 추가: share_token 기반 공개 열람(publicView) — 고객은 로그인 없이 URL만으로 열람 가능,
 *             열람할 때마다 view_count 증가 + last_viewed_at 갱신.
 * ★ v18.67 보안: 팀을 나간 사람은 보기만(만들기·공유 연장·삭제 불가, 나간 뒤 만들어진 보고서는 안 보임), 사람당 한 시간 10건,
 *             PDF에 넣는 사진은 60장·합계 24MB까지 + 큰 사진·PNG는 줄인 JPEG 보관본으로(ReportPhotoCache),
 *             보고서 행은 PDF를 다 만든 뒤에 저장
 */
class SiteReportController extends Controller implements HasMiddleware
{
    /** ★ v18.63 — 공유 링크 유효 기간(일). 공유할 때마다 그때부터 3일 */
    public const SHARE_DAYS = 3;
    /** ★ v18.67 — 보기만 하는 사람(팀을 나간 사람 등)이 [보기]를 눌렀는데 링크가 만료돼 있으면 이 시간(분)만 여는 보기용 링크 */
    public const VIEW_LINK_MINUTES = 30;

    // ★ v18.67 보안 — PDF 생성 남용·서버 마비 방지
    public const REPORTS_PER_HOUR   = 10;            // 사람당 한 시간에 만들 수 있는 보고서(요금제와 별개)
    public const MAX_REPORT_PHOTOS  = 60;            // 보고서 한 건에 넣는 사진 최대 장수
    public const PDF_DECODE_BUDGET  = 32_000_000;    // 보고서 한 건에서 "새로" 줄이는 사진 픽셀 합계(3200만 화소 ≈ 최대 3~4초).
                                                     //   보통은 올릴 때 미리 줄여 두므로 여기까지 오는 사진은 거의 없음
    public const PDF_BYTES_BUDGET   = 24_000_000;    // PDF에 넣는 사진 파일 합계(24MB). dompdf가 사진 바이트를 통째로 메모리에 올려서
                                                     //   합계 78MB에서 256M를 넘겨 Fatal로 죽었음(24MB면 최대 약 160MB)
    /** 줄인 사진 보관 폴더(비공개 디스크) — ReportPhotoCache::DIR와 같음(예전 이름 호환) */
    public const PHOTO_CACHE_DIR    = ReportPhotoCache::DIR;

    /** ★ v18.67 보안 — 운영자 계정은 앱 보고서 API 사용 불가(routes/api.php 대신 컨트롤러에서 붙임) */
    public static function middleware(): array
    {
        // 로그인 없이 여는 공유 링크(publicView)는 제외
        return [(new Middleware(\App\Http\Middleware\BlockOperatorFromApp::class))->except(['publicView'])];
    }

    /** ★ v18.66 — 인사말을 비워 두면 보고서 첫 장에 넣는 기본 문구 */
    public const DEFAULT_GREETING = "안녕하세요. 맡겨 주신 시공이 잘 마무리되어 현장 사진과 함께 보고드립니다.\n궁금하신 점이 있으면 언제든 연락 주세요. 감사합니다.";

    /**
     * ★ v18.63 — 공유하기(앱의 [공유]·[열기]). 링크가 살아 있으면 그대로 두고 기한만 지금부터 3일로,
     *   이미 만료됐으면 새 주소로 바꿔서(옛 링크는 계속 막힘) 돌려줌.
     * POST /api/reports/{id}/share   (선택 body: purpose = view | share)
     *
     * ★ v18.67 보안 — "보기"와 "공유"를 나눔. 앱의 [보기]도 이 API로 링크를 받아 열기 때문에,
     *   쓰기 권한이 없는 사람(팀을 나간 사람, 나간 팀 현장이 붙은 내 개인 일정 등)도 [보기]는 되어야 함(v18.7).
     *   - 쓰기 권한 있음: 예전 그대로(3일 연장, 만료됐으면 새 주소)
     *   - 보기만: 링크가 살아 있으면 기한을 늘리지 않고 그대로 돌려주고, 만료됐으면 30분짜리 보기용 링크만 새로 만듦.
     *     새 앱이 purpose=share로 부르면 403(예전 앱은 purpose를 안 보내서 보기로 처리)
     */
    public function share(Request $request, string $id)
    {
        $report = $this->findReportForUser($request, $id);
        if (!$report) {
            return ApiResponse::error('존재하지 않는 보고서입니다.', ErrorCode::REPORT_NOT_FOUND, 404);
        }
        if ($denied = $this->contributeDenied($request->user(), $report->schedule, '공유할')) {
            if ($request->input('purpose') === 'share') {
                return $denied;
            }
            if (!$report->share_expires_at || $report->share_expires_at->isPast()) {
                $report->share_token      = $this->generateShareToken();
                $report->share_expires_at = now()->addMinutes(self::VIEW_LINK_MINUTES);
                $report->save();
                $message = '보기용 링크는 ' . self::VIEW_LINK_MINUTES . '분 동안 열려요.';
            }
            return ApiResponse::success([
                'share_token'      => $report->share_token,
                'share_expires_at' => $report->share_expires_at->toIso8601String(),
            ], $message ?? '공유 링크가 열려 있어요.');
        }

        if (!$report->share_expires_at || $report->share_expires_at->isPast()) {
            $report->share_token = $this->generateShareToken();
        }
        $report->share_expires_at = now()->addDays(self::SHARE_DAYS);
        $report->save();

        return ApiResponse::success([
            'share_token'      => $report->share_token,
            'share_expires_at' => $report->share_expires_at->toIso8601String(),
        ], '공유 링크는 3일 동안 열려요.');
    }

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

        $user = $request->user();
        // ★ v18.67 — 삭제 버튼도 실제 삭제 권한과 같게(팀을 나간 사람은 자기 보고서도 보기만)
        $canEdit    = $schedule->canEditBy($user);
        $canContrib = $this->contributeDenied($user, $schedule, '삭제할') === null;
        // ★ v18.67 보안 — 보기만 하는 사람은 팀을 나가기 전에 만들어진 보고서 + 본인 보고서만(나간 뒤의 새 사진이 담긴 보고서 차단)
        $reports = Site::applyViewCutoff(
            SiteReport::with('user:id,name')->where('schedule_id', $schedule->id),
            $schedule->viewCutoffFor($user), $user, 'user_id'
        )
            ->orderByDesc('id')
            ->get()
            // ★ v18.66 디자인 SCHEDULE_REPORTS — 삭제 버튼(만든 사람·팀장·부팀장만)과 "OOO님이 만든 보고서" 표시용
            ->map(function (SiteReport $r) use ($user, $canEdit, $canContrib) {
                $mine = (int) $r->user_id === (int) $user->id;
                $r->setAttribute('is_mine', $mine);
                $r->setAttribute('can_delete', $canEdit || ($mine && $canContrib));
                $r->setAttribute('author_name', $mine ? null : $r->user?->name);
                $r->unsetRelation('user');
                return $r;
            });

        // ★ v18.66 — ?with_context=1이면 화면 위쪽 "보고서에 들어갈 내용"·이번 달 사용량도 같이(예전 앱은 배열 그대로 받음)
        if ($request->boolean('with_context')) {
            return ApiResponse::success([
                'reports' => $reports,
                'context' => $this->context($schedule, $user),
            ], '보고서 목록 조회 성공');
        }

        return ApiResponse::success($reports, '보고서 목록 조회 성공');
    }

    /** ★ v18.66 — 보고서에 들어갈 내용(현장·작업일·공정·사진 수) + 이번 달 무료 사용량 */
    private function context(Schedule $schedule, $user): array
    {
        $schedule->loadMissing('site', 'workTypeRelation');
        $site = $schedule->site;
        $address = $site
            ? trim(implode(' ', array_filter([$site->address, $site->dong ? $site->dong . '동' : null, $site->ho ? $site->ho . '호' : null])))
            : trim(($schedule->address ?? '') . ' ' . ($schedule->address_detail ?? ''));

        $counts = ['before' => 0, 'during' => 0, 'after' => 0, 'other' => 0];
        if ($schedule->site_id) {
            // ★ v18.67 — 사진 수도 그 사람이 볼 수 있는 사진 기준(PhotoController::index와 같음)
            Site::applyViewCutoff(
                SiteFile::where('site_id', $schedule->site_id)->where('file_type', 'photo'),
                $schedule->viewCutoffFor($user), $user, 'uploaded_by'
            )
                ->selectRaw('photo_category, COUNT(*) as c')->groupBy('photo_category')->get()
                ->each(function ($row) use (&$counts) {
                    $key = array_key_exists($row->photo_category ?? '', $counts) ? $row->photo_category : 'other';
                    $counts[$key] += (int) $row->c;
                });
        }

        $limit = \App\Services\PlanService::limit($user, 'reports_per_month', 'report_unlimited');
        $used = SiteReport::withTrashed()->where('user_id', $user->id)->where('created_at', '>=', now()->startOfMonth())->count();

        return [
            'has_site'     => (bool) ($schedule->site_id || $schedule->address),
            'site_name'    => $site ? ($site->apt_name ?: $site->address) : ($schedule->title ?: $schedule->address),
            'address'      => $address ?: null,
            'date'         => $schedule->date instanceof \Carbon\Carbon ? $schedule->date->toDateString() : (string) $schedule->date,
            'work_type'    => $schedule->workTypeRelation?->name ?? $schedule->work_type,
            'area_m2'      => $schedule->area_m2 !== null ? (float) $schedule->area_m2 : null,
            'photo_counts' => $counts + ['total' => array_sum($counts)],
            // 무료 한도(null이면 무제한 — 출시 기념 무료·프로)
            'usage'        => ['used' => $used, 'limit' => $limit],
        ];
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

        // ★ v18.67 보안 — 팀을 나간 사람은 옛 팀 일정을 보기만(보고서 만들기 불가). 현장 자동 생성보다 먼저 확인
        if (!$schedule->canContributeBy($user)) {
            return ApiResponse::error('지금 소속된 팀의 일정에서만 보고서를 만들 수 있어요.', ErrorCode::AUTH_NO_PERMISSION, 403);
        }
        // ★ v18.67 보안 — 사람당 한 시간에 10건(PDF 생성은 무거워서 요청을 반복하면 서버 전체가 멈췄음)
        $rateKey = 'report-create:' . $user->id;
        if (RateLimiter::tooManyAttempts($rateKey, self::REPORTS_PER_HOUR)) {
            $minutes = max(1, (int) ceil(RateLimiter::availableIn($rateKey) / 60));
            return ApiResponse::error('보고서는 한 시간에 ' . self::REPORTS_PER_HOUR . "건까지 만들 수 있어요. {$minutes}분 뒤에 다시 시도해주세요.",
                ErrorCode::TOO_MANY_REQUESTS, 429);
        }

        // ★ v18.35 — 주소만 적은 일정이면 그 주소로 현장을 자동 생성해 연결
        if (!$schedule->ensureSite($user->id)) {
            return ApiResponse::error('일정에 현장이나 주소를 먼저 지정해야 보고서를 만들 수 있습니다.',
                ErrorCode::REPORT_NO_SITE_LINKED, 422);
        }
        // ★ v18.67 보안 — 현장 기준으로도 확인(팀을 나간 뒤 내 개인 일정에 남은 옛 팀 현장, 다른 팀 현장 등은 보기만)
        if ($fail = $this->contributeDenied($user, $schedule, '만들')) {
            return $fail;
        }

        // ★ v18.47 — 무료는 월 2건(지운 보고서도 셈). 개인 프로는 무제한
        $reportLimit = \App\Services\PlanService::limit($user, 'reports_per_month', 'report_unlimited');
        if ($reportLimit !== null
            && ($used = SiteReport::withTrashed()->where('user_id', $user->id)->where('created_at', '>=', now()->startOfMonth())->count()) >= $reportLimit) {
            return \App\Services\PlanService::denied('report_unlimited',
                "무료로는 보고서를 한 달에 {$reportLimit}건까지 만들 수 있어요. 개인 프로에서 무제한으로 쓸 수 있어요.",
                ['limit' => $reportLimit, 'used' => $used, 'unit' => '건', 'monthly' => true]);
        }

        $data = $request->validate([
            'title'            => 'required|string|max:200',
            'client_name'      => 'nullable|string|max:100',
            'client_contact'   => 'nullable|string|max:100',
            // ★ v18.67 — 인사말 길이 상한(아주 긴 글로 PDF를 수백 장 그리게 해 서버를 붙잡던 것)
            'greeting_message' => 'nullable|string|max:2000',
        ]);

        // ★ v18.67 — 실제로 PDF를 그리는 요청만 셈(입력 오류·한도 초과는 안 셈), 한 시간 뒤 풀림.
        //   PDF가 실패해도 셈(실패하는 요청을 반복해 서버를 붙잡지 못하게)
        RateLimiter::hit($rateKey, 3600);

        // ★ v18.67 — 보고서 행은 PDF를 다 만든 "뒤에" 저장. 예전엔 행을 먼저 만들어서, PDF를 그리다 메모리 초과(Fatal,
        //   try/catch로 못 잡음)로 죽으면 pdf_path가 빈 고장 난 보고서가 목록에 남고 월 사용량도 깎였음
        $report = new SiteReport([
            'schedule_id'       => $schedule->id,
            'user_id'           => $user->id,
            'title'             => $data['title'],
            'client_name'       => $data['client_name'] ?? null,
            'client_contact'    => $data['client_contact'] ?? null,
            // ★ v18.66 디자인 SCHEDULE_REPORTS — "비워 두면 기본 인사말을 넣어요"
            'greeting_message'  => trim((string) ($data['greeting_message'] ?? '')) !== ''
                ? $data['greeting_message']
                : self::DEFAULT_GREETING,
            'template_id'       => 'basic',
            'share_token'       => $this->generateShareToken(),
            'share_expires_at'  => now()->addDays(self::SHARE_DAYS),
        ]);

        try {
            $pdfPath = $this->renderAndStorePdf($report, $schedule);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('보고서 PDF 생성 실패', [
                'schedule_id' => $schedule->id, 'user_id' => $user->id, 'error' => $e->getMessage(),
                'at' => $e->getFile() . ':' . $e->getLine(),
            ]);
            return ApiResponse::error('PDF 생성 중 오류가 발생했습니다.', ErrorCode::REPORT_PDF_FAILED, 500);
        }

        $report->pdf_path = $pdfPath;
        try {
            $report->save();
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($pdfPath); // 행 저장이 실패하면 주인 없는 PDF 파일을 남기지 않음
            throw $e;
        }

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
        if (!$report || !$report->pdf_path || !Storage::disk('local')->exists($report->pdf_path)) {
            return ApiResponse::error('존재하지 않는 보고서입니다.', ErrorCode::REPORT_NOT_FOUND, 404);
        }

        return response()->download(
            Storage::disk('local')->path($report->pdf_path),
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

        if (!$report || !$report->pdf_path || !Storage::disk('local')->exists($report->pdf_path)) {
            // ★ 주의 — 이 프로젝트의 전역 예외 핸들러(bootstrap/app.php)는
            //   api/* 경로의 모든 Throwable을 500 + ERR_SERVER_001로 뭉개버린다.
            //   abort(404, ...)를 쓰면 실제로는 500이 나가므로, 다른 컨트롤러들처럼
            //   ApiResponse::error()를 직접 return해서 올바른 상태코드를 보장한다.
            return ApiResponse::error('존재하지 않거나 만료된 보고서 링크입니다.', ErrorCode::REPORT_NOT_FOUND, 404);
        }
        // ★ v18.63 — 공유 링크는 공유한 때부터 3일만 열림
        if (!$report->share_expires_at || $report->share_expires_at->isPast()) {
            return response(view('errors.link-expired', ['what' => '보고서']), 410);
        }

        // 열람 추적 — 조회수 +1, 마지막 열람 시각 갱신
        $report->increment('view_count');
        $report->last_viewed_at = now();
        $report->save();

        return response()->file(
            Storage::disk('local')->path($report->pdf_path),
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
        // ★ v18.62 보안 — 만든 사람 본인 또는 팀장·부팀장만 삭제
        // ★ v18.67 보안 — 만든 사람이라도 팀을 나갔으면 보기만(팀장·부팀장, 개인 일정 주인은 그대로)
        $user = $request->user();
        if (!$report->schedule?->canEditBy($user)) {
            if ((int) $report->user_id !== (int) $user->id) {
                return ApiResponse::error('본인이 만든 보고서만 삭제할 수 있어요.', 'ERR_AUTH_002', 403);
            }
            if ($fail = $this->contributeDenied($user, $report->schedule, '삭제할')) {
                return $fail;
            }
        }

        if ($report->pdf_path) {
            Storage::disk('local')->delete($report->pdf_path);
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

        return Schedule::forUser($user)
            ->find($scheduleId);
    }

    private function findReportForUser(Request $request, string $id): ?SiteReport
    {
        $user = $request->user();

        $report = SiteReport::whereHas('schedule', function ($q) use ($user) {
            $q->forUser($user);
        })->find($id);

        // ★ v18.67 보안 — 보기만 하는 사람은 팀을 나가기 전에 만들어진 보고서 + 본인 보고서만(목록 index와 같은 기준)
        if ($report && $report->schedule
            && !Site::visibleUnderCutoff($report->schedule->viewCutoffFor($user), $user, $report->user_id, $report->created_at)) {
            return null;
        }

        return $report;
    }

    private function generateShareToken(): string
    {
        do {
            $token = Str::random(64);
        } while (SiteReport::where('share_token', $token)->exists());

        return $token;
    }

    /**
     * ★ v18.67 보안 — 이 일정으로 보고서를 만들거나·공유하거나·(본인 것을) 지울 수 있나.
     *   보기(forUser)는 팀을 나간 뒤에도 되지만(v18.7), 쓰기는 지금 소속일 때만. 현장 기준으로도 확인.
     *   $verb: 안내 문구용 '만들' | '공유할' | '삭제할'
     */
    private function contributeDenied($user, ?Schedule $schedule, string $verb)
    {
        if (!$schedule || !$schedule->canContributeBy($user)) {
            return ApiResponse::error("지금 소속된 팀의 일정에서만 보고서를 {$verb} 수 있어요.", ErrorCode::AUTH_NO_PERMISSION, 403);
        }
        if ($schedule->site_id) {
            $site = Site::withTrashed()->find($schedule->site_id);
            if ($site && !$site->canContributeBy($user, $schedule)) {
                return ApiResponse::error("이 현장으로는 보고서를 {$verb} 수 없어요.", ErrorCode::AUTH_NO_PERMISSION, 403);
            }
        }
        return null;
    }

    private function renderAndStorePdf(SiteReport $report, Schedule $schedule): string
    {
        // ★ v18.35 — 사진이 여러 장이면 이미지 디코딩에 메모리를 많이 써서 기본 128M로는 부족할 수 있음.
        //   서버 RAM이 1GB라 이 요청에서만 256M로 올림.
        ini_set('memory_limit', '256M');

        $schedule->loadMissing('workTypeRelation');
        $site = $schedule->site;

        $photos = SiteFile::where('site_id', $schedule->site_id)
            ->where('file_type', 'photo')
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();

        // ★ v18.67 보안 — PDF에 넣는 사진은 60장까지(시공 전·후 짝 먼저, 나머지는 단계별로 고르게)
        $picked = $this->pickReportPhotos($photos);

        // ★ v18.67 보안 — 사진을 PDF용으로 준비(ReportPhotoCache): 2500만 화소 넘는 사진(압축 폭탄 포함)은 빼고,
        //   PNG·큰 사진은 올릴 때 미리 만들어 둔 줄인 JPEG을 넣음. 보관본이 없으면 이번 요청에서 3200만 화소까지만 새로 줄이고,
        //   PDF에 넣는 사진 파일 합계는 24MB까지(넘으면 dompdf가 메모리 초과로 죽었음). 넘치는 사진은 빼고 안내 문구.
        //   시공 전·후 짝 사진을 먼저 준비해서 예산이 모자라도 짝 비교가 먼저 들어가게 함.
        $decodeBudget = self::PDF_DECODE_BUDGET;
        $byteBudget   = self::PDF_BYTES_BUDGET;
        $skips = ['big' => 0, 'later' => 0, 'bytes' => 0];
        $pairIds = [];
        $pickedBeforeIds = $picked->where('photo_category', 'before')->pluck('id')->flip();
        foreach ($picked->where('photo_category', 'after') as $a) {
            if ($a->paired_with_id && $pickedBeforeIds->has($a->paired_with_id)) {
                $pairIds[$a->paired_with_id] = true;
                $pairIds[$a->id] = true;
            }
        }
        $paths = [];
        foreach ($picked->sortBy(fn($p) => isset($pairIds[$p->id]) ? 0 : 1) as $p) {
            $paths[$p->id] = $this->preparePhotoForPdf($p, $decodeBudget, $byteBudget, $skips);
        }
        $skipped = $skips['big'];

        $prepared = collect();
        foreach ($picked as $p) {
            $path = $paths[$p->id] ?? null;
            if ($path === null) {
                continue;
            }
            // 뷰(reports.basic)가 쓰는 값만 담은 가벼운 객체 — absolute_path만 줄인 사진 경로로 바꿈
            $prepared->push((object) [
                'id'             => $p->id,
                'photo_category' => $p->photo_category,
                'paired_with_id' => $p->paired_with_id,
                'description'    => $p->description,
                'absolute_path'  => $path,
            ]);
        }

        $photosByCategory = $prepared->groupBy(fn($p) => $p->photo_category ?? 'other');

        // 시공 전/후 페어 — after 사진 중 paired_with_id가 있는 것만 대상
        $beforeById = $prepared->where('photo_category', 'before')->keyBy('id');
        $pairs = $prepared->where('photo_category', 'after')
            ->filter(fn($p) => $p->paired_with_id && $beforeById->has($p->paired_with_id))
            ->map(fn($p) => [
                'before' => $beforeById->get($p->paired_with_id),
                'after'  => $p,
            ])
            ->values();

        $html = view('reports.basic', [
            'report'           => $report,
            'schedule'         => $schedule,
            'site'             => $site,
            'photosByCategory' => $photosByCategory,
            'pairs'            => $pairs,
            'cardQrDataUri'    => $this->buildCardQrDataUri($report),
        ])->render();

        // ★ v18.67 — 빠진 사진이 있으면 PDF 맨 아래(생성일 위)에 안내
        $notes = [];
        if ($photos->count() > $picked->count()) {
            $notes[] = '사진이 많아 ' . $picked->count() . "장만 넣었어요(전체 {$photos->count()}장). 나머지 사진은 앱에서 볼 수 있어요.";
        }
        if ($skipped > 0) {
            $notes[] = "크기가 너무 크거나 읽을 수 없는 사진 {$skipped}장은 보고서에서 뺐어요.";
        }
        if ($skips['later'] > 0) {
            // 이번 요청에서 줄인 사진은 보관되므로, 보고서를 다시 만들 때마다 남은 사진이 차례로 준비됨
            $notes[] = "사진 {$skips['later']}장은 아직 보고서용으로 준비되지 않아 이번 보고서에서 뺐어요. 보고서를 다시 만들면 들어가요.";
        }
        if ($skips['bytes'] > 0) {
            $notes[] = "보고서 용량이 너무 커져서 사진 {$skips['bytes']}장은 뺐어요. 나머지 사진은 앱에서 볼 수 있어요.";
        }
        if ($notes) {
            $html = $this->injectNotes($html, $notes);
        }

        $pdf = Pdf::loadHTML($html);

        $relativePath = 'reports/' . $report->share_token . '.pdf';
        // ★ v18.63 비공개 폴더에 저장(공유 링크·다운로드로만 열림, /storage 주소로 바로 못 엶)
        Storage::disk('local')->put($relativePath, $pdf->output());

        return $relativePath;
    }

    /**
     * ★ v18.67 — 보고서에 넣을 사진 고르기(최대 60장, 원래 순서 유지).
     *   ① 시공 전·후 짝을 먼저 ② 나머지는 시공 전→중→후→기타 순으로 한 장씩 돌아가며
     *   (한 단계 사진이 아주 많아도 다른 단계가 통째로 빠지지 않게)
     */
    private function pickReportPhotos(Collection $photos): Collection
    {
        $cap = self::MAX_REPORT_PHOTOS;
        if ($photos->count() <= $cap) {
            return $photos;
        }

        $chosen = [];
        $beforeById = $photos->where('photo_category', 'before')->keyBy('id');
        foreach ($photos->where('photo_category', 'after') as $after) {
            if (count($chosen) + 2 > $cap) {
                break;
            }
            if ($after->paired_with_id && $beforeById->has($after->paired_with_id)) {
                $chosen[$after->paired_with_id] = true;
                $chosen[$after->id] = true;
            }
        }

        $queues = ['before' => [], 'during' => [], 'after' => [], 'other' => []];
        foreach ($photos as $p) {
            if (!isset($chosen[$p->id])) {
                $cat = array_key_exists($p->photo_category ?? '', $queues) ? $p->photo_category : 'other';
                $queues[$cat][] = $p->id;
            }
        }
        while (count($chosen) < $cap && array_filter($queues)) {
            foreach ($queues as $cat => $ids) {
                if ($ids && count($chosen) < $cap) {
                    $chosen[array_shift($queues[$cat])] = true;
                }
            }
        }

        return $photos->filter(fn($p) => isset($chosen[$p->id]))->values();
    }

    /**
     * ★ v18.67 — 사진 한 장을 PDF에 넣을 수 있게 준비하고 그 파일 경로를 돌려줌(못 넣으면 null, 이유는 $skips에 셈).
     *   - 머리글(getimagesize)로 크기만 먼저 읽어 2500만 화소가 넘거나 JPG·PNG가 아니면 펼치지 않고 뺌 → big
     *   - 올릴 때 만들어 둔 줄인 JPEG 보관본이 있으면 그것, 아주 가벼운 JPEG(1600px·350KB 이하)은 원본 그대로
     *   - 둘 다 아니면 이번 요청에서 새로 줄임. 단 새로 줄이는 픽셀 합계는 $decodeBudget까지 → 넘으면 later
     *     (예전처럼 큰 JPEG 원본을 그대로 넣는 길은 없앰 — 10MB 원본 수십 장이 dompdf 메모리를 넘겼음)
     *   - PDF에 넣는 파일 합계는 $byteBudget까지 → 넘으면 bytes
     */
    private function preparePhotoForPdf(SiteFile $photo, int &$decodeBudget, int &$byteBudget, array &$skips): ?string
    {
        $src = $photo->absolute_path;
        $info = ReportPhotoCache::info($src);
        if (!$info || !ReportPhotoCache::supported($info)) {
            $skips['big']++;
            return null;
        }

        $path = ReportPhotoCache::cachedPath((int) $photo->id);
        if (!$path && ReportPhotoCache::rawUsable($info, $src)) {
            $path = $src;
        }
        if (!$path) {
            $pixels = $info[0] * $info[1];
            if ($pixels > $decodeBudget) {
                $skips['later']++;
                return null;
            }
            $decodeBudget -= $pixels;
            $path = ReportPhotoCache::make($photo);
            if (!$path) {
                $skips['big']++; // GD가 못 여는 사진(CMYK JPEG 등)
                return null;
            }
        }

        $size = (int) @filesize($path);
        if ($size <= 0 || $size > $byteBudget) {
            $skips['bytes']++;
            return null;
        }
        $byteBudget -= $size;

        return $path;
    }

    /** ★ v18.67 — 렌더된 보고서 HTML의 맨 아래(생성일 줄 위)에 안내 상자를 끼워 넣음 */
    private function injectNotes(string $html, array $notes): string
    {
        $box = '<div style="margin:16px 0 0; padding:8px 12px; border:1px solid #ddd; background:#F5F7FA; border-radius:4px; font-size:10px; color:#555;">'
            . implode('<br>', array_map('e', $notes)) . '</div>';
        $pos = strrpos($html, '<div class="footer">');
        if ($pos !== false) {
            return substr_replace($html, $box, $pos, 0);
        }
        return str_replace('</body>', $box . '</body>', $html);
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
