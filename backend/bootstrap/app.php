<?php

use App\Constants\ErrorCode;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

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

        // ★ v18.13 — 이 프로젝트는 순수 API 서버라 웹 로그인 페이지(named route
        //   'login')가 애초에 없음. 그런데 인증 미들웨어는 Accept: application/json
        //   헤더가 없는 요청(브라우저 주소창 접속, 일부 앱 HTTP 클라이언트 등)에서
        //   기본적으로 route('login')을 호출하려 시도하다가 RouteNotFoundException을
        //   던져서 진짜 원인(401)이 아니라 500으로 응답이 나가던 버그가 있었음.
        //   guest 리다이렉트 자체를 끄면 무조건 AuthenticationException이 던져지고,
        //   그건 아래 withExceptions의 렌더러가 항상 401 JSON으로 처리해줌.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // ═══════════════════════════════════════════════════════════
        // ★ v18.13 — 전역 예외처리기 룰 정리
        //   예전엔 아래 맨 밑의 Throwable 캐치올 하나가 전부(422/404 등도
        //   전부 500 ERR_SERVER_001로 뭉개버림 — $request->validate() 실패까지
        //   500으로 나가던 실제 버그였음). 자주 발생하는 예외 타입별로
        //   먼저 잡아서 정확한 HTTP 상태코드 + error_code를 반환하고,
        //   진짜 예상 못한 에러만 캐치올(500)로 떨어지게 함.
        //   render()는 report()(로그 기록)를 막지 않으므로 기존처럼 로그도 남음.
        // ═══════════════════════════════════════════════════════════

        // 인증 실패 (토큰 없음/만료) — 401
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => '인증이 필요합니다.',
                    'error_code' => ErrorCode::AUTH_TOKEN_INVALID,
                ], 401);
            }
        });

        // 권한 없음 (역할 부족, Gate/Policy 거부) — 403
        $exceptions->render(function (AuthorizationException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage() ?: '권한이 없습니다.',
                    'error_code' => ErrorCode::AUTH_NO_PERMISSION,
                ], 403);
            }
        });

        // 입력값 검증 실패 ($request->validate() 등) — 422, 필드별 에러 포함
        $exceptions->render(function (ValidationException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => '입력값을 확인해주세요.',
                    'error_code' => ErrorCode::VALID_GENERAL,
                    'errors' => $e->errors(),
                ], 422);
            }
        });

        // 존재하지 않는 모델 (findOrFail 등) — 404
        $exceptions->render(function (ModelNotFoundException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => '요청하신 대상을 찾을 수 없습니다.',
                    'error_code' => ErrorCode::RESOURCE_NOT_FOUND,
                ], 404);
            }
        });

        // 존재하지 않는 라우트/URL — 404
        $exceptions->render(function (NotFoundHttpException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => '요청하신 경로를 찾을 수 없습니다.',
                    'error_code' => ErrorCode::ROUTE_NOT_FOUND,
                ], 404);
            }
        });

        // 허용되지 않은 HTTP 메서드 — 405
        $exceptions->render(function (MethodNotAllowedHttpException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => '허용되지 않은 요청 방식입니다.',
                    'error_code' => ErrorCode::METHOD_NOT_ALLOWED,
                ], 405);
            }
        });

        // rate limit(throttle) 초과 — 429
        $exceptions->render(function (TooManyRequestsHttpException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
                    'error_code' => ErrorCode::TOO_MANY_REQUESTS,
                ], 429);
            }
        });

        // DB 쿼리 오류 — 500, 클라이언트에는 SQL/스키마 노출하지 않음
        $exceptions->render(function (QueryException $e, $request) {
            if ($request->is('api/*')) {
                Log::error('[DB] '.$e->getMessage(), ['sql' => $e->getSql() ?? null]);
                return response()->json([
                    'success' => false,
                    'message' => '데이터 처리 중 오류가 발생했습니다.',
                    'error_code' => ErrorCode::SERVER_ERROR,
                ], 500);
            }
        });

        // ★ 그 외 예상 못한 모든 예외 — 캐치올, 500
        //   운영(APP_DEBUG=false)에서는 내부 메시지를 그대로 노출하지 않음(정보 유출 방지).
        //   로컬 개발 중에는 원인 파악이 쉽도록 실제 메시지를 그대로 보여줌.
        $exceptions->render(function (\Throwable $e, $request) {
            if ($request->is('api/*')) {
                Log::error('[Unhandled] '.get_class($e).': '.$e->getMessage(), [
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => config('app.debug')
                        ? $e->getMessage()
                        : '서버 오류가 발생했습니다.',
                    'error_code' => ErrorCode::SERVER_ERROR,
                ], 500);
            }
        });
    })->create();
