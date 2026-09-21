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
 * GET /api/attendance?year=&month=  (manager 이상 전용 — 라우트 미들웨어)
 */
class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user->team_id) {
            return ApiResponse::error('소속된 팀이 없습니다.', 'ERR_TEAM_001', 404);
        }

        $data = $request->validate([
            'year'  => 'required|integer|min:2020|max:2099',
            'month' => 'required|integer|min:1|max:12',
        ]);

        $start = Carbon::create($data['year'], $data['month'], 1)->startOfMonth();
        $end   = (clone $start)->endOfMonth();

        // 1) 팀원 전체 (본인 포함)
        $members = User::where('team_id', $user->team_id)
            ->whereNull('deleted_at')
            ->select('id', 'name', 'role_id')
            ->orderBy('role_id')
            ->orderBy('name')
            ->get();

        // 2) 이 팀의 이번 달 일정에 배정된 (user_id, date) 전부 한 번에 조회
        $rows = DB::table('schedule_users')
            ->join('schedules', 'schedules.id', '=', 'schedule_users.schedule_id')
            ->whereNull('schedules.deleted_at')
            ->whereNull('schedule_users.deleted_at')
            ->where('schedules.team_id', $user->team_id)
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
                'work_days' => count($dates),
                'dates'     => $dates,
            ];
        })->values();

        return ApiResponse::success([
            'year'    => $data['year'],
            'month'   => $data['month'],
            'members' => $result,
        ], '근태 현황 조회 성공');
    }
}
