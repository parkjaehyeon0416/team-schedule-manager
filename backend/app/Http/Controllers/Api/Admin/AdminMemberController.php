<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ★ v18.41 — 운영자 웹 "회원 관리": 회원 조회·검색, 상세(활동 요약), 계정 정지/해제
 *   운영자 계정(user_type=operator)은 목록에서 제외.
 */
class AdminMemberController extends Controller
{
    // GET /api/admin/members?q=검색어&type=team|freelancer&status=active|suspended&page=1
    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        $query = User::query()
            ->where('user_type', '!=', 'operator')
            ->leftJoin('business_cards', 'business_cards.user_id', '=', 'users.id')
            ->when($q !== '', fn($w) => $w->where(fn($x) => $x
                ->where('users.name', 'like', "%{$q}%")
                ->orWhere('users.email', 'like', "%{$q}%")
                ->orWhere('users.phone', 'like', '%' . preg_replace('/\D/', '', $q) . '%')))
            ->when($request->query('type') === 'team', fn($w) => $w->whereExists(fn($s) => $s->select(DB::raw(1))
                ->from('team_members')->whereColumn('team_members.user_id', 'users.id')->whereNull('team_members.deleted_at')))
            ->when($request->query('type') === 'freelancer', fn($w) => $w->whereNotExists(fn($s) => $s->select(DB::raw(1))
                ->from('team_members')->whereColumn('team_members.user_id', 'users.id')->whereNull('team_members.deleted_at')))
            ->when($request->query('status') === 'suspended', fn($w) => $w->whereNotNull('users.suspended_at'))
            ->when($request->query('status') === 'active', fn($w) => $w->whereNull('users.suspended_at'))
            ->orderByDesc('users.created_at')
            ->select([
                'users.id', 'users.name', 'users.email', 'users.phone', 'users.google_id', 'users.kakao_id',
                'users.created_at', 'users.suspended_at',
                'business_cards.specialty', 'business_cards.service_area',
            ]);

        $page = $query->paginate(20);

        $teamNames = DB::table('team_members')
            ->join('teams', 'teams.id', '=', 'team_members.team_id')
            ->whereIn('team_members.user_id', collect($page->items())->pluck('id'))
            ->whereNull('team_members.deleted_at')
            ->get(['team_members.user_id', 'teams.name'])
            ->groupBy('user_id');

        $items = collect($page->items())->map(fn($u) => [
            'id'            => $u->id,
            'name'          => $u->name,
            'email'         => $u->email,
            'phone'         => $u->phone,
            'signup_method' => self::signupMethod($u),
            'teams'         => ($teamNames[$u->id] ?? collect())->pluck('name')->values(),
            'specialty'     => $u->specialty,
            'service_area'  => $u->service_area,
            'created_at'    => $u->created_at?->toIso8601String(),
            'suspended'     => (bool) $u->suspended_at,
        ]);

        $base = User::where('user_type', '!=', 'operator');

        return ApiResponse::success([
            'items'  => $items,
            'total'  => $page->total(),
            'page'   => $page->currentPage(),
            'pages'  => $page->lastPage(),
            'counts' => [
                'all'       => (clone $base)->count(),
                'suspended' => (clone $base)->whereNotNull('suspended_at')->count(),
            ],
        ], '회원 목록 조회 성공');
    }

    // GET /api/admin/members/{id}
    public function show(string $id)
    {
        $user = User::where('user_type', '!=', 'operator')->find($id);
        if (!$user) {
            return ApiResponse::error('회원을 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
        }

        $card = DB::table('business_cards')->where('user_id', $user->id)->first(['specialty', 'service_area', 'years_experience']);
        $teams = DB::table('team_members')
            ->join('teams', 'teams.id', '=', 'team_members.team_id')
            ->where('team_members.user_id', $user->id)
            ->whereNull('team_members.deleted_at')
            ->get(['teams.id', 'teams.name', 'team_members.role_id', 'team_members.joined_at']);

        $lastActive = DB::table('personal_access_tokens')
            ->where('tokenable_type', User::class)->where('tokenable_id', $user->id)
            ->max('last_used_at');

        return ApiResponse::success([
            'id'               => $user->id,
            'name'             => $user->name,
            'email'            => $user->email,
            'phone'            => $user->phone,
            'signup_method'    => self::signupMethod($user),
            'created_at'       => $user->created_at?->toIso8601String(),
            'last_active_at'   => $lastActive ? \Carbon\Carbon::parse($lastActive)->toIso8601String() : null,
            'suspended_at'     => $user->suspended_at?->toIso8601String(),
            'suspended_reason' => $user->suspended_reason,
            'specialty'        => $card?->specialty,
            'service_area'     => $card?->service_area,
            'years_experience' => $card?->years_experience,
            'teams'            => $teams->map(fn($t) => [
                'id' => $t->id, 'name' => $t->name, 'is_leader' => (int) $t->role_id === 2, 'joined_at' => $t->joined_at,
            ]),
            'activity' => [
                'schedules'   => DB::table('schedule_users')->where('user_id', $user->id)->whereNull('deleted_at')->count(),
                'sites'       => DB::table('sites')->where('created_by', $user->id)->whereNull('deleted_at')->count(),
                'quotes'      => DB::table('quotes')->where('user_id', $user->id)->whereNull('deleted_at')->count(),
                'push_devices' => DB::table('device_tokens')->where('user_id', $user->id)->count(),
            ],
        ], '회원 상세 조회 성공');
    }

    // POST /api/admin/members/{id}/suspend  { reason }
    public function suspend(Request $request, string $id)
    {
        $data = $request->validate(['reason' => 'required|string|max:255']);

        $user = User::where('user_type', '!=', 'operator')->find($id);
        if (!$user) {
            return ApiResponse::error('회원을 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
        }

        $user->suspended_at = now();
        $user->suspended_reason = $data['reason'];
        $user->save();
        // 바로 로그아웃시키고 푸시도 끊음
        $user->tokens()->delete();
        DB::table('device_tokens')->where('user_id', $user->id)->delete();

        return ApiResponse::success(null, "{$user->name}님 계정을 정지했어요.");
    }

    // POST /api/admin/members/{id}/unsuspend
    public function unsuspend(string $id)
    {
        $user = User::where('user_type', '!=', 'operator')->find($id);
        if (!$user) {
            return ApiResponse::error('회원을 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
        }

        $user->suspended_at = null;
        $user->suspended_reason = null;
        $user->save();

        return ApiResponse::success(null, "{$user->name}님 계정 정지를 해제했어요.");
    }

    private static function signupMethod($u): string
    {
        return $u->kakao_id ? '카카오' : ($u->google_id ? '구글' : '이메일');
    }
}
