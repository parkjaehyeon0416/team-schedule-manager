<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Notification;
use App\Models\Team;
use App\Models\TeamNotice;
use App\Services\PlanService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ★ v18.47 — 팀 공지 (팀 요금제)
 *   팀원은 누구나 읽기, 팀장·부팀장이 작성(팀원 전체에게 앱 알림 + 휴대폰 푸시), 고정 공지는 맨 위.
 */
class TeamNoticeController extends Controller
{
    // GET /teams/{id}/notices
    public function index(Request $request, string $id)
    {
        $team = $this->memberTeam($request, $id);
        if (!$team) {
            return ApiResponse::error('존재하지 않는 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }
        $user = $request->user();

        $notices = TeamNotice::with('author:id,name,avatar_color,avatar_image_path')
            ->where('team_id', $team->id)
            ->orderByDesc('pinned')->latest()->orderByDesc('id')
            ->limit(100)->get();

        return ApiResponse::success([
            'can_write' => $user->canAssignIn($team->id) && PlanService::teamCan($team->id, 'team_notice'),
            'items'     => $notices->map(fn(TeamNotice $n) => $this->row($n, $user, $team->id)),
        ], '팀 공지 조회 성공');
    }

    // POST /teams/{id}/notices  { body, pinned? }
    public function store(Request $request, string $id)
    {
        $team = $this->memberTeam($request, $id);
        $user = $request->user();
        if (!$team || !$user->canAssignIn($team->id)) {
            return ApiResponse::error('팀장·부팀장만 공지를 쓸 수 있어요.', 'ERR_AUTH_002', 403);
        }
        if (!PlanService::teamCan($team->id, 'team_notice')) {
            return ApiResponse::error(PlanService::upgradeMessage('team_notice'), 'ERR_PLAN_001', 403);
        }
        $data = $request->validate([
            'body'   => 'required|string|max:1000',
            'pinned' => 'nullable|boolean',
        ]);

        $notice = TeamNotice::create([
            'team_id' => $team->id,
            'user_id' => $user->id,
            'body'    => trim($data['body']),
            'pinned'  => (bool) ($data['pinned'] ?? false),
        ]);

        // 작성자를 뺀 팀원 전체에게 알림(카테고리 team → 휴대폰 푸시)
        $memberIds = DB::table('team_members')->where('team_id', $team->id)
            ->where('user_id', '!=', $user->id)->whereNull('deleted_at')->pluck('user_id');
        $preview = mb_strimwidth(preg_replace('/\s+/u', ' ', $notice->body), 0, 60, '…');
        foreach ($memberIds as $memberId) {
            Notification::create([
                'user_id'   => $memberId,
                'category'  => 'team',
                'title'     => "{$team->name} 공지",
                'body'      => $preview,
                'link_type' => 'team_notice',
                'link_id'   => $team->id,
            ]);
        }

        $notice->load('author:id,name,avatar_color,avatar_image_path');
        return ApiResponse::success($this->row($notice, $user, $team->id) + ['notified' => $memberIds->count()], '공지를 올렸어요.', 201);
    }

    // PATCH /teams/{id}/notices/{noticeId}/pin
    public function togglePin(Request $request, string $id, string $noticeId)
    {
        $team = $this->memberTeam($request, $id);
        if (!$team || !$request->user()->canAssignIn($team->id)) {
            return ApiResponse::error('권한이 없습니다.', 'ERR_AUTH_002', 403);
        }
        $notice = TeamNotice::where('team_id', $team->id)->find($noticeId);
        if (!$notice) {
            return ApiResponse::error('공지를 찾을 수 없어요.', 'ERR_NOT_FOUND', 404);
        }
        $notice->update(['pinned' => !$notice->pinned]);

        return ApiResponse::success(['id' => $notice->id, 'pinned' => $notice->pinned], $notice->pinned ? '맨 위에 고정했어요.' : '고정을 풀었어요.');
    }

    // DELETE /teams/{id}/notices/{noticeId} — 작성자 본인 또는 팀장
    public function destroy(Request $request, string $id, string $noticeId)
    {
        $team = $this->memberTeam($request, $id);
        $user = $request->user();
        $notice = $team ? TeamNotice::where('team_id', $team->id)->find($noticeId) : null;
        if (!$notice) {
            return ApiResponse::error('공지를 찾을 수 없어요.', 'ERR_NOT_FOUND', 404);
        }
        if ($notice->user_id !== $user->id && !$user->isLeaderOf($team->id)) {
            return ApiResponse::error('작성자나 팀장만 지울 수 있어요.', 'ERR_AUTH_002', 403);
        }
        $notice->delete();

        return ApiResponse::success(null, '공지를 지웠어요.');
    }

    private function row(TeamNotice $n, $user, int $teamId): array
    {
        return [
            'id'         => $n->id,
            'body'       => $n->body,
            'pinned'     => (bool) $n->pinned,
            'author'     => $n->author ? [
                'id' => $n->author->id, 'name' => $n->author->name,
                'avatar_color' => $n->author->avatar_color, 'avatar_image_path' => $n->author->avatar_image_path,
            ] : null,
            'can_delete' => $n->user_id === $user->id || $user->isLeaderOf($teamId),
            'created_at' => $n->created_at?->toIso8601String(),
        ];
    }

    private function memberTeam(Request $request, string $id): ?Team
    {
        $user = $request->user();
        return Team::when($user->role_id !== 1, fn($q) => $q->whereIn('id', $user->teamIds()))->find($id);
    }
}
