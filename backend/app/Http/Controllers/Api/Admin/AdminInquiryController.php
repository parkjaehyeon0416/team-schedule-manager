<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Inquiry;
use App\Models\Notification;
use Illuminate\Http\Request;

/**
 * ★ v18.43 — 운영자 웹 "고객 문의": 목록·검색, 상세, 답변 등록/수정.
 *   답변을 달면 사용자 앱 알림 피드에 쌓이고 휴대폰 푸시도 감(Notification 모델이 처리).
 */
class AdminInquiryController extends Controller
{
    // GET /api/admin/inquiries?status=pending|answered&q=검색어&page=1
    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        $query = Inquiry::query()
            ->with('user:id,name,email,phone')
            ->when(in_array($request->query('status'), ['pending', 'answered'], true),
                fn($w) => $w->where('status', $request->query('status')))
            ->when($request->query('category'), fn($w, $c) => $w->where('category', $c))
            ->when($q !== '', fn($w) => $w->where(fn($x) => $x
                ->where('title', 'like', "%{$q}%")
                ->orWhere('content', 'like', "%{$q}%")
                ->orWhereHas('user', fn($u) => $u->where('name', 'like', "%{$q}%")->orWhere('email', 'like', "%{$q}%"))))
            ->latest();

        $page = $query->paginate(20);

        return ApiResponse::success([
            'items'  => collect($page->items())->map(fn(Inquiry $i) => self::row($i)),
            'total'  => $page->total(),
            'page'   => $page->currentPage(),
            'pages'  => $page->lastPage(),
            'counts' => [
                'all'      => Inquiry::count(),
                'pending'  => Inquiry::where('status', 'pending')->count(),
                'answered' => Inquiry::where('status', 'answered')->count(),
            ],
        ], '문의 목록 조회 성공');
    }

    // GET /api/admin/inquiries/{id}
    public function show(int $id)
    {
        $inquiry = Inquiry::with('user:id,name,email,phone,created_at')->findOrFail($id);

        return ApiResponse::success(self::row($inquiry) + [
            'content'     => $inquiry->content,
            'answer'      => $inquiry->answer,
            'user_joined' => $inquiry->user?->created_at?->toIso8601String(),
        ], '문의 조회 성공');
    }

    // POST /api/admin/inquiries/{id}/answer  { answer }
    public function answer(Request $request, int $id)
    {
        $data = $request->validate(['answer' => 'required|string|max:5000']);
        $inquiry = Inquiry::findOrFail($id);
        $isFirstAnswer = $inquiry->status !== 'answered';

        $inquiry->update([
            'answer'      => $data['answer'],
            'status'      => 'answered',
            'answered_by' => $request->user()->id,
            'answered_at' => now(),
        ]);

        // 처음 답변할 때만 알림 (답변 수정 때마다 알림이 가면 귀찮음)
        if ($isFirstAnswer) {
            Notification::create([
                'user_id'   => $inquiry->user_id,
                'category'  => 'inquiry',
                'title'     => '문의 답변 도착',
                'body'      => "\"{$inquiry->title}\" 문의에 답변이 등록되었어요.",
                'link_type' => 'inquiry',
                'link_id'   => $inquiry->id,
            ]);
        }

        return ApiResponse::success(self::row($inquiry->fresh('user')), '답변이 등록되었습니다.');
    }

    private static function row(Inquiry $i): array
    {
        return [
            'id'          => $i->id,
            'category'    => $i->category,
            'title'       => $i->title,
            'status'      => $i->status,
            'user'        => $i->user ? ['id' => $i->user->id, 'name' => $i->user->name, 'email' => $i->user->email, 'phone' => $i->user->phone] : null,
            'created_at'  => $i->created_at?->toIso8601String(),
            'answered_at' => $i->answered_at?->toIso8601String(),
        ];
    }
}
