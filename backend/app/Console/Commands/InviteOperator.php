<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\OperatorInviteService;
use Illuminate\Console\Command;

/**
 * ★ v18.40 — 운영자 초대: 계정을 (아무도 모르는) 임시 비밀번호로 만들고,
 *   본인 휴대폰으로 "비밀번호 설정 링크"(30분, 1회용)를 문자로 보낸다.
 *   비밀번호는 받은 사람이 직접 정하므로 서버 작업자/개발자가 비밀번호를 알 필요가 없음.
 *   ★ v18.56 — 관리 웹 "운영자 관리"와 같은 OperatorInviteService 사용(휴대폰은 users.operator_phone에 저장)
 *
 *   php artisan admin:invite-operator 운영자이메일 이름 --phone-from=휴대폰이등록된앱계정이메일
 *   php artisan admin:invite-operator 운영자이메일 이름 --phone=01012345678
 *
 * 이미 있는 운영자에게 다시 실행하면 비밀번호 재설정 링크만 다시 보냄.
 */
class InviteOperator extends Command
{
    protected $signature = 'admin:invite-operator {email} {name} {--phone= : 링크 받을 휴대폰} {--phone-from= : 이 앱 계정에 등록된 휴대폰으로 보냄}';
    protected $description = '운영자 계정 생성 + 비밀번호 설정 링크 문자 발송';

    public function handle(OperatorInviteService $invites): int
    {
        $email = $this->argument('email');

        $phone = $this->option('phone');
        if (!$phone && $this->option('phone-from')) {
            $phone = User::where('email', $this->option('phone-from'))->value('phone');
        }
        if (!$phone) {
            $this->error('링크를 받을 휴대폰 번호가 없습니다. --phone 또는 --phone-from 을 확인하세요.');
            return self::FAILURE;
        }

        [$user, $why] = $invites->invite($this->argument('name'), $email, $phone, allowExisting: true);
        if ($why === 'member_email') {
            $this->error('이미 앱 회원으로 가입된 이메일입니다. 운영자용으로는 다른 이메일을 써주세요.');
            return self::FAILURE;
        }

        $this->info("운영자 {$email} — 비밀번호 설정 링크를 " . OperatorInviteService::mask($phone) . ' 로 보냈습니다.');
        return self::SUCCESS;
    }
}
