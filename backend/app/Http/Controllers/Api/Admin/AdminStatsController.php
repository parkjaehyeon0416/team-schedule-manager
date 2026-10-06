<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ★ v18.43 — 운영자 웹 "통계": 기간별 일일 회원가입·문의·접속자.
 *   결제 기능이 생기면 같은 형태로 'payments' 시리즈를 추가할 예정.
 */
class AdminStatsController extends Controller
{
    // GET /api/admin/stats?from=2026-09-07&to=2026-10-06 (기본: 최근 30일, 최대 366일)
    public function index(Request $request)
    {
        $request->validate([
            'from' => 'nullable|date',
            'to'   => 'nullable|date|after_or_equal:from',
        ]);

        $to = CarbonImmutable::parse($request->query('to', now()->toDateString()))->startOfDay();
        $from = CarbonImmutable::parse($request->query('from', $to->subDays(29)->toDateString()))->startOfDay();
        if ($from->diffInDays($to) > 365) {
            $from = $to->subDays(365);
        }
        $range = [$from->toDateString(), $to->toDateString()];
        $rangeTs = [$from->toDateTimeString(), $to->endOfDay()->toDateTimeString()];

        $signups = DB::table('users')
            ->where('user_type', '!=', 'operator')
            ->whereBetween('created_at', $rangeTs)
            ->selectRaw('DATE(created_at) d, COUNT(*) c')->groupBy('d')->pluck('c', 'd');

        $inquiries = DB::table('inquiries')
            ->whereNull('deleted_at')
            ->whereBetween('created_at', $rangeTs)
            ->selectRaw('DATE(created_at) d, COUNT(*) c')->groupBy('d')->pluck('c', 'd');

        $active = DB::table('daily_active_users')
            ->whereBetween('date', $range)
            ->selectRaw('date d, COUNT(*) c')->groupBy('d')->pluck('c', 'd');

        $series = [];
        for ($d = $from; $d <= $to; $d = $d->addDay()) {
            $key = $d->toDateString();
            $series[] = [
                'date'         => $key,
                'signups'      => (int) ($signups[$key] ?? 0),
                'inquiries'    => (int) ($inquiries[$key] ?? 0),
                'active_users' => (int) ($active[$key] ?? 0),
            ];
        }

        $days = count($series);
        $today = now()->toDateString();

        return ApiResponse::success([
            'from'   => $range[0],
            'to'     => $range[1],
            'series' => $series,
            'totals' => [
                'signups'           => array_sum(array_column($series, 'signups')),
                'inquiries'         => array_sum(array_column($series, 'inquiries')),
                'active_users_avg'  => $days ? round(array_sum(array_column($series, 'active_users')) / $days, 1) : 0,
                // 기간 중 한 번이라도 접속한 사람 수(중복 제외)
                'active_users_unique' => DB::table('daily_active_users')->whereBetween('date', $range)->distinct()->count('user_id'),
            ],
            'now' => [
                'members'            => DB::table('users')->where('user_type', '!=', 'operator')->whereNull('deleted_at')->count(),
                'signups_today'      => DB::table('users')->where('user_type', '!=', 'operator')->whereNull('deleted_at')->whereDate('created_at', $today)->count(),
                'active_today'       => DB::table('daily_active_users')->where('date', $today)->count(),
                'pending_inquiries'  => DB::table('inquiries')->whereNull('deleted_at')->where('status', 'pending')->count(),
                'oldest_pending_hours' => ($oldest = DB::table('inquiries')->whereNull('deleted_at')->where('status', 'pending')->min('created_at'))
                    ? (int) floor(now()->diffInMinutes($oldest, true) / 60) : null,
            ],
        ], '통계 조회 성공');
    }
}
