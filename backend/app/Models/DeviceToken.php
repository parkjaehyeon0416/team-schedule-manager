<?php

namespace App\Models;

use App\Support\LoginSession;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

// ★ v18.38 — 휴대폰 푸시(FCM) 기기 토큰
// ★ v18.67 — personal_access_token_id: 어느 로그인 세션(Sanctum 토큰)에서 등록했는지.
//   그 세션이 없어지면(로그아웃·비밀번호 재설정·다른 기기 로그아웃·30일 미사용) 그 기기엔 알림을 보내지 않음.
class DeviceToken extends Model
{
    protected $fillable = ['user_id', 'token', 'platform', 'personal_access_token_id'];

    /**
     * 로그인 세션이 살아 있는 기기만.
     * 세션 번호가 없는 예전 행(v18.66 이전 등록)은 어느 세션인지 알 수 없어 그대로 포함(하위 호환) —
     * 앱이 켜질 때마다 다시 등록하므로 다음 실행 때 세션 번호가 채워짐.
     */
    public function scopeWithLiveSession(Builder $query): Builder
    {
        return $query->where(function ($q) {
            $q->whereNull('device_tokens.personal_access_token_id')
                ->orWhereExists(fn($sub) => self::liveSession($sub));
        });
    }

    /** 등록한 로그인 세션이 끊긴 기기 (세션 번호가 있는데 그 세션이 없거나 30일 넘게 안 쓴 것) */
    public function scopeWithDeadSession(Builder $query): Builder
    {
        return $query->whereNotNull('device_tokens.personal_access_token_id')
            ->whereNotExists(fn($sub) => self::liveSession($sub));
    }

    /** 세션 판정은 AppServiceProvider의 로그인 유지 규칙(마지막 사용 후 30일)과 같게 */
    private static function liveSession($sub): void
    {
        $sub->selectRaw('1')
            ->from('personal_access_tokens')
            ->whereColumn('personal_access_tokens.id', 'device_tokens.personal_access_token_id')
            ->whereColumn('personal_access_tokens.tokenable_id', 'device_tokens.user_id')
            ->where('personal_access_tokens.tokenable_type', (new User())->getMorphClass())
            ->whereRaw(
                'COALESCE(personal_access_tokens.last_used_at, personal_access_tokens.created_at) >= ?',
                [now()->subDays(LoginSession::APP_IDLE_DAYS)]
            );
    }
}
