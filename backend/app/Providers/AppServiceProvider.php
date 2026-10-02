<?php

namespace App\Providers;

use App\Models\Schedule;
use App\Observers\ScheduleObserver;
use App\Services\Sms\SmsServiceInterface;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // ★ SMS 발송 드라이버 바인딩 — config/sms.php의 driver 설정에 따라 구현체 결정.
        //   지금은 'log' 드라이버뿐이라 실제 발송 없이 로그에만 남음.
        $this->app->bind(SmsServiceInterface::class, function () {
            $driver = config('sms.driver');
            $class  = config("sms.drivers.{$driver}");

            return new $class();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Schedule 모델에 ScheduleObserver를 붙임
        // → Schedule이 saved/deleted/restored 될 때 Observer의 메서드가 자동 호출
        Schedule::observe(ScheduleObserver::class);

        // ★ v18.35 — PDF(보고서/견적서/세무)에 한글 폰트(맑은고딕 13MB)를 통째로 임베드하다가
        //   PHP 메모리(128M) 초과로 500이 나던 문제 수정. 실제 쓰인 글자만 임베드(서브셋)하도록 함.
        config(['dompdf.options.enable_font_subsetting' => true]);
    }
}
