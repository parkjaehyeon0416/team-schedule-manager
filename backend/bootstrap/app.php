<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api'
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // ★ CORS — 맨 위에 있어야 해요!
        $middleware->prepend(\App\Http\Middleware\CorsMiddleware::class);

        $middleware->preventRequestForgery(except: ['api/*']);

        // ★ 아래 한 줄 추가
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // ★ 추가 — API 경로에서 인증 실패 시 401 JSON 반환 (리다이렉트 방지)
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => '인증이 필요합니다.',
                    'error_code' => 'ERR_AUTH_003',
                ], 401);
            }
        });

        // ★ API 경로에서 모든 예외 → JSON 반환 (HTML 페이지 방지)
        $exceptions->render(function (\Throwable $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage() ?: '서버 오류가 발생했습니다.',
                    'error_code' => 'ERR_SERVER_001',
                ], 500);
            }
        });
    })->create();
