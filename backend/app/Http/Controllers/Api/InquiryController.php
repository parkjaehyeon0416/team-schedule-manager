<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Inquiry;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * ★ v18.43 — 고객 문의 (앱 사용자용). 본인 문의만 보고 쓸 수 있음.
 */
class InquiryController extends Controller
{
    // GET /api/inquiries — 내 문의 목록 (최신순)
    public function index(Request $request)
    {
        $items = Inquiry::where('user_id', $request->user()->id)
            ->latest()
            ->get(['id', 'category', 'title', 'status', 'created_at', 'answered_at']);

        return ApiResponse::success($items, '문의 목록 조회 성공');
    }

    // GET /api/inquiries/{id}
    public function show(Request $request, int $id)
    {
        $inquiry = Inquiry::where('user_id', $request->user()->id)->findOrFail($id);

        return ApiResponse::success($inquiry->only([
            'id', 'category', 'title', 'content', 'status', 'answer', 'created_at', 'answered_at',
        ]), '문의 조회 성공');
    }

    // POST /api/inquiries
    public function store(Request $request)
    {
        $data = $request->validate([
            'category' => ['nullable', Rule::in(Inquiry::CATEGORIES)],
            'title'    => 'required|string|max:100',
            'content'  => 'required|string|max:5000',
        ]);

        $inquiry = Inquiry::create([
            'user_id'  => $request->user()->id,
            'category' => $data['category'] ?? 'etc',
            'title'    => $data['title'],
            'content'  => $data['content'],
        ]);

        return ApiResponse::success($inquiry, '문의가 접수되었습니다.', 201);
    }

    // DELETE /api/inquiries/{id} — 답변 전인 문의만 삭제 가능
    public function destroy(Request $request, int $id)
    {
        $inquiry = Inquiry::where('user_id', $request->user()->id)->findOrFail($id);
        if ($inquiry->status === 'answered') {
            return ApiResponse::error('답변이 달린 문의는 삭제할 수 없습니다.', 'ERR_VALID_001', 422);
        }
        $inquiry->delete();

        return ApiResponse::success(null, '문의가 삭제되었습니다.');
    }
}
