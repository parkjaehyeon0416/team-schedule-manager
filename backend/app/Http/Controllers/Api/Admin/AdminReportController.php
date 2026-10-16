<?php

namespace App\Http\Controllers\Api\Admin;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\ContentReport;
use App\Models\SiteFile;
use App\Models\TeamNotice;
use App\Models\User;
use App\Services\ModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;

/**
 * ★ v18.72 — 운영자 웹 "신고 관리" (Apple 1.2, 디자인 ADMIN_REPORT_LIST / ADMIN_REPORT_DETAIL)
 *   목록·검색·요약 카드, 상세(신고 시점 내용·지금 상태·사진·대상 회원·같은 대상의 다른 신고),
 *   숨기기/숨김 풀기(ModerationService), 처리 완료(조치: 없음·숨김·정지)/기각.
 *   정지는 새로 만들지 않음 — 운영자 웹이 기존 POST /admin/members/{id}/suspend(토큰·기기 토큰까지 삭제)를 부른 뒤
 *   resolve { action: 'suspended' }를 부름.
 *   사진은 운영자 웹 <img>에 토큰이 안 붙어서 30분짜리 서명 링크(signedPhoto)로 보여 줌.
 *   {id}는 string으로 받음 — int로 받으면 주소에 숫자가 아닌 값(또는 아주 큰 수)이 오면 타입 오류로 500. find()가 못 찾아 404로 끝나게.
 */
class AdminReportController extends Controller
{
    private const ACTIONS = ['none', 'hidden', 'suspended'];

    public function __construct(private ModerationService $moderation)
    {
    }

    // GET /api/admin/content-reports?status=pending|resolved|dismissed&type=team_notice|photo|user&q=검색어&page=1
    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        $query = ContentReport::query()
            ->with(self::relations())
            ->when(in_array($request->query('status'), ContentReport::STATUSES, true),
                fn($w) => $w->where('status', $request->query('status')))
            ->when(in_array($request->query('type'), ContentReport::TARGETS, true),
                fn($w) => $w->where('target_type', $request->query('type')))
            ->when($q !== '', fn($w) => $w->where(fn($x) => $x
                ->where('detail', 'like', "%{$q}%")
                ->orWhere('snapshot->body', 'like', "%{$q}%")
                ->when(preg_match('/^R-?(\d+)$/i', $q, $m), fn($y) => $y->orWhere('id', (int) $m[1] - 1000))
                ->orWhereHas('reporter', fn($u) => $u->withTrashed()->where(fn($v) => $v->where('name', 'like', "%{$q}%")->orWhere('email', 'like', "%{$q}%")))
                ->orWhereHas('targetUser', fn($u) => $u->withTrashed()->where(fn($v) => $v->where('name', 'like', "%{$q}%")->orWhere('email', 'like', "%{$q}%")))))
            ->latest()->orderByDesc('id');

        $page = $query->paginate(20);
        $byStatus = ContentReport::selectRaw('status, COUNT(*) c')->groupBy('status')->pluck('c', 'status');

