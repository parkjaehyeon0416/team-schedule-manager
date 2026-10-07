<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * 근태 현황 — 팀장이 팀원들의 그 달 출근 현황을 파악하는 용도.
 *
 * ★ 설계 방향(2026-09-21 재검토): 개인이 직접 출퇴근을 체크인하는 방식이 아님 —
 *   본인 근무일/공수는 이미 MySummaryScreen(내 수입 현황)에 나와서 중복이기
 *   때문에, "팀원이 이미 배정된 일정(schedule_users)"을 근거로 출근일을
 *   그대로 집계함(MonthlySummaryService::recalculate와 동일한 산정 방식).
 *   그래서 attendances 테이블(check_in/check_out)은 이 기능에서 쓰지 않음 —
 *   실제 출퇴근 시각 기록 기능이 아니라 "일정 배정=근무일" 집계 조회임.
 *
 * GET /api/attendance?year=&month=&team_id=  (★ v18.44 그 팀의 팀장만 — 컨트롤러에서 검사)
 */
class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'year'    => 'required|integer|min:2020|max:2099',
            'month'   => 'required|integer|min:1|max:12',
            'team_id' => 'nullable|integer',
        ]);

        // ★ v18.44 — 활성 팀이 아니어도 내가 팀장인 팀이면 조회 가능.
        //   팀을 안 고르면 활성 팀(팀장일 때) → 아니면 내가 팀장인 첫 팀.
        $led = $user->assignableTeamIds();
        $teamId = $data['team_id']
            ?? ($user->canAssignIn($user->team_id) ? $user->team_id : ($led[0] ?? null));

        if (!$teamId) {
            return ApiResponse::error('팀장으로 있는 팀이 없습니다.', 'ERR_TEAM_001', 404);
        }
        if (!$user->canAssignIn((int) $teamId)) {
            return ApiResponse::error('권한이 없습니다.', 'ERR_AUTH_002', 403);
        }
        // ★ v18.47 — 팀 요금제 기능(출시 기념 기간엔 무료)
        if (!\App\Services\PlanService::teamCan((int) $teamId, 'team_attendance')) {
            return \App\Services\PlanService::denied('team_attendance', \App\Services\PlanService::upgradeMessage('team_attendance'));
        }

        $start = Carbon::create($data['year'], $data['month'], 1)->startOfMonth();
        $end   = (clone $start)->endOfMonth();

        // 1) 팀원 전체 (본인 포함) — ★ v18.44 team_members 기준(예전엔 users.team_id=활성 팀이라
        //    이 팀을 활성으로 안 둔 팀원이 빠졌음). 역할도 이 팀 안에서의 역할.
        $members = User::query()
            ->join('team_members', 'team_members.user_id', '=', 'users.id')
            ->where('team_members.team_id', $teamId)
            ->whereNull('team_members.deleted_at')
            ->whereNull('users.deleted_at')
            ->select('users.id', 'users.name', 'users.avatar_color', 'users.avatar_image_path', 'team_members.role_id', 'team_members.is_sub_leader')
            ->orderBy('team_members.role_id')
            ->orderBy('users.name')
            ->get();

        // 2) 이 팀의 이번 달 일정에 배정된 (user_id, date) 전부 한 번에 조회
        $rows = DB::table('schedule_users')
            ->join('schedules', 'schedules.id', '=', 'schedule_users.schedule_id')
            ->whereNull('schedules.deleted_at')
            ->whereNull('schedule_users.deleted_at')
            ->where('schedules.team_id', $teamId)
            ->whereBetween('schedules.date', [$start->toDateString(), $end->toDateString()])
            ->select('schedule_users.user_id', 'schedules.date')
            ->get();

        // 3) user_id별로 날짜 묶기 (같은 날 중복 배정돼도 근무일은 1일)
        $datesByUser = [];
        foreach ($rows as $row) {
            $dateKey = is_string($row->date) ? $row->date : (string) $row->date;
            $datesByUser[$row->user_id][$dateKey] = true;
        }

        $result = $members->map(function ($member) use ($datesByUser) {
            $dates = array_keys($datesByUser[$member->id] ?? []);
            sort($dates);

            return [
                'id'        => $member->id,
                'name'      => $member->name,
                'role_id'   => $member->role_id,
                // ★ v18.48 — 디자인(ATTENDANCE) 역할 표시·아바타
                'role'      => (int) $member->role_id <= 2 ? '팀장' : ($member->is_sub_leader ? '부팀장' : '팀원'),
                'avatar_color'      => $member->avatar_color,
                'avatar_image_path' => $member->avatar_image_path,
                'work_days' => count($dates),
                'dates'     => $dates,
            ];
        })->values();

        return ApiResponse::success([
            'team_id' => (int) $teamId,
            'year'    => $data['year'],
            'month'   => $data['month'],
            'members' => $result,
        ], '근태 현황 조회 성공');
    }
}
