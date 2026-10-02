<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Notice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * ★ v18.40 — 웹 관리자(운영자)용 공지·이벤트 관리
 * 앱용 NoticeController는 게시된 것만 보여주고, 여기서는 임시저장(미게시)까지 전부 다룬다.
 *
 * 입력 형식(웹 폼 기준):
 *   body      : 빈 줄로 문단 구분, "- "로 시작하는 줄은 목록
 *   info      : [{label, value}]  (정보표 — 공지: 점검 일시 등 / 이벤트: 대상·혜택·발표)
 *   steps     : [{title, desc}]   (이벤트 참여 방법)
 *   cautions  : [string]          (이벤트 유의사항)
 *   published : true면 지금 게시, false면 임시저장 (published_at으로 저장)
 *   banner    : 이미지 파일(선택, 이벤트 배너) / remove_banner=true면 삭제
 */
class AdminNoticeController extends Controller
{
    // GET /api/admin/notices?type=notice|event
    public function index(Request $request)
    {
        $notices = Notice::query()
            ->when($request->query('type'), fn($q, $type) => $q->where('type', $type))
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($notices, '공지·이벤트 목록 조회 성공');
    }

    // POST /api/admin/notices
    public function store(Request $request)
    {
        $data = $this->validated($request);
        $notice = Notice::create($data);

        return ApiResponse::success($notice, '등록되었습니다.', 201);
    }

    // POST /api/admin/notices/{id}  (파일 업로드 때문에 PUT 대신 POST)
    public function update(Request $request, string $id)
    {
        $notice = Notice::find($id);
        if (!$notice) {
            return ApiResponse::error('공지를 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
        }

        $data = $this->validated($request, $notice);
        $notice->update($data);

        return ApiResponse::success($notice->fresh(), '수정되었습니다.');
    }

    // ★ v18.41 — GET /api/admin/notices/{id} (수정 화면 진입용)
    public function show(string $id)
    {
        $notice = Notice::find($id);
        if (!$notice) {
            return ApiResponse::error('공지를 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
        }

        return ApiResponse::success($notice, '조회 성공');
    }

    // ★ v18.41 — PATCH /api/admin/notices/{id}/pin  목록에서 바로 "중요 고정" 켜고 끄기
    public function togglePin(string $id)
    {
        $notice = Notice::find($id);
        if (!$notice) {
            return ApiResponse::error('공지를 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
        }

        $notice->is_pinned = !$notice->is_pinned;
        $notice->save();

        return ApiResponse::success($notice, $notice->is_pinned ? '중요 공지로 고정했어요.' : '고정을 해제했어요.');
    }

    // DELETE /api/admin/notices/{id}
    public function destroy(string $id)
    {
        $notice = Notice::find($id);
        if (!$notice) {
            return ApiResponse::error('공지를 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
        }

        $notice->delete();

        return ApiResponse::success(null, '삭제되었습니다.');
    }

    private function validated(Request $request, ?Notice $existing = null): array
    {
        // 웹 폼(multipart)에서 배열 항목은 JSON 문자열로 들어오므로 먼저 풀어줌
        foreach (['info', 'steps', 'cautions'] as $key) {
            if (is_string($request->input($key))) {
                $request->merge([$key => json_decode($request->input($key), true) ?? []]);
            }
        }

        $v = $request->validate([
            'type'             => 'required|in:notice,event',
            'title'            => 'required|string|max:150',
            'summary'          => 'nullable|string|max:255',
            'body'             => 'nullable|string',
            'info'             => 'nullable|array',
            'info.*.label'     => 'required|string|max:30',
            'info.*.value'     => 'required|string|max:200',
            'steps'            => 'nullable|array',
            'steps.*.title'    => 'required|string|max:100',
            'steps.*.desc'     => 'nullable|string|max:200',
            'cautions'         => 'nullable|array',
            'cautions.*'       => 'string|max:200',
            'cta_label'        => 'nullable|string|max:50',
            'cta_route'        => 'nullable|string|max:50',
            'is_pinned'        => 'nullable|boolean',
            'starts_at'        => 'nullable|date',
            'ends_at'          => 'nullable|date|after_or_equal:starts_at',
            'published'        => 'nullable|boolean',
            'banner'           => 'nullable|image|max:5120',
            'remove_banner'    => 'nullable|boolean',
        ]);

        $data = collect($v)->except(['published', 'banner', 'remove_banner'])->all();
        $data['is_pinned'] = $request->boolean('is_pinned');

        // 게시 상태: 처음 게시할 때만 게시 시각을 찍고, 이미 게시된 글은 시각 유지
        if ($request->boolean('published')) {
            $data['published_at'] = $existing?->published_at ?? now();
        } else {
            $data['published_at'] = null;
        }

        if ($request->hasFile('banner')) {
            if ($existing?->banner_path) {
                Storage::disk('public')->delete($existing->banner_path);
            }
            $data['banner_path'] = $request->file('banner')->store('notice-banners', 'public');
        } elseif ($request->boolean('remove_banner') && $existing?->banner_path) {
            Storage::disk('public')->delete($existing->banner_path);
            $data['banner_path'] = null;
        }

        return $data;
    }
}
