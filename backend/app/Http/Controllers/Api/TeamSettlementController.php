<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Team;
use App\Models\TeamSettlement;
use App\Services\PlanService;
use App\Services\XlsxBuilder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;

/**
 * ★ v18.47 — 팀원 정산표 (팀 요금제, 팀장만)
 *   그 달 팀 일정에 배정된 기록으로 팀원별 근무일·공수·금액(일당×공수)을 계산하고,
 *   팀장이 "지급 완료"를 체크해 둘 수 있음. 엑셀로 내보내기(서명 링크).
 *   금액 계산은 개인 "내 수입"(MonthlySummaryService)과 같은 방식: 일정 단가 × 공수.
 */
class TeamSettlementController extends Controller
{
    // GET /teams/{id}/settlements?month=2026-10
    public function index(Request $request, string $id)
    {
        [$team, $err] = $this->authorizeTeam($request, $id);
        if ($err) {
            return $err;
        }
        $month = $this->month($request->query('month'));

        return ApiResponse::success($this->build($team, $month), '팀원 정산표 조회 성공');
    }

    // POST /teams/{id}/settlements/{userId}  { month, paid: bool, memo? }
    public function mark(Request $request, string $id, string $userId)
    {
        [$team, $err] = $this->authorizeTeam($request, $id);
        if ($err) {
            return $err;
        }
        $data = $request->validate([
            'month' => ['required', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'],
            'paid'  => 'required|boolean',
            'memo'  => 'nullable|string|max:200',
        ]);

        $row = collect($this->build($team, $data['month'])['members'])->firstWhere('user_id', (int) $userId);
        if (!$row) {
            return ApiResponse::error('이 달 정산 대상 팀원이 아니에요.', 'ERR_NOT_FOUND', 404);
        }

        $settlement = TeamSettlement::updateOrCreate(
            ['team_id' => $team->id, 'user_id' => (int) $userId, 'year_month' => $data['month']],
            [
                'paid_amount' => $data['paid'] ? $row['amount'] : null,
                'paid_at'     => $data['paid'] ? now() : null,
                'paid_by'     => $data['paid'] ? $request->user()->id : null,
                'memo'        => $data['memo'] ?? null,
            ],
        );

        return ApiResponse::success([
            'user_id' => (int) $userId,
            'paid'    => (bool) $settlement->paid_at,
            'paid_at' => $settlement->paid_at?->toIso8601String(),
        ], $data['paid'] ? '지급 완료로 표시했어요.' : '지급 완료를 취소했어요.');
    }

    // GET /teams/{id}/settlements/xlsx-link?month= — 10분짜리 서명 링크
    public function xlsxLink(Request $request, string $id)
    {
        [$team, $err] = $this->authorizeTeam($request, $id);
        if ($err) {
            return $err;
        }
        $month = $this->month($request->query('month'));
        $url = URL::temporarySignedRoute('teams.settlements.xlsx.signed', now()->addMinutes(10), ['id' => $team->id, 'month' => $month], false);

        return ApiResponse::success(['url' => url($url)], '엑셀 링크 생성');
    }

    // GET /files/teams/{id}/settlements/{month}/xlsx (서명 검증)
    public function signedXlsx(string $id, string $month)
    {
        $team = Team::find($id);
        if (!$team || !preg_match('/^\d{4}-\d{2}$/', $month)) {
            return ApiResponse::error('존재하지 않는 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }
        $data = $this->build($team, $month);

        $summary = [['팀원', '역할', '근무일', '공수', '정산 금액', '지급', '지급일', '메모']];
        $detail  = [['팀원', '날짜', '현장', '공정', '공수', '단가', '금액']];
        foreach ($data['members'] as $m) {
            $summary[] = [$m['name'], $m['role'], $m['work_days'], $m['work_units'], $m['amount'],
                $m['paid'] ? '완료' : '미지급', $m['paid_at'] ? substr($m['paid_at'], 0, 10) : '', $m['memo'] ?? ''];
            foreach ($m['schedules'] as $s) {
                $detail[] = [$m['name'], $s['date'], $s['site'] ?? '', $s['work_type'] ?? '', $s['work_units'], $s['daily_wage'], $s['amount']];
            }
        }
        $summary[] = [];
        $summary[] = ['합계', '', '', $data['totals']['work_units'], $data['totals']['amount'], "미지급 {$data['totals']['unpaid_count']}명", '', ''];

        return XlsxBuilder::download("{$team->name}_정산_{$month}.xlsx", ['정산 요약' => $summary, '일정별 내역' => $detail]);
    }

    /** 정산표 계산 */
    private function build(Team $team, string $month): array
    {
        $start = Carbon::parse($month . '-01')->startOfMonth();
        $end   = (clone $start)->endOfMonth();

        // 지금 팀원 + (이 달 일정에 배정됐지만 이미 나간 사람도 정산 대상)
        $rows = DB::table('schedule_users')
            ->join('schedules', 'schedules.id', '=', 'schedule_users.schedule_id')
            ->leftJoin('sites', 'sites.id', '=', 'schedules.site_id')
            ->leftJoin('work_types', 'work_types.id', '=', 'schedules.work_type_id')
            ->whereNull('schedules.deleted_at')
            ->whereNull('schedule_users.deleted_at')
            ->where('schedules.team_id', $team->id)
            ->whereBetween('schedules.date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('schedules.date')
            ->get([
                'schedule_users.user_id', 'schedules.id as schedule_id', 'schedules.date', 'schedules.daily_wage', 'schedules.work_units',
                'schedules.title', 'schedules.address', 'sites.apt_name', 'sites.address as site_address', 'work_types.name as work_type',
            ])
            ->groupBy('user_id');

        $members = DB::table('team_members')
            ->join('users', 'users.id', '=', 'team_members.user_id')
            ->where('team_members.team_id', $team->id)
            ->whereNull('team_members.deleted_at')
            ->get(['users.id', 'users.name', 'users.avatar_color', 'users.avatar_image_path', 'team_members.role_id', 'team_members.is_sub_leader'])
            ->keyBy('id');

        // 나간 팀원이지만 이 달 기록이 있으면 포함
        $missing = $rows->keys()->diff($members->keys());
        if ($missing->isNotEmpty()) {
            DB::table('users')->whereIn('id', $missing)->get(['id', 'name', 'avatar_color', 'avatar_image_path'])
                ->each(function ($u) use ($members) {
                    $u->role_id = null;
                    $u->is_sub_leader = false;
                    $members->put($u->id, $u);
                });
        }

        $paid = TeamSettlement::where('team_id', $team->id)->where('year_month', $month)->get()->keyBy('user_id');

        $list = $members->map(function ($m) use ($rows, $paid) {
            $schedules = collect($rows->get($m->id, []))->map(function ($s) {
                $wage  = (float) ($s->daily_wage ?? 0);
                $units = (float) ($s->work_units ?? 0);
                return [
                    'schedule_id' => $s->schedule_id,
                    'date'        => substr((string) $s->date, 0, 10),
                    'site'        => $s->apt_name ?: ($s->site_address ?: ($s->address ?: $s->title)),
                    'work_type'   => $s->work_type,
                    'work_units'  => $units,
                    'daily_wage'  => $wage,
                    'amount'      => round($wage * $units),
                ];
            })->values();
            $amount = (float) $schedules->sum('amount');
            $p = $paid->get($m->id);

            return [
                'user_id'           => $m->id,
                'name'              => $m->name,
                'avatar_color'      => $m->avatar_color,
                'avatar_image_path' => $m->avatar_image_path,
                'role'              => $m->role_id === null ? '나간 팀원' : ((int) $m->role_id <= 2 ? '팀장' : ($m->is_sub_leader ? '부팀장' : '팀원')),
                'work_days'         => $schedules->pluck('date')->unique()->count(),
                'work_units'        => round((float) $schedules->sum('work_units'), 1),
                'amount'            => $amount,
                'paid'              => (bool) $p?->paid_at,
                'paid_at'           => $p?->paid_at?->toIso8601String(),
                'paid_amount'       => $p?->paid_amount !== null ? (float) $p->paid_amount : null,
                // 지급 처리한 뒤 일정이 바뀌어 금액이 달라졌으면 표시
                'amount_changed'    => $p?->paid_at && (float) $p->paid_amount != $amount,
                'memo'              => $p?->memo,
                'schedules'         => $schedules,
            ];
        })
            // 기록 없는 팀원도 보이되(0원), 금액 큰 순
            ->sortByDesc('amount')->values();

        return [
            'team_id' => $team->id,
            'month'   => $month,
            'members' => $list,
            'totals'  => [
                'work_units'   => round((float) $list->sum('work_units'), 1),
                'amount'       => (float) $list->sum('amount'),
                'paid_amount'  => (float) $list->where('paid', true)->sum('amount'),
                'unpaid_count' => $list->where('paid', false)->where('amount', '>', 0)->count(),
            ],
        ];
    }

    /** 팀장만 + 팀 요금제 */
    private function authorizeTeam(Request $request, string $id): array
    {
        $user = $request->user();
        $team = Team::when($user->role_id !== 1, fn($q) => $q->whereIn('id', $user->ledTeamIds()))->find($id);
        if (!$team) {
            return [null, ApiResponse::error('팀장만 정산표를 볼 수 있어요.', 'ERR_AUTH_002', 403)];
        }
        if (!PlanService::teamCan($team->id, 'team_settlement')) {
            return [null, ApiResponse::error(PlanService::upgradeMessage('team_settlement'), 'ERR_PLAN_001', 403)];
        }
        return [$team, null];
    }

    private function month(?string $m): string
    {
        return $m && preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $m) ? $m : now()->format('Y-m');
    }
}
