<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Inquiry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * ★ v18.43 — 고객 문의 (앱 사용자용, 디자인 INQUIRY_LIST/CREATE/DETAIL). 본인 문의만 보고 쓸 수 있음.
 */
class InquiryController extends Controller
{
    // GET /api/inquiries — 내 문의 목록 (최신순) + 아직 안 읽은 답변 수(내정보 메뉴 "답변 N건")
    public function index(Request $request)
    {
        $items = Inquiry::where('user_id', $request->user()->id)
            ->latest()
            ->get(['id', 'category', 'title', 'status', 'created_at', 'answered_at', 'answer_seen_at']);

        return ApiResponse::success([
            'items'         => $items->map(fn(Inquiry $i) => [
                'id'          => $i->id,
                'category'    => $i->category,
                'title'       => $i->title,
                'status'      => $i->status,
                'created_at'  => $i->created_at?->toIso8601String(),
                'answered_at' => $i->answered_at?->toIso8601String(),
                'unread'      => $i->status === 'answered' && !$i->answer_seen_at,
            ]),
            'unread_answers' => $items->where('status', 'answered')->whereNull('answer_seen_at')->count(),
        ], '문의 목록 조회 성공');
    }

    // GET /api/inquiries/{id} — 답변이 있으면 열어본 것으로 기록
    public function show(Request $request, int $id)
    {
        $inquiry = Inquiry::with('files')->where('user_id', $request->user()->id)->findOrFail($id);

        if ($inquiry->status === 'answered' && !$inquiry->answer_seen_at) {
            $inquiry->update(['answer_seen_at' => now()]);
        }

        return ApiResponse::success([
            'id'          => $inquiry->id,
            'category'    => $inquiry->category,
            'title'       => $inquiry->title,
            'content'     => $inquiry->content,
            'status'      => $inquiry->status,
            'answer'      => $inquiry->answer,
            'helpful'     => $inquiry->helpful,
            'files'       => $inquiry->filePaths(),
            'created_at'  => $inquiry->created_at?->toIso8601String(),
            'answered_at' => $inquiry->answered_at?->toIso8601String(),
        ], '문의 조회 성공');
    }

    // POST /api/inquiries (multipart) — 사진은 photos[] 최대 3장
    public function store(Request $request)
    {
        $data = $request->validate([
            'category'     => ['nullable', Rule::in(Inquiry::CATEGORIES)],
            'title'        => 'required|string|max:100',
            'content'      => 'required|string|max:1000',
            'notify'       => 'nullable|boolean',
            'app_version'  => 'nullable|string|max:20',
            'device'       => 'nullable|string|max:60',
            'push_enabled' => 'nullable|boolean',
            'photos'       => 'nullable|array|max:3',
            'photos.*'     => 'image|mimes:jpeg,png,jpg,webp|max:10240',
        ]);

        $inquiry = DB::transaction(function () use ($request, $data) {
            $inquiry = Inquiry::create([
                'user_id'      => $request->user()->id,
                'category'     => $data['category'] ?? 'etc',
                'title'        => $data['title'],
                'content'      => $data['content'],
                'notify'       => $request->boolean('notify', true),
                'app_version'  => $data['app_version'] ?? null,
                'device'       => $data['device'] ?? null,
                'push_enabled' => $request->has('push_enabled') ? $request->boolean('push_enabled') : null,
            ]);
            foreach ($request->file('photos', []) as $photo) {
                $inquiry->files()->create(['path' => $photo->store('inquiries', 'public')]);
            }

            return $inquiry;
        });

        return ApiResponse::success(['id' => $inquiry->id], '문의가 접수되었습니다.', 201);
    }

    // POST /api/inquiries/{id}/feedback { helpful: true } — "답변이 도움이 되었나요?"
    public function feedback(Request $request, int $id)
    {
        $data = $request->validate(['helpful' => 'required|boolean']);
        $inquiry = Inquiry::where('user_id', $request->user()->id)->where('status', 'answered')->findOrFail($id);
        $inquiry->update(['helpful' => $data['helpful']]);

        return ApiResponse::success(['helpful' => $inquiry->helpful], '의견을 보내주셔서 고마워요.');
    }

    // DELETE /api/inquiries/{id} — 답변 전인 문의만 삭제 가능
    public function destroy(Request $request, int $id)
    {
        $inquiry = Inquiry::with('files')->where('user_id', $request->user()->id)->findOrFail($id);
        if ($inquiry->status === 'answered') {
            return ApiResponse::error('답변이 달린 문의는 삭제할 수 없습니다.', 'ERR_VALID_001', 422);
        }
        foreach ($inquiry->files as $f) {
            Storage::disk('public')->delete($f->path);
        }
        $inquiry->files()->delete();
        $inquiry->delete();

        return ApiResponse::success(null, '문의가 삭제되었습니다.');
    }
}
