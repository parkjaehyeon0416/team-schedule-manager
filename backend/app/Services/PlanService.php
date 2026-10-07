<?php

namespace App\Services;

use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * ★ v18.47 — 요금제 권한 판단 (config/plans.php)
 *   - 개인 기능은 그 사람의 요금제, 팀 기능은 팀을 만든 팀장(없으면 현재 팀장 중 누구든)의 요금제로 판단
 *   - 출시 기념 무료 기간(launch_free_until 전)에는 전부 허용
 */
class PlanService
{
    private static array $teamOwnerPlanCache = [];

    public static function promoActive(): bool
    {
        return now()->lt(\Illuminate\Support\Carbon::parse(config('plans.launch_free_until')));
    }

    /** 만료를 반영한 현재 요금제 */
    public static function planOf(?User $user): string
    {
        if (!$user) {
            return 'free';
        }
        $plan = $user->plan ?: 'free';
        if ($plan !== 'free' && $user->plan_expires_at && now()->gt($user->plan_expires_at)) {
            return 'free';
        }
        return $plan;
    }

    public static function planGrants(string $plan, string $feature): bool
    {
        return in_array($plan, config("plans.features.$feature", []), true);
    }

    /** 개인 기능 사용 가능 여부 */
    public static function can(?User $user, string $feature): bool
    {
        return self::promoActive() || self::planGrants(self::planOf($user), $feature);
    }

    /** 팀 기능 사용 가능 여부 — 팀장 중 한 명이라도 그 기능을 주는 요금제면 허용 */
    public static function teamCan(?int $teamId, string $feature): bool
    {
        if (self::promoActive()) {
            return true;
        }
        if (!$teamId) {
            return false;
        }
        foreach (self::leaderPlans($teamId) as $plan) {
            if (self::planGrants($plan, $feature)) {
                return true;
            }
        }
        return false;
    }

    /** 무료 한도 — 기능이 열려 있으면 null(무제한), 아니면 숫자 */
    public static function limit(?User $user, string $limitKey, string $unlockFeature): ?int
    {
        return self::can($user, $unlockFeature) ? null : (int) config("plans.free_limits.$limitKey");
    }

    public static function teamLimit(?int $teamId, string $limitKey, string $unlockFeature): ?int
    {
        return self::teamCan($teamId, $unlockFeature) ? null : (int) config("plans.free_limits.$limitKey");
    }

    /** /me·요금제 화면용 요약 */
    public static function summary(User $user): array
    {
        $plan = self::planOf($user);
        return [
            'plan'              => $plan,
            'plan_name'         => config("plans.plans.$plan.name"),
            'plan_expires_at'   => $plan === 'free' ? null : $user->plan_expires_at?->toIso8601String(),
            'launch_free_until' => self::promoActive() ? config('plans.launch_free_until') : null,
            'features'          => collect(array_keys(config('plans.features')))
                ->mapWithKeys(fn($f) => [$f => str_starts_with($f, 'team_') || $f === 'multi_team_lead'
                    ? self::promoActive() || self::planGrants($plan, $f)
                    : self::can($user, $f)])
                ->all(),
        ];
    }

    /**
     * ★ v18.47 — 요금제 때문에 막혔을 때의 403 응답. 앱이 "잠금 안내 시트"(PLAN_LOCKED)를 띄우는 데 필요한
     *   정보(무슨 기능인지, 한도·사용량, 다시 채워지는 날, 어떤 요금제로 풀리는지)를 같이 내려줌.
     *   $usage: ['limit'=>3,'used'=>3,'unit'=>'건','monthly'=>true]
     */
    public static function denied(string $feature, string $message, array $usage = []): \Illuminate\Http\JsonResponse
    {
        $isTeam = str_starts_with($feature, 'team_') || $feature === 'multi_team_lead';
        return response()->json([
            'success'    => false,
            'message'    => $message,
            'error_code' => 'ERR_PLAN_001',
            'plan'       => [
                'feature'      => $feature,
                'upgrade_plan' => $isTeam ? 'team' : 'pro',
                'limit'        => $usage['limit'] ?? null,
                'used'         => $usage['used'] ?? null,
                'unit'         => $usage['unit'] ?? null,
                'resets_on'    => !empty($usage['monthly']) ? now()->addMonthNoOverflow()->startOfMonth()->toDateString() : null,
            ],
        ], 403);
    }

    /** 403 응답용 공통 문구 */
    public static function upgradeMessage(string $feature): string
    {
        $isTeam = str_starts_with($feature, 'team_') || $feature === 'multi_team_lead';
        return $isTeam
            ? '팀 요금제에서 쓸 수 있는 기능이에요. 팀장이 팀 요금제를 이용하면 열려요.'
            : '개인 프로 요금제에서 쓸 수 있는 기능이에요.';
    }

    private static function leaderPlans(int $teamId): array
    {
        if (!isset(self::$teamOwnerPlanCache[$teamId])) {
            $leaders = User::query()
                ->join('team_members', 'team_members.user_id', '=', 'users.id')
                ->where('team_members.team_id', $teamId)
                ->whereNull('team_members.deleted_at')
                ->where('team_members.role_id', '<=', 2)
                ->get(['users.id', 'users.plan', 'users.plan_expires_at']);
            self::$teamOwnerPlanCache[$teamId] = $leaders->map(fn($u) => self::planOf($u))->all();
        }
        return self::$teamOwnerPlanCache[$teamId];
    }
}
