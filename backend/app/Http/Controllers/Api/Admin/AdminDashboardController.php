<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Support\Facades\DB;

/**
 * ★ v18.40 — 웹 관리자(운영자) 대시보드 요약 숫자
 * GET /api/admin/dashboard
 */
class AdminDashboardController extends Controller
{
    public function index()
    {
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();
        $members = DB::table('users')->whereNull('deleted_at')->where('user_type', '!=', 'operator');

        $stats = [
            'members_total'       => (clone $members)->count(),
            'members_today'       => (clone $members)->whereDate('created_at', $today)->count(),
            'members_this_month'  => (clone $members)->whereDate('created_at', '>=', $monthStart)->count(),
            'teams_total'         => DB::table('teams')->whereNull('deleted_at')->count(),
            'schedules_this_month' => DB::table('schedules')->whereNull('deleted_at')->where('date', '>=', $monthStart)->count(),
            'quotes_this_month'   => DB::table('quotes')->whereNull('deleted_at')->whereDate('created_at', '>=', $monthStart)->count(),
            'push_devices'        => DB::table('device_tokens')->count(),
            'notices_published'   => DB::table('notices')->whereNull('deleted_at')->whereNotNull('published_at')->count(),
        ];

        $recentMembers = (clone $members)
            ->orderByDesc('created_at')
            ->limit(8)
            ->get(['id', 'name', 'email', 'user_type', 'created_at']);

        return ApiResponse::success([
            'stats'          => $stats,
            'recent_members' => $recentMembers,
        ], '대시보드 조회 성공');
    }
}
