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

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
