<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Notice;
use Illuminate\Support\Facades\DB;

/**
 * ★ v18.40~41 — 웹 관리자(운영자) 대시보드 (DESIGN-CANVAS ADMIN_DASHBOARD)
 * GET /api/admin/dashboard
 */
class AdminDashboardController extends Controller
{
    public function index()
    {
        $today = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();
        $members = DB::table('users')->whereNull('users.deleted_at')->where('users.user_type', '!=', 'operator');
        $published = Notice::published();

        $stats = [
            'members_total'        => (clone $members)->count(),
            'members_today'        => (clone $members)->whereDate('users.created_at', $today)->count(),
            'members_yesterday'    => (clone $members)->whereDate('users.created_at', $yesterday)->count(),
            'members_this_month'   => (clone $members)->whereDate('users.created_at', '>=', $monthStart)->count(),
            'teams_total'          => DB::table('teams')->whereNull('deleted_at')->count(),
            'schedules_this_month' => DB::table('schedules')->whereNull('deleted_at')->where('date', '>=', $monthStart)->count(),
            'quotes_this_month'    => DB::table('quotes')->whereNull('deleted_at')->whereDate('created_at', '>=', $monthStart)->count(),
            'push_devices'         => DB::table('device_tokens')->count(),
            'notices_published'    => (clone $published)->where('type', 'notice')->count(),
            'events_published'     => (clone $published)->where('type', 'event')->count(),
        ];

        // 최근 가입 회원 — 지역/주요 공정은 명함(business_cards)에 적어둔 값
        $recentMembers = (clone $members)
            ->leftJoin('business_cards', 'business_cards.user_id', '=', 'users.id')
            ->orderByDesc('users.created_at')
            ->limit(5)
            ->get([
                'users.id', 'users.name', 'users.email', 'users.google_id', 'users.kakao_id', 'users.created_at',
                'business_cards.specialty', 'business_cards.service_area',
            ])
            ->map(fn($u) => [
                'id'            => $u->id,
                'name'          => $u->name,
                'email_masked'  => self::maskEmail($u->email),
                'specialty'     => $u->specialty,
                'service_area'  => $u->service_area,
                'signup_method' => $u->kakao_id ? '카카오' : ($u->google_id ? '구글' : '이메일'),
                'created_at'    => \Carbon\Carbon::parse($u->created_at)->toIso8601String(),
            ]);

        $publishedNotices = (clone $published)
            ->orderByDesc('is_pinned')
            ->orderByDesc('published_at')
            ->limit(5)
            ->get(['id', 'type', 'title', 'is_pinned', 'ends_at']);

        return ApiResponse::success([
            'stats'             => $stats,
            'recent_members'    => $recentMembers,
            'published_notices' => $publishedNotices,
            'generated_at'      => now()->toIso8601String(),
        ], '대시보드 조회 성공');
    }

    // "chulsoo@gmail.com" → "chu***@gmail.com"
    public static function maskEmail(?string $email): string
    {
        if (!$email || !str_contains($email, '@')) {
            return (string) $email;
        }
        [$local, $domain] = explode('@', $email, 2);
        return mb_substr($local, 0, min(4, max(1, mb_strlen($local) - 2))) . '***@' . $domain;
    }
}