        return ApiResponse::success([
            'items'   => collect($page->items())->map(fn(ContentReport $r) => self::row($r)),
            'total'   => $page->total(),
            'page'    => $page->currentPage(),
            'pages'   => $page->lastPage(),
            'counts'  => [
                'all'       => (int) $byStatus->sum(),
                'pending'   => (int) ($byStatus['pending'] ?? 0),
                'resolved'  => (int) ($byStatus['resolved'] ?? 0),
                'dismissed' => (int) ($byStatus['dismissed'] ?? 0),
            ],
            'summary' => self::summary((int) ($byStatus['pending'] ?? 0)),
        ], '신고 목록 조회 성공');
    }

    // GET /api/admin/content-reports/{id}
    public function show(string $id)
    {
        $report = ContentReport::with(self::relations())->find($id);
        if (!$report) {
            return self::notFound();
        }

        return ApiResponse::success($this->detail($report), '신고 조회 성공');
    }

    // POST /api/admin/content-reports/{id}/hide  { reason? } — 공지·사진을 모든 화면에서 숨김(+ 같은 대상 신고 모두 처리 완료)
    public function hide(Request $request, string $id)
    {
        $data = $request->validate(['reason' => 'nullable|string|max:255']);
        $report = ContentReport::find($id);
        if (!$report) {
            return self::notFound();
        }
        if (!in_array($report->target_type, ModerationService::HIDEABLE, true)) {
            return ApiResponse::error('팀원 신고는 숨길 콘텐츠가 없어요. 필요하면 계정을 정지해주세요.', ErrorCode::VALID_GENERAL, 422);
        }

        $res = $this->moderation->hide($report, $request->user(), $data['reason'] ?? null);
        $message = match ($res['result']) {
            'already_deleted' => '작성자가 이미 지운 내용이라 숨길 게 없어요. 신고는 처리 완료로 바꿨어요.',
            'already_hidden'  => '이미 숨긴 내용이에요. 신고는 처리 완료로 바꿨어요.',
            default           => $res['file_moved'] === false
                ? '숨겼어요. 다만 사진 파일을 옮기지 못했어요. 잠시 후 다시 숨기기를 눌러주세요.'
                : '숨겼어요. 이제 팀원 누구에게도 보이지 않아요.',
        };

        return ApiResponse::success($this->detail($report->fresh(self::relations())) + ['result' => $res], $message);
    }

    // POST /api/admin/content-reports/{id}/unhide — 숨김 풀기(파일·목록·짝까지 원래대로, 같은 대상 신고는 다시 처리 대기)
    public function unhide(Request $request, string $id)
    {
        $report = ContentReport::find($id);
        if (!$report) {
            return self::notFound();
        }
        if (!in_array($report->target_type, ModerationService::HIDEABLE, true)) {
            return ApiResponse::error('숨긴 콘텐츠가 없는 신고예요.', ErrorCode::VALID_GENERAL, 422);
        }

        $res = $this->moderation->unhide($report, $request->user());
        if ($res['result'] === 'not_hidden') {
            return ApiResponse::error('운영자가 숨긴 내용이 아니에요.', ErrorCode::VALID_GENERAL, 422);
        }

        return ApiResponse::success(
            $this->detail($report->fresh(self::relations())) + ['result' => $res],
            $res['file_restored'] === false ? '숨김을 풀었어요. 다만 사진 파일을 되돌리지 못했어요.' : '숨김을 풀었어요. 신고는 다시 처리 대기로 바뀌었어요.',
        );
    }

    // POST /api/admin/content-reports/{id}/resolve  { action: none|hidden|suspended, note? }
    //   hidden이면 아직 안 숨긴 공지·사진을 숨김(hide와 같음 — 같은 대상의 대기 신고도 함께 처리 완료),
    //   suspended면 대상 회원이 먼저 정지돼 있어야 함(웹이 /members/{id}/suspend를 먼저 부름). 이미 처리한 신고도 다시 바꿀 수 있음
    public function resolve(Request $request, string $id)
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(self::ACTIONS)],
            'note'   => 'nullable|string|max:500',
        ]);
        $report = ContentReport::with('targetUser')->find($id);
        if (!$report) {
            return self::notFound();
        }

        if ($data['action'] === 'hidden') {
            if (!in_array($report->target_type, ModerationService::HIDEABLE, true)) {
                return ApiResponse::error('팀원 신고는 숨길 콘텐츠가 없어요. 필요하면 계정을 정지해주세요.', ErrorCode::VALID_GENERAL, 422);
            }
            // 아직 안 숨겼으면 숨김(이미 숨긴 것은 그대로). 작성자가 이미 지운 것이면 조치 없음으로 기록
            $res = $this->moderation->hide($report, $request->user(), null);
            if ($res['result'] === 'already_deleted') {
                $data['action'] = 'none';
            }
        }
        if ($data['action'] === 'suspended' && !$report->targetUser?->suspended_at) {
            return ApiResponse::error('대상 회원 계정이 정지되지 않았어요. 먼저 계정을 정지해주세요.', ErrorCode::VALID_GENERAL, 422);
        }

        $report->fill([
            'status'     => 'resolved',
            'action'     => $data['action'],
            'handled_by' => $request->user()->id,
            'handled_at' => now(),
        ]);
        if (array_key_exists('note', $data)) {
            $report->note = $data['note'];
        }
        $report->save();

        return ApiResponse::success($this->detail($report->fresh(self::relations())), '처리 완료했어요.');
    }

    // POST /api/admin/content-reports/{id}/dismiss  { note? } — 기각(문제없음, 조치 없음)
    public function dismiss(Request $request, string $id)
    {
        $data = $request->validate(['note' => 'nullable|string|max:500']);
        $report = ContentReport::find($id);
        if (!$report) {
            return self::notFound();
        }

        $report->fill([
            'status'     => 'dismissed',
            'action'     => 'none',
            'handled_by' => $request->user()->id,
            'handled_at' => now(),
        ]);
        if (array_key_exists('note', $data)) {
            $report->note = $data['note'];
        }
        $report->save();

        return ApiResponse::success($this->detail($report->fresh(self::relations())), '기각했어요.');
    }

    /**
     * GET /api/files/content-reports/{id}/photo?expires=&signature= (signed:relative, 로그인 없음)
     *   지금 공개 파일 → 숨겨서 옮긴 파일 → 신고 때 복사한 증거 사본 순서로 찾아서 보여 줌.
     */
    public function signedPhoto(string $id)
    {
        $report = ContentReport::where('target_type', 'photo')->find($id);
        $abs = $report ? ModerationService::photoFile($report) : null;
        if (!$abs) {
            return ApiResponse::error('사진을 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
        }

        return response()->file($abs, [
            'Cache-Control' => 'private, no-store',
            'X-Robots-Tag'  => 'noindex',
        ]);
    }

    // ── 응답 모양 ──

    /** 목록·상세에서 함께 불러오는 관계 — 탈퇴한 회원·해체한 팀도 이름은 보이게 withTrashed */
    private static function relations(): array
    {
        $withTrashed = fn($q) => $q->withTrashed();

        return ['reporter' => $withTrashed, 'targetUser' => $withTrashed, 'handler' => $withTrashed, 'team' => $withTrashed];
    }

    private static function row(ContentReport $r): array
    {
        $s = $r->snapshot ?? [];
        $team = $r->team
            ? ['id' => $r->team->id, 'name' => $r->team->name]
            : ($r->team_id || !empty($s['team_name']) ? ['id' => $r->team_id, 'name' => $s['team_name'] ?? null] : null);

        return [
            'id'           => $r->id,
            'no'           => $r->number,
            'target_type'  => $r->target_type,
            'target_label' => ContentReport::TARGET_LABELS[$r->target_type] ?? $r->target_type,
            'reason'       => $r->reason,
            'reason_label' => ContentReport::REASONS[$r->reason] ?? $r->reason,
            'status'       => $r->status,
            'action'       => $r->action,
            'reporter'     => $r->reporter ? ['id' => $r->reporter->id, 'name' => $r->reporter->name, 'withdrawn' => (bool) $r->reporter->deleted_at] : null,
            'target_user'  => $r->targetUser ? [
                'id'        => $r->targetUser->id,
                'name'      => $r->targetUser->name,
                'suspended' => (bool) $r->targetUser->suspended_at,
                'withdrawn' => (bool) $r->targetUser->deleted_at,
            ] : null,
            'team'         => $team,
            'excerpt'      => ModerationService::excerpt($r),
            'created_at'   => $r->created_at?->toIso8601String(),
            'handled_at'   => $r->handled_at?->toIso8601String(),
        ];
    }

    private function detail(ContentReport $r): array
    {
        $member = $r->targetUser;
        $sameTarget = ContentReport::with('reporter')
            ->where('target_type', $r->target_type)->where('target_id', $r->target_id)
            ->where('id', '!=', $r->id)
            ->latest()->orderByDesc('id')->get();
        $photoUrl = $r->target_type === 'photo' && ModerationService::photoFile($r)
            ? URL::temporarySignedRoute('content-reports.photo.signed', now()->addMinutes(30), ['id' => $r->id], absolute: false)
            : null;

        return self::row($r) + [
            'detail'     => $r->detail,
            'note'       => $r->note,
            'handled_by' => $r->handler ? ['id' => $r->handler->id, 'name' => $r->handler->name] : null,
            'snapshot'   => $r->snapshot,
            'target'     => $this->currentTarget($r),
            'photo_url'  => $photoUrl,
            'target_member' => $member ? [
                'id'               => $member->id,
                'name'             => $member->name,
                'email'            => AdminDashboardController::maskEmail($member->email),
                'phone'            => $member->phone,
                'joined_at'        => $member->created_at?->toIso8601String(),
                'teams'            => DB::table('team_members')
                    ->join('teams', 'teams.id', '=', 'team_members.team_id')
                    ->where('team_members.user_id', $member->id)
                    ->whereNull('team_members.deleted_at')->whereNull('teams.deleted_at')
                    ->get(['teams.id', 'teams.name', 'team_members.role_id'])
                    ->map(fn($t) => ['id' => $t->id, 'name' => $t->name, 'is_leader' => (int) $t->role_id <= 2])->values(),
                'suspended_at'     => $member->suspended_at?->toIso8601String(),
                'suspended_reason' => $member->suspended_reason,
                'withdrawn'        => (bool) $member->deleted_at,
            ] : null,
            // 이 회원이 받은 다른 신고 수(재범 확인용)
            'other_reports_count' => $r->target_user_id
                ? ContentReport::where('target_user_id', $r->target_user_id)->where('id', '!=', $r->id)->count()
                : 0,
            'same_target_reports' => $sameTarget->take(10)->map(fn(ContentReport $o) => [
                'id'           => $o->id,
                'no'           => $o->number,
                'reason'       => $o->reason,
                'reason_label' => ContentReport::REASONS[$o->reason] ?? $o->reason,
                'status'       => $o->status,
                'reporter'     => $o->reporter ? ['id' => $o->reporter->id, 'name' => $o->reporter->name] : null,
                'created_at'   => $o->created_at?->toIso8601String(),
            ])->values(),
            'same_target_count' => $sameTarget->count(),
        ];
    }

    /**
     * 신고 대상의 지금 상태 — deleted(작성자가 지움·기록 없음), hidden_at(운영자가 숨김), can_hide/can_unhide.
     *   팀원 신고는 null(target_member 참고).
     */
    private function currentTarget(ContentReport $r): ?array
    {
        if (!in_array($r->target_type, ModerationService::HIDEABLE, true)) {
            return null;
        }
        $model = $this->moderation->targetModel($r);
        if (!$model) {
            return ['exists' => false, 'deleted' => true, 'hidden_at' => null, 'hidden_reason' => null, 'can_hide' => false, 'can_unhide' => false];
        }

        $state = [
            'exists'        => true,
            'deleted'       => $model->trashed() && !$model->hidden_at,
            'hidden_at'     => $model->hidden_at?->toIso8601String(),
            'hidden_reason' => $model->hidden_reason,
            'hidden_by'     => $model->hidden_by ? User::withTrashed()->whereKey($model->hidden_by)->value('name') : null,
            'can_hide'      => !$model->trashed(),
            'can_unhide'    => (bool) $model->hidden_at,
        ];

        if ($model instanceof TeamNotice) {
            $author = User::withTrashed()->find($model->user_id, ['id', 'name']);
            return $state + [
                'body'   => $model->body,
                'pinned' => (bool) $model->pinned,
                'author' => $author ? ['id' => $author->id, 'name' => $author->name] : null,
            ];
        }

        /** @var SiteFile $model */
        $site = DB::table('sites')->where('id', $model->site_id)->first(['id', 'apt_name', 'address', 'deleted_at']);
        $uploader = $model->uploaded_by ? User::withTrashed()->find($model->uploaded_by, ['id', 'name']) : null;

        return $state + [
            'category'    => $model->photo_category,
            'description' => $model->description,
            'site'        => $site ? ['id' => $site->id, 'name' => $site->apt_name ?: $site->address, 'deleted' => (bool) $site->deleted_at] : null,
            'uploader'    => $uploader ? ['id' => $uploader->id, 'name' => $uploader->name] : null,
        ];
    }

    // 목록 상단 요약 카드
    private static function summary(int $pending): array
    {
        $oldestPending = ContentReport::where('status', 'pending')->min('created_at');

        return [
            'pending'              => $pending,
            'today'                => ContentReport::whereDate('created_at', today())->count(),
            'oldest_pending_hours' => $oldestPending ? (int) floor(now()->diffInMinutes($oldestPending, true) / 60) : null,
            // 지금 숨겨져 있는 공지·사진 수(숨김을 풀면 hidden_at을 비우므로 그대로 셈)
            'hidden_total'         => DB::table('team_notices')->whereNotNull('hidden_at')->count()
                + DB::table('site_files')->whereNotNull('hidden_at')->count(),
        ];
    }

    private static function notFound(): JsonResponse
    {
        return ApiResponse::error('신고를 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
    }
}
