<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ★ v18.72 — 사용자 차단 (Apple 1.2, 앱 내정보 › 차단한 사용자)
 *
 *   한쪽만 적용: 차단한 사람 화면에서만 그 사람의 팀 공지·팀 앨범 사진·팀 활동이 안 보이고 알림·푸시도 안 옴
 *   (거르는 곳은 BlockFilter / User::blockedUserIds() 쓰는 곳). 팀원 목록·일정·정산 같은 업무 기록은 그대로.
 *   차단할 수 있는 사람: 내가 지금 소속된 팀에 있었던 사람(나간 팀원 포함 — 옛 공지도 가릴 수 있게). 운영자·탈퇴 회원은 제외.
 */
class UserBlockController extends Controller
{
    // GET /api/blocks — 내가 차단한 사람(최근 차단 순). 탈퇴한 사람은 목록에서 뺌
    public function index(Request $request)
    {
        $items = DB::table('user_blocks')
            ->join('users', 'users.id', '=', 'user_blocks.blocked_id')
            ->where('user_blocks.blocker_id', $request->user()->id)
            ->whereNull('users.deleted_at')
            ->orderByDesc('user_blocks.created_at')->orderByDesc('user_blocks.id')
            ->get(['users.id', 'users.name', 'users.avatar_color', 'users.avatar_image_path', 'user_blocks.created_at as blocked_at']);

        return ApiResponse::success($items->map(fn($b) => [
            'id'                => (int) $b->id,
            'name'              => $b->name,
            'avatar_color'      => $b->avatar_color,
            'avatar_image_path' => $b->avatar_image_path,
            'blocked_at'        => $b->blocked_at ? Carbon::parse($b->blocked_at)->toIso8601String() : null,
        ])->values(), '차단 목록 조회 성공');
    }

    // POST /api/blocks  { user_id }
    public function store(Request $request)
    {
        $data = $request->validate(['user_id' => 'required|integer|min:1']);
        $me = $request->user();
        $targetId = (int) $data['user_id'];

        if ($targetId === (int) $me->id) {
            return ApiResponse::error('나 자신은 차단할 수 없어요.', ErrorCode::MOD_SELF_NOT_ALLOWED, 422);
        }

        // 내 지금 팀에 있었던 적이 있는 사람만(team_members는 나간 기록도 deleted_at으로 남아 있음 → 조건 없이 찾음)
        $teamIds = $me->teamIds();
        $target = $teamIds
            ? User::whereKey($targetId)
                ->where('user_type', '!=', 'operator')
                ->whereExists(fn($s) => $s->select(DB::raw(1))->from('team_members')
                    ->whereColumn('team_members.user_id', 'users.id')
                    ->whereIn('team_members.team_id', $teamIds))
                ->first(['id', 'name'])
            : null;
        if (!$target) {
            return ApiResponse::error('차단할 사람을 찾을 수 없어요.', ErrorCode::MOD_TARGET_NOT_FOUND, 404);
        }

        DB::table('user_blocks')->insertOrIgnore([
            'blocker_id' => $me->id,
            'blocked_id' => $target->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::success(['user_id' => (int) $target->id, 'blocked' => true], '차단했어요. 이 사람의 공지·사진·활동이 더 이상 보이지 않아요.', 201);
    }

    // DELETE /api/blocks/{userId} — 차단 풀기(차단한 적이 없어도 성공 — 여러 번 눌러도 결과 같음)
    public function destroy(Request $request, string $userId)
    {
        DB::table('user_blocks')
            ->where('blocker_id', $request->user()->id)
            ->where('blocked_id', (int) $userId)
            ->delete();

        return ApiResponse::success(['user_id' => (int) $userId, 'blocked' => false], '차단을 풀었어요.');
    }
}
