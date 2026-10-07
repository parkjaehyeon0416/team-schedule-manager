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
 *
 * ★ v18.48 — 팀 상세 "활동" 탭(TEAM_DETAIL): ?team_id=로 한 팀만, ?limit=(최대 30),
 *   팀 공지 작성(notice)·현장 사진 올림(photos, 같은 사람·현장·날짜는 "n장"으로 묶음) 추가.
 *   type: schedule | join | notice | photos
 */
class TeamActivityController extends Controller
{
    // GET /api/team-activities?team_id=&limit=
    public function index(Request $request)
    {
        $teamIds = $request->user()->teamIds();
        if ($request->query('team_id')) {
            $teamIds = array_values(array_intersect($teamIds, [(int) $request->query('team_id')]));
        }
        if (empty($teamIds)) {
            return ApiResponse::success([], '팀 활동 조회 성공');
        }
        $limit = max(1, min(30, (int) $request->query('limit', 5)));

        $base = fn($cols) => array_merge([
            'users.name as actor_name', 'users.avatar_color as actor_color', 'users.avatar_image_path as actor_avatar',
            'teams.id as team_id', 'teams.name as team_name',
        ], $cols);

        $schedules = DB::table('schedules')
            ->join('users', 'users.id', '=', 'schedules.created_by')
            ->join('teams', 'teams.id', '=', 'schedules.team_id')
            ->whereIn('schedules.team_id', $teamIds)
            ->whereNull('schedules.deleted_at')
            ->orderByDesc('schedules.created_at')
            ->limit($limit)
            ->get($base([DB::raw("'schedule' as type"), 'schedules.id as schedule_id', DB::raw('NULL as count'), 'schedules.created_at']));

        $joins = DB::table('team_members')
            ->join('users', 'users.id', '=', 'team_members.user_id')
            ->join('teams', 'teams.id', '=', 'team_members.team_id')
            ->whereIn('team_members.team_id', $teamIds)
            ->whereNull('team_members.deleted_at')
            ->orderByDesc('team_members.joined_at')
            ->limit($limit)
            ->get($base([DB::raw("'join' as type"), DB::raw('NULL as schedule_id'), DB::raw('NULL as count'), 'team_members.joined_at as created_at']));

        $notices = DB::table('team_notices')
            ->join('users', 'users.id', '=', 'team_notices.user_id')
            ->join('teams', 'teams.id', '=', 'team_notices.team_id')
            ->whereIn('team_notices.team_id', $teamIds)
            ->whereNull('team_notices.deleted_at')
            ->orderByDesc('team_notices.created_at')
            ->limit($limit)
            ->get($base([DB::raw("'notice' as type"), DB::raw('NULL as schedule_id'), DB::raw('NULL as count'), 'team_notices.created_at']));

        $photos = DB::table('site_files')
            ->join('sites', 'sites.id', '=', 'site_files.site_id')
            ->join('users', 'users.id', '=', 'site_files.uploaded_by')
            ->join('teams', 'teams.id', '=', 'sites.team_id')
            ->whereIn('sites.team_id', $teamIds)
            ->whereNull('site_files.deleted_at')
            ->where('site_files.file_type', 'photo')
            ->groupBy('users.id', 'users.name', 'users.avatar_color', 'users.avatar_image_path', 'teams.id', 'teams.name', 'sites.id', DB::raw('DATE(site_files.created_at)'))
            ->orderByDesc(DB::raw('MAX(site_files.created_at)'))
            ->limit($limit)
            ->get($base([DB::raw("'photos' as type"), DB::raw('NULL as schedule_id'), DB::raw('COUNT(*) as count'), DB::raw('MAX(site_files.created_at) as created_at')]));

        // 홈(팀 지정 없음)은 예전처럼 일정·참여만
        $sources = $request->query('team_id') ? [$schedules, $joins, $notices, $photos] : [$schedules, $joins];

        // 시간대(+09:00)를 붙여서 보냄 — 기기 시간대가 달라도 "n분 전"이 정확하도록
        $items = collect($sources)->flatten(1)
            ->sortByDesc('created_at')
            ->take($limit)
            ->map(function ($row) {
                $row->created_at = \Carbon\Carbon::parse($row->created_at)->toIso8601String();
                $row->count = $row->count !== null ? (int) $row->count : null;
                return $row;
            })
            ->values();

        return ApiResponse::success($items, '팀 활동 조회 성공');
    }
}
