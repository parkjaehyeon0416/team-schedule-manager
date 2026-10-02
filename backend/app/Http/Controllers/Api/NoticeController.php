<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Notice;
use Illuminate\Http\Request;

/**
 * ★ DESIGN-CANVAS(NOTICE_LIST/NOTICE_DETAIL/EVENT_DETAIL) — 공지사항·이벤트 조회 (앱은 읽기 전용)
 * 등록은 아직 관리자 화면이 없어 서버에서 직접 넣음.
 */
class NoticeController extends Controller
{
    // GET /api/notices?type=notice|event
    public function index(Request $request)
    {
        $query = Notice::published()
            ->when($request->query('type'), fn($q, $type) => $q->where('type', $type))
            ->orderByDesc('is_pinned')
            ->orderByDesc('published_at');

        $items = $query->limit(100)->get(['id', 'type', 'title', 'summary', 'banner_path', 'is_pinned', 'starts_at', 'ends_at', 'published_at']);

        return ApiResponse::success($items, '공지 목록 조회 성공');
    }

    // GET /api/notices/latest — 홈 화면 공지 띠용 최신 공지 1건
    public function latest()
    {
        $notice = Notice::published()
            ->where('type', 'notice')
            ->orderByDesc('is_pinned')
            ->orderByDesc('published_at')
            ->first(['id', 'type', 'title', 'is_pinned', 'published_at']);

        return ApiResponse::success($notice, '최신 공지 조회 성공');
    }

    // ★ v18.36 — GET /api/notices/latest-event — 홈 이벤트 배너용. 진행중(시작했고 안 끝난) 이벤트 중 최신 1건
    public function latestEvent()
    {
        $today = now()->toDateString();

        $event = Notice::published()
            ->where('type', 'event')
            ->where(fn($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', $today))
            ->where(fn($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', $today))
            ->orderByDesc('is_pinned')
            ->orderByDesc('published_at')
            ->first(['id', 'type', 'title', 'summary', 'banner_path', 'starts_at', 'ends_at', 'published_at']);

        return ApiResponse::success($event, '진행중 이벤트 조회 성공');
    }

    // GET /api/notices/{id} — 공지는 같은 종류 안에서 이전/다음 글 포함
    public function show(string $id)
    {
        $notice = Notice::published()->find($id);
        if (!$notice) {
            return ApiResponse::error('공지를 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
        }

        $base = Notice::published()->where('type', $notice->type);
        $prev = (clone $base)->where('published_at', '<', $notice->published_at)
            ->orderByDesc('published_at')->first(['id', 'title']);
        $next = (clone $base)->where('published_at', '>', $notice->published_at)
            ->orderBy('published_at')->first(['id', 'title']);

        return ApiResponse::success([
            ...$notice->toArray(),
            'prev' => $prev,
            'next' => $next,
        ], '공지 조회 성공');
    }
}
