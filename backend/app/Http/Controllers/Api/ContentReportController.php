<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Mail\ContentReportMail;
use App\Models\ContentReport;
use App\Models\TeamNotice;
use App\Models\User;
use App\Services\ModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

/**
 * ★ v18.72 — 콘텐츠 신고 (Apple 1.2, 앱 사용자용). 운영자 웹 "신고 관리"(AdminReportController)에서 24시간 안에 확인.
 *
 *   - 신고 대상: 팀 공지(team_notice) / 팀 앨범 사진(photo) / 팀원(user)
 *   - 지금 소속된 팀의 것만 신고 가능(남의 팀 id를 넣어 보는 IDOR 방지) — 못 찾으면 404 ERR_MOD_002
 *   - 신고 시점 내용을 snapshot에 남김(작성자가 먼저 지워도 운영자가 확인 가능). 사진은 증거 사본도 비공개 디스크에
 *   - 같은 대상을 이미 신고해 처리 대기 중이면 새로 만들지 않고 그 신고를 돌려줌(여러 번 눌러도 결과 같음)
 *   - 사용자별 하루 30건까지, block=true면 신고하면서 그 사람을 바로 차단
 *   - 운영자에게 새 신고 메일(응답을 보낸 뒤 — 메일이 실패해도 신고는 성공)
 */
class ContentReportController extends Controller
{
    private const DAILY_MAX = 30; // 사용자당 하루 신고 건수

    // POST /api/content-reports  { target_type, target_id, team_id?(팀원 신고 때 필수), reason, detail?, block? }
    public function store(Request $request)
    {
        $data = $request->validate([
            'target_type' => ['required', Rule::in(ContentReport::TARGETS)],
            'target_id'   => 'required|integer|min:1',
            'team_id'     => 'required_if:target_type,user|nullable|integer|min:1',
            'reason'      => ['required', Rule::in(array_keys(ContentReport::REASONS))],
            'detail'      => 'nullable|string|max:500',
            'block'       => 'nullable|boolean',
        ]);
        $user = $request->user();

        $target = $this->resolveTarget($user, $data['target_type'], (int) $data['target_id'], isset($data['team_id']) ? (int) $data['team_id'] : null);
        if (!$target) {
            return ApiResponse::error('신고할 내용을 찾을 수 없어요. 이미 지워졌거나 볼 수 없는 내용이에요.', ErrorCode::MOD_TARGET_NOT_FOUND, 404);
        }
        if ($target['user_id'] === (int) $user->id) {
            return ApiResponse::error('내가 올린 글·사진이나 나 자신은 신고할 수 없어요.', ErrorCode::MOD_SELF_NOT_ALLOWED, 422);
        }
        $wantBlock = $request->boolean('block');

        // 같은 대상을 이미 신고해 처리 대기 중 → 그 신고를 그대로 돌려줌(하루 건수에도 안 셈)
        $existing = ContentReport::where('reporter_id', $user->id)
            ->where('target_type', $data['target_type'])->where('target_id', $target['id'])
            ->where('status', 'pending')->first();
        if ($existing) {
            $blocked = $wantBlock && $this->block($user, $target['user_id']);
            return ApiResponse::success(
                ['id' => $existing->id, 'no' => $existing->number, 'blocked' => $blocked],
                $blocked ? '이미 접수된 신고예요. 차단도 했어요.' : '이미 접수된 신고예요. 운영자가 24시간 안에 확인할게요.',
            );
        }

        if ($fail = $this->dailyLimit((int) $user->id)) {
            return $fail;
        }

        $detail = isset($data['detail']) ? trim($data['detail']) : '';
        $report = ContentReport::create([
            'reporter_id'    => $user->id,
            'target_type'    => $data['target_type'],
            'target_id'      => $target['id'],
            'target_user_id' => $target['user_id'],
            'team_id'        => $target['team_id'],
            'reason'         => $data['reason'],
            'detail'         => $detail !== '' ? $detail : null,
            'snapshot'       => $target['snapshot'],
            'status'         => 'pending',
        ]);
        ModerationService::copyEvidence($report);

        $blocked = $wantBlock && $this->block($user, $target['user_id']);
        self::notifyOperator((int) $report->id);

        return ApiResponse::success(
            ['id' => $report->id, 'no' => $report->number, 'blocked' => $blocked],
            $blocked ? '신고를 접수하고 차단했어요. 운영자가 24시간 안에 확인할게요.' : '신고를 접수했어요. 운영자가 24시간 안에 확인할게요.',
            201,
        );
    }

    /**
     * 신고 대상 확인 — 지금 소속된 팀 안에서만 찾음.
     *   반환 ['id', 'user_id'(작성자·올린 사람·팀원, 없으면 null), 'team_id', 'snapshot'] | null
     */
    private function resolveTarget(User $me, string $type, int $id, ?int $teamId): ?array
    {
        $teamIds = $me->teamIds();
        if (!$teamIds) {
            return null;
        }

        return match ($type) {
            'team_notice' => $this->noticeTarget($teamIds, $id),
            'photo'       => $this->photoTarget($teamIds, $id),
            'user'        => $this->userTarget($me, $id, $teamId),
            default       => null,
        };
    }

