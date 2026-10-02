<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ★ v18.38 — 홈 "팀 활동" (DESIGN-CANVAS HOME)
 * 내가 소속된 모든 팀의 최근 활동(일정 추가, 팀원 참여)을 시간순으로 최대 5건.
 * 별도 활동 로그 테이블 없이 schedules / team_members 기록에서 바로 모음.
 */
class TeamActivityController extends Controller
{
    // GET /api/team-activities
    public function index(Request $request)
    {
        $teamIds = $request->user()->teamIds();
        if (empty($teamIds)) {
            return ApiResponse::success([], '팀 활동 조회 성공');
        }

        $schedules = DB::table('schedules')
            ->join('users', 'users.id', '=', 'schedules.created_by')
            ->join('teams', 'teams.id', '=', 'schedules.team_id')
            ->whereIn('schedules.team_id', $teamIds)
            ->whereNull('schedules.deleted_at')
            ->orderByDesc('schedules.created_at')
            ->limit(5)
            ->get([
                DB::raw("'schedule' as type"), 'users.name as actor_name', 'teams.id as team_id', 'teams.name as team_name',
                'schedules.id as schedule_id', 'schedules.created_at',
            ]);

        $joins = DB::table('team_members')
            ->join('users', 'users.id', '=', 'team_members.user_id')
            ->join('teams', 'teams.id', '=', 'team_members.team_id')
            ->whereIn('team_members.team_id', $teamIds)
            ->whereNull('team_members.deleted_at')
            ->orderByDesc('team_members.joined_at')
            ->limit(5)
            ->get([
                DB::raw("'join' as type"), 'users.name as actor_name', 'teams.id as team_id', 'teams.name as team_name',
                DB::raw('NULL as schedule_id'), 'team_members.joined_at as created_at',
            ]);

        $items = $schedules->concat($joins)
            ->sortByDesc('created_at')
            ->take(5)
            ->values();

        return ApiResponse::success($items, '팀 활동 조회 성공');
    }
}
