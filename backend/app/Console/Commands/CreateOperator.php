<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

/**
 * ★ v18.40 — 웹 관리자용 운영자 계정 생성/비밀번호 변경
 *
 * 운영자 계정은 앱 회원가입으로 만들 수 없고(웹 가입 차단) 서버에서만 만든다.
 *   php artisan admin:create-operator 이메일 이름 --password=비밀번호
 * 같은 이메일이 이미 운영자면 비밀번호만 바꾼다. 일반 회원 이메일이면 거부(앱 계정을 망가뜨리지 않게).
 */
class CreateOperator extends Command
{
    protected $signature = 'admin:create-operator {email} {name} {--password= : 8자 이상}';
    protected $description = '웹 관리자 운영자 계정 생성(또는 기존 운영자 비밀번호 변경)';

    public function handle(): int
    {
        $email = $this->argument('email');
        $password = (string) $this->option('password');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('이메일 형식이 올바르지 않습니다.');
            return self::FAILURE;
        }
        if (mb_strlen($password) < 8) {
            $this->error('비밀번호는 8자 이상으로 --password= 에 넣어주세요.');
            return self::FAILURE;
        }

        $user = User::where('email', $email)->first();

        if ($user && $user->user_type !== 'operator') {
            $this->error('이미 앱 회원으로 가입된 이메일입니다. 운영자용으로는 다른 이메일을 써주세요.');
            return self::FAILURE;
        }

        if ($user) {
            $user->password = Hash::make($password);
            $user->save();
            $this->info("운영자 {$email} 비밀번호를 변경했습니다.");
            return self::SUCCESS;
        }

        User::create([
            'name'      => $this->argument('name'),
            'email'     => $email,
            'password'  => Hash::make($password),
            'role_id'   => 1,
            'user_type' => 'operator',
        ]);

        $this->info("운영자 계정 {$email} 을(를) 만들었습니다. 웹 관리자에서 로그인하세요.");
        return self::SUCCESS;
    }
}
