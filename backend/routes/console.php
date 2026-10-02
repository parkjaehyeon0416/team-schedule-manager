<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

// ★ v18.38 — 일정 알림(전날 저녁/당일 아침/1시간 전) 발송. 서버 cron에 `php artisan schedule:run`이 매분 등록돼 있어야 동작.
Schedule::command('schedules:send-reminders')->everyFiveMinutes()->withoutOverlapping();

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
