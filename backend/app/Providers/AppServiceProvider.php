<?php

namespace App\Providers;

use App\Models\Schedule;
use App\Observers\ScheduleObserver;
use App\Services\Sms\SmsServiceInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
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

        // ★ v18.63 — 로그인 유지 기간: 마지막 사용 후 앱 30일 / 운영자 웹 12시간(쓸 때마다 연장).
        //   Sanctum은 요청마다 last_used_at을 갱신하므로 "안 쓴 기간"으로 판단. 오래된 토큰은 routes/console.php에서 매일 정리.
        \Laravel\Sanctum\Sanctum::authenticateAccessTokensUsing(function ($token, bool $isValid) {
            if (!$isValid) {
                return false;
            }
            $last = $token->last_used_at ?? $token->created_at;
            $idle = optional($token->tokenable)->user_type === 'operator'
                ? now()->subHours(\App\Support\LoginSession::OPERATOR_IDLE_HOURS)
                : now()->subDays(\App\Support\LoginSession::APP_IDLE_DAYS);
            return $last && $last->gt($idle);
        });

        // ★ v18.35 — PDF(보고서/견적서/세무)에 한글 폰트(맑은고딕 13MB)를 통째로 임베드하다가
        //   PHP 메모리(128M) 초과로 500이 나던 문제 수정. 실제 쓰인 글자만 임베드(서브셋)하도록 함.
        config(['dompdf.options.enable_font_subsetting' => true]);

        // ★ v18.57 — N+1 자동 감지(개발 환경만). 목록을 돌면서 관계를 하나씩 불러오면(지연 로딩)
        //   storage/logs/laravel.log에 "[N+1]" 경고를 남김. 실서버(production)에서는 꺼져 있음.
        //   예외를 던지지 않고 로그만 남겨서 개발 중 화면이 깨지지 않게 함.
        if (!$this->app->isProduction()) {
            Model::preventLazyLoading();
            Model::handleLazyLoadingViolationUsing(function ($model, string $relation) {
                Log::warning('[N+1] ' . $model::class . "::{$relation} 를 하나씩 불러옴 — with('{$relation}') 추가 필요", [
                    'at' => collect(debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 30))
                        ->first(fn($f) => isset($f['file']) && str_contains($f['file'], DIRECTORY_SEPARATOR . 'app' . DIRECTORY_SEPARATOR)
                            && !str_contains($f['file'], 'AppServiceProvider'))['file'] ?? null,
                ]);
            });
        }
    }
}
