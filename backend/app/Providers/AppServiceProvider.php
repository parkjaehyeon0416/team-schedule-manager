<?php

namespace App\Providers;

use App\Models\Schedule;
use App\Observers\ScheduleObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Schedule 모델에 ScheduleObserver를 붙임
        // → Schedule이 saved/deleted/restored 될 때 Observer의 메서드가 자동 호출
        Schedule::observe(ScheduleObserver::class);
    }
}
