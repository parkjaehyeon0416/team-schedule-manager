<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Notification;
use Illuminate\Http\Request;

/**
 * ★ DESIGN-CANVAS(NOTIFICATIONS) 추가 — 2026-10-02
 * 팀 일정 추가/팀 참여/견적 승인 시 적재되는 알림 피드 조회·읽음처리.
 * 알림 생성 자체는 이 컨트롤러가 아니라 이벤트가 발생하는 지점
 * (ScheduleController::store, TeamController::join, QuoteController::updateStatus)에서
 * Notification::create()로 직접 적재함 — 트리거가 적어 별도 서비스 클래스 없이 인라인 처리.
 */
class NotificationController extends Controller
{
    // GET /api/notifications?category=schedule|team|quote|tax
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Notification::where('user_id', $user->id)->orderByDesc('id');

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        $list = $query->limit(50)->get();
        $unreadCount = Notification::where('user_id', $user->id)->where('is_read', false)->count();

        return ApiResponse::success([
            'items'        => $list,
            'unread_count' => $unreadCount,
        ], '알림 조회 성공');
    }

    // PATCH /api/notifications/{id}/read
    public function markRead(Request $request, string $id)
    {
        $notification = Notification::where('user_id', $request->user()->id)->find($id);
        if (!$notification) {
            return ApiResponse::error('알림을 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
        }
        $notification->update(['is_read' => true]);

        return ApiResponse::success($notification, '읽음 처리되었습니다.');
    }

    // PATCH /api/notifications/read-all
    public function markAllRead(Request $request)
    {
        Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return ApiResponse::success(null, '모든 알림을 읽음 처리했습니다.');
    }
}
