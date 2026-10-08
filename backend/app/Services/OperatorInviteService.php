<?php

namespace App\Services;

use App\Models\User;
use App\Services\Sms\SmsServiceInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * ★ v18.56 — 운영자 초대(관리 웹 운영자 관리 + artisan admin:invite-operator 공용)
 *   계정은 아무도 모르는 임시 비밀번호로 만들고, 휴대폰으로 30분짜리 1회용 비밀번호 설정 링크를 보냄.
 */
class OperatorInviteService
{
    public function __construct(private SmsServiceInterface $sms) {}

    /**
     * @return array{0: ?User, 1: ?string} [운영자, 실패 사유(member_email|already_operator)]
     */
    public function invite(string $name, string $email, string $phone, bool $allowExisting = false): array
    {
        $user = User::withTrashed()->where('email', $email)->first();
        if ($user && $user->user_type !== 'operator') {
            return [null, 'member_email'];
        }
        if ($user && !$allowExisting) {
            return [null, 'already_operator'];
        }
        if (!$user) {
            $user = User::create([
                'name'      => $name,
                'email'     => $email,
                'password'  => Hash::make(Str::random(48)), // 아무도 모르는 값 — 링크로 본인이 설정
                'role_id'   => 1,
                'user_type' => 'operator',
            ]);
        }
        $user->forceFill(['operator_phone' => self::digits($phone)])->save();
        $this->sendLink($user);
        return [$user, null];
    }

    /** 비밀번호 설정 링크 문자(30분, 1회용). 휴대폰이 없으면 false */
    public function sendLink(User $user): bool
    {
        if (!$user->operator_phone) {
            return false;
        }
        $token = Str::random(64);
        Cache::put("operator_setpw:{$token}", $user->id, now()->addMinutes(30));
        $link = rtrim(config('app.url'), '/') . '/admin/set-password?token=' . $token;
        $this->sms->send($user->operator_phone, "[WorkMate] 운영자 비밀번호 설정 링크입니다(30분, 1회용).\n{$link}");
        return true;
    }

    public static function digits(string $phone): string
    {
        return preg_replace('/\D/', '', $phone);
    }

    public static function mask(?string $phone): ?string
    {
        return $phone ? preg_replace('/^(\d{3})\d+(\d{4})$/', '$1-****-$2', self::digits($phone)) : null;
    }
}
