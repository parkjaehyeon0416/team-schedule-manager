<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Inquiry;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ★ v18.43 — 운영자 웹 "고객 문의" (디자인 ADMIN_INQUIRY_LIST / ADMIN_INQUIRY_DETAIL)
 *   목록·검색·요약 카드, 상세(회원 정보·이전 문의·첨부·기기 정보), 답변 등록/수정.
 *   답변 시 "회원에게 앱 푸시 알림 보내기"를 켜면 앱 알림 피드 + 휴대폰 푸시.
 */
class AdminInquiryController extends Controller
{
    // GET /api/admin/inquiries?status=pending|answered&category=bug&q=검색어&page=1
    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        $query = Inquiry::query()
            ->with('user:id,name,email')
            ->when(in_array($request->query('status'), ['pending', 'answered'], true),
                fn($w) => $w->where('status', $request->query('status')))
            ->when(in_array($request->query('category'), Inquiry::CATEGORIES, true),
                fn($w) => $w->where('category', $request->query('category')))
            ->when($q !== '', fn($w) => $w->where(fn($x) => $x
                ->where('title', 'like', "%{$q}%")
                ->orWhere('content', 'like', "%{$q}%")
                ->when(preg_match('/^Q-?(\d+)$/i', $q, $m), fn($y) => $y->orWhere('id', (int) $m[1] - 1000))
                ->orWhereHas('user', fn($u) => $u->where('name', 'like', "%{$q}%")->orWhere('email', 'like', "%{$q}%"))))
            ->latest();

        $page = $query->paginate(20);

        return ApiResponse::success([
            'items'   => collect($page->items())->map(fn(Inquiry $i) => self::row($i)),
            'total'   => $page->total(),
            'page'    => $page->currentPage(),
            'pages'   => $page->lastPage(),
            'counts'  => [
                'all'      => Inquiry::count(),
                'pending'  => Inquiry::where('status', 'pending')->count(),
                'answered' => Inquiry::where('status', 'answered')->count(),
            ],
            'summary' => self::summary(),
        ], '문의 목록 조회 성공');
    }

    // GET /api/admin/inquiries/{id}
    public function show(int $id)
    {
        $inquiry = Inquiry::with(['user', 'files'])->findOrFail($id);
        $user = $inquiry->user;

        $team = $user ? DB::table('team_members')
            ->join('teams', 'teams.id', '=', 'team_members.team_id')
            ->where('team_members.user_id', $user->id)
            ->whereNull('team_members.deleted_at')
            ->orderByRaw('teams.id = ? desc', [$user->team_id])
            ->first(['teams.name', 'team_members.role_id']) : null;

        $previous = Inquiry::where('user_id', $inquiry->user_id)->where('id', '!=', $inquiry->id)->latest()->get();

        return ApiResponse::success(self::row($inquiry) + [
            'content'      => $inquiry->content,
            'answer'       => $inquiry->answer,
            'notify'       => $inquiry->notify,
            'helpful'      => $inquiry->helpful,
            'files'        => $inquiry->filePaths(),
            'app_version'  => $inquiry->app_version,
            'device'       => $inquiry->device,
            'push_enabled' => $inquiry->push_enabled,
            'member'       => $user ? [
                'id'        => $user->id,
                'name'      => $user->name,
                'email'     => AdminDashboardController::maskEmail($user->email),
                'phone'     => $user->phone,
                'joined_at' => $user->created_at?->toIso8601String(),
                'team'      => $team ? $team->name . ($team->role_id <= 2 ? ' (팀장)' : ' (팀원)') : null,
                'region'    => DB::table('business_cards')->where('user_id', $user->id)->value('service_area'),
            ] : null,
            'previous'     => $previous->take(5)->map(fn(Inquiry $p) => [
                'id'         => $p->id,
                'title'      => $p->title,
                'status'     => $p->status,
                'created_at' => $p->created_at?->toIso8601String(),
            ])->values(),
            'previous_count' => $previous->count(),
        ], '문의 조회 성공');
    }

    // POST /api/admin/inquiries/{id}/answer  { answer, notify? }
    public function answer(Request $request, int $id)
    {
        $data = $request->validate([
            'answer' => 'required|string|max:2000',
            'notify' => 'nullable|boolean',
        ]);
        $inquiry = Inquiry::findOrFail($id);
        $isFirstAnswer = $inquiry->status !== 'answered';

        $inquiry->update([
            'answer'         => $data['answer'],
            'status'         => 'answered',
            'answered_by'    => $request->user()->id,
            'answered_at'    => $isFirstAnswer ? now() : $inquiry->answered_at,
            'answer_seen_at' => null, // 답변이 바뀌면 다시 "새 답변"
        ]);

        // 알림: 처음 답변이고, 운영자가 알림 보내기를 켰고, 회원이 알림 받기를 원했을 때
        $notified = false;
        if ($isFirstAnswer && $request->boolean('notify', true) && $inquiry->notify) {
            Notification::create([
                'user_id'   => $inquiry->user_id,
                'category'  => 'inquiry',
                'title'     => '문의 답변 도착',
                'body'      => "\"{$inquiry->title}\" 문의에 답변이 등록되었어요.",
                'link_type' => 'inquiry',
                'link_id'   => $inquiry->id,
            ]);
            $notified = true;
        }

        return ApiResponse::success(self::row($inquiry->fresh('user')) + [
            'answer'   => $inquiry->answer,
            'notified' => $notified,
        ], '답변이 등록되었습니다.');
    }

    private static function row(Inquiry $i): array
    {
        return [
            'id'          => $i->id,
            'no'          => $i->number,
            'category'    => $i->category,
            'title'       => $i->title,
            'status'      => $i->status,
            'user'        => $i->user ? ['id' => $i->user->id, 'name' => $i->user->name] : null,
            'created_at'  => $i->created_at?->toIso8601String(),
            'answered_at' => $i->answered_at?->toIso8601String(),
        ];
    }

    // 목록 상단 요약 카드
    private static function summary(): array
    {
        $oldestPending = Inquiry::where('status', 'pending')->min('created_at');
        $weekStart = now()->startOfWeek();
        $answeredThisWeek = Inquiry::where('status', 'answered')->where('answered_at', '>=', $weekStart)->get(['created_at', 'answered_at']);
        $avgMinutes = $answeredThisWeek->isEmpty() ? null
            : (int) round($answeredThisWeek->avg(fn($i) => $i->created_at->diffInMinutes($i->answered_at)));

        $monthByCategory = Inquiry::where('created_at', '>=', now()->startOfMonth())
            ->selectRaw('category, COUNT(*) c')->groupBy('category')->pluck('c', 'category');

        return [
            'pending'                => Inquiry::where('status', 'pending')->count(),
            'oldest_pending_hours'   => $oldestPending ? (int) floor(now()->diffInMinutes($oldestPending, true) / 60) : null,
            'today'                  => Inquiry::whereDate('created_at', today())->count(),
            'answered_week'          => $answeredThisWeek->count(),
            'avg_first_answer_minutes' => $avgMinutes,
            'month'                  => (int) $monthByCategory->sum(),
            'month_by_category'      => $monthByCategory,
        ];
    }
}