    private function noticeTarget(array $teamIds, int $id): ?array
    {
        // 작성자가 탈퇴했어도 이름은 남김(탈퇴 회원 이름은 팀 기록에 계속 보이는 정책)
        $n = TeamNotice::with(['author' => fn($q) => $q->withTrashed()->select('id', 'name')])
            ->whereIn('team_id', $teamIds)->find($id);
        if (!$n) {
            return null;
        }

        return [
            'id'       => (int) $n->id,
            'user_id'  => (int) $n->user_id,
            'team_id'  => (int) $n->team_id,
            'snapshot' => [
                'body'        => $n->body,
                'pinned'      => (bool) $n->pinned,
                'author_id'   => (int) $n->user_id,
                'author_name' => $n->author?->name,
                'team_name'   => DB::table('teams')->where('id', $n->team_id)->value('name'),
                'created_at'  => $n->created_at?->toIso8601String(),
            ],
        ];
    }

    private function photoTarget(array $teamIds, int $id): ?array
    {
        $p = DB::table('site_files')
            ->join('sites', 'sites.id', '=', 'site_files.site_id')
            ->leftJoin('users', 'users.id', '=', 'site_files.uploaded_by')
            ->leftJoin('teams', 'teams.id', '=', 'sites.team_id')
            ->whereIn('sites.team_id', $teamIds)
            ->whereNull('sites.deleted_at')
            ->whereNull('site_files.deleted_at')
            ->where('site_files.file_type', 'photo')
            ->where('site_files.id', $id)
            ->first([
                'site_files.id', 'site_files.file_path', 'site_files.photo_category', 'site_files.description',
                'site_files.uploaded_by', 'site_files.created_at', 'sites.id as site_id', 'sites.team_id',
                'sites.apt_name', 'sites.address', 'users.name as uploader_name', 'teams.name as team_name',
            ]);
        if (!$p) {
            return null;
        }

        return [
            'id'       => (int) $p->id,
            'user_id'  => $p->uploaded_by ? (int) $p->uploaded_by : null,
            'team_id'  => (int) $p->team_id,
            'snapshot' => [
                'file_path'     => $p->file_path,
                'category'      => $p->photo_category,
                'description'   => $p->description,
                'site_id'       => (int) $p->site_id,
                'site_name'     => $p->apt_name ?: $p->address,
                'uploader_id'   => $p->uploaded_by ? (int) $p->uploaded_by : null,
                'uploader_name' => $p->uploader_name,
                'team_name'     => $p->team_name,
                'created_at'    => $p->created_at ? \Carbon\Carbon::parse($p->created_at)->toIso8601String() : null,
            ],
        ];
    }

    /**
     * 팀원 신고 — 내가 지금 소속된 팀(team_id를 주면 그 팀)에 있었던 사람. 나간 팀원도 신고 가능, 탈퇴·운영자는 제외.
     */
    private function userTarget(User $me, int $id, ?int $teamId): ?array
    {
        $row = DB::table('team_members as mine')
            ->join('team_members as them', 'them.team_id', '=', 'mine.team_id')
            ->join('users', 'users.id', '=', 'them.user_id')
            ->join('teams', 'teams.id', '=', 'mine.team_id')
            ->where('mine.user_id', $me->id)->whereNull('mine.deleted_at')
            ->where('them.user_id', $id)
            ->whereNull('users.deleted_at')
            ->where('users.user_type', '!=', 'operator')
            ->whereNull('teams.deleted_at')
            ->when($teamId, fn($q, $v) => $q->where('mine.team_id', $v))
            ->orderByRaw('them.deleted_at IS NULL DESC') // 지금 같이 있는 팀을 먼저
            ->first(['users.id', 'users.name', 'teams.id as team_id', 'teams.name as team_name']);
        if (!$row) {
            return null;
        }

        return [
            'id'       => (int) $row->id,
            'user_id'  => (int) $row->id,
            'team_id'  => (int) $row->team_id,
            'snapshot' => ['name' => $row->name, 'team_name' => $row->team_name],
        ];
    }

    /** 신고하면서 바로 차단(block=true) — 탈퇴·운영자·없는 사람이면 건너뜀. 차단돼 있으면 true */
    private function block(User $me, ?int $targetUserId): bool
    {
        if (!$targetUserId || $targetUserId === (int) $me->id) {
            return false;
        }
        if (!User::whereKey($targetUserId)->where('user_type', '!=', 'operator')->exists()) {
            return false;
        }
        DB::table('user_blocks')->insertOrIgnore([
            'blocker_id' => $me->id,
            'blocked_id' => $targetUserId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return true;
    }

    /** 하루 신고 건수 상한(UploadGuard::dailyLimit과 같은 방식 — DB 캐시는 없는 키를 increment 못 해서 add 먼저) */
    private function dailyLimit(int $userId): ?JsonResponse
    {
        $key = "content_report_daily:{$userId}:" . now()->format('Ymd');
        Cache::add($key, 0, now()->endOfDay());
        if ((int) Cache::increment($key) > self::DAILY_MAX) {
            Cache::decrement($key);
            return ApiResponse::error('오늘은 신고를 더 보낼 수 없어요(하루 ' . self::DAILY_MAX . '건까지). 급한 내용은 고객 문의로 알려주세요.', ErrorCode::TOO_MANY_REQUESTS, 429);
        }

        return null;
    }

    /** 운영자에게 새 신고 메일 — 응답을 보낸 뒤 발송, 실패해도 기록만(신고 요청은 이미 성공) */
    private static function notifyOperator(int $reportId): void
    {
        $to = config('workmate.support_email');
        if (!$to) {
            return;
        }
        dispatch(function () use ($reportId, $to) {
            try {
                $report = ContentReport::with('team:id,name')->find($reportId);
                if ($report) {
                    Mail::to($to)->send(new ContentReportMail($report));
                }
            } catch (\Throwable $e) {
                Log::warning('신고 알림 메일 발송 실패', ['report_id' => $reportId, 'error' => $e->getMessage()]);
            }
        })->afterResponse();
    }
}
