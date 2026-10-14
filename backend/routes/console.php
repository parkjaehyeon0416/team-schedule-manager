<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

// ★ v18.38 — 일정 알림(전날 저녁/당일 아침/1시간 전) 발송. 서버 cron에 `php artisan schedule:run`이 매분 등록돼 있어야 동작.
Schedule::command('schedules:send-reminders')->everyFiveMinutes()->withoutOverlapping();

// ★ v18.63 — 30일 넘게 안 쓴 로그인 토큰 정리(이미 로그인 판정에선 막히지만 DB에 쌓이지 않게)
Schedule::call(function () {
    \Illuminate\Support\Facades\DB::table('personal_access_tokens')
        ->whereRaw('COALESCE(last_used_at, created_at) < ?', [now()->subDays(\App\Support\LoginSession::APP_IDLE_DAYS)])
        ->delete();
})->dailyAt('04:30')->name('prune-idle-tokens');

// ★ v18.68 리뷰 반영 — 탈퇴한 회원의 로그인 기록은 3개월만 보관(개인정보 처리방침 3항 · /account-delete 안내와 같게).
//   접속한 날(daily_active_users)은 3개월 지난 줄부터 지우고, 마지막 로그인 시각(users.last_login_at)은 탈퇴 3개월 뒤 비움.
//   지금 회원의 접속 기록은 운영자 통계(AdminStatsController)·문자 대상(30일 미접속)에 쓰여서 그대로 둠
Schedule::call(function () {
    $cutoff = now()->subMonths(3);
    \Illuminate\Support\Facades\DB::table('daily_active_users')
        ->where('date', '<', $cutoff->toDateString())
        ->whereIn('user_id', \App\Models\User::onlyTrashed()->select('id'))
        ->delete();
    \App\Models\User::onlyTrashed()
        ->where('deleted_at', '<', $cutoff)
        ->whereNotNull('last_login_at')
        ->toBase()
        ->update(['last_login_at' => null]);
})->dailyAt('04:40')->name('prune-withdrawn-login-records');

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
