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
            'operator' => \App\Http\Middleware\OperatorMiddleware::class, // ★ v18.40 운영자 전용
        ]);

        // ★ v18.13 — 이 프로젝트는 순수 API 서버라 웹 로그인 페이지(named route
        //   'login')가 애초에 없음. 그런데 인증 미들웨어는 Accept: application/json
        //   헤더가 없는 요청(브라우저 주소창 접속, 일부 앱 HTTP 클라이언트 등)에서
        //   기본적으로 route('login')을 호출하려 시도하다가 RouteNotFoundException을
        //   던져서 진짜 원인(401)이 아니라 500으로 응답이 나가던 버그가 있었음.
        //   guest 리다이렉트 자체를 끄면 무조건 AuthenticationException이 던져지고,
        //   그건 아래 withExceptions의 렌더러가 항상 401 JSON으로 처리해줌.
        $middleware->redirectGuestsTo(fn () => null);

        // ★ v18.43 — 일일 접속자 기록(운영자 통계)
        $middleware->api(append: [\App\Http\Middleware\TrackDailyActive::class]);

        // ★ v18.69 — 최소 버전보다 낮은 앱은 426(ERR_APP_001). X-App-Version·X-App-Platform 헤더가 있을 때만 판단(옛 앱은 헤더가 없어 안 막음).
        //   prepend: 인증·라우트 바인딩·접속자 기록보다 먼저 돌아서, 막힐 앱이면 다른 오류(401·404 등)보다 업데이트 안내가 먼저 나감
        $middleware->api(prepend: [\App\Http\Middleware\RequireMinAppVersion::class]);
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

        // ★ v18.36 — PDF 다운로드 서명 링크가 만료됐거나 변조됨 — 403 (캐치올에 걸려 500이 나가던 것 수정)
        $exceptions->render(function (\Illuminate\Routing\Exceptions\InvalidSignatureException $e, $request) {
            // ★ v18.66 — 고객이 브라우저로 연 견적서 링크(3일)가 만료되면 JSON 대신 "링크 만료" 안내 페이지
            if ($request->routeIs('quotes.pdf.signed') && !$request->expectsJson()) {
                return response(view('errors.link-expired', ['what' => '견적서']), 410);
            }
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => '링크가 만료되었거나 올바르지 않습니다. 앱에서 다시 받아주세요.',
                    'error_code' => ErrorCode::AUTH_NO_PERMISSION,
                ], 403);
            }
        });

        // ★ v18.67 — DB 오류 로그에 값(전화번호·이메일·비밀번호 해시 등)이 남지 않게.
        //   QueryException 메시지는 바인딩 값을 채워 넣은 SQL이라, 예전엔 기본 기록 + 아래 [DB] 기록으로 같은 값이 두 번 남았음
        //   (예: "Duplicate entry '010...' ... set `phone` = 010..."). 이제 기본 기록을 끄고(return false)
        //   값 없는 SQL(? 그대로)·SQLSTATE·가린 드라이버 메시지·발생 위치만 한 번 남김.
        $exceptions->report(function (QueryException $e) {
            $driverMessage = (string) ($e->getPrevious()?->getMessage() ?? '');
            // 따옴표 안 값은 가림 — 단, 키·컬럼·테이블 이름은 원인 파악에 필요해서 남김
            //   (글자 바로 뒤 따옴표는 값의 시작이 아님: "doesn't" 같은 영어 문장 속 '를 값으로 잘못 보지 않게)
            $driverMessage = preg_replace("/(?<![A-Za-z0-9])(?<!key |column |table |index |constraint )'[^'\\s][^']*'/i", "'***'", $driverMessage);
            $driverMessage = preg_replace('/\b\d{6,}\b/', '***', (string) $driverMessage); // 따옴표 없는 긴 숫자(전화번호 등)
            $frame = collect($e->getTrace())->first(fn ($f) => isset($f['file']) && str_starts_with($f['file'], app_path().DIRECTORY_SEPARATOR)); // 우리 코드 중 처음 나온 위치
            Log::error('[DB] '.$driverMessage, [
                'sqlstate'   => $e->errorInfo[0] ?? $e->getCode(),
                'driver_code' => $e->errorInfo[1] ?? null,
                'connection' => $e->getConnectionName(),
                'sql'        => $e->getSql(), // 바인딩 값 없이 ? 그대로
                'at'         => $frame ? $frame['file'].':'.($frame['line'] ?? '?') : $e->getFile().':'.$e->getLine(),
                'url'        => request()?->method().' '.request()?->path(),
            ]);
            return false; // 기본 로그(값이 채워진 SQL + 스택)는 남기지 않음
        });

        // DB 쿼리 오류 — 500, 클라이언트에는 SQL/스키마 노출하지 않음
        $exceptions->render(function (QueryException $e, $request) {
            if ($request->is('api/*')) {
                // ★ v18.67 기록은 위 report()에서 한 번만(값 가림)
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
