Team Schedule Manager  |  개발 매뉴얼 v6.2

**Team Schedule Manager**

**개발 매뉴얼 v6.2**

API 라우팅 + 인증 구현

작성일: 2026년 04월  |  최종 수정: 2026-04-22 (v6.2)  |  대상 OS: Windows 10/11

**★ v6.2 변경사항 (2026-04-22)**

- [3장 routes/api.php] 라우트 중복 제거 + 권한 재정리

-        → apiResource('schedules') 두 번 등록 충돌 제거

-        → 조회(GET)는 member+, 변경(POST/PUT/DELETE)은 manager+ 로 명확히 분리

- [4.3절 bootstrap/app.php] withExceptions에 API 예외 JSON 응답 처리 추가

-        → 인증 실패 시 "Route [login] not defined" 500 오류 방지

-        → API 경로(api/*)의 모든 예외를 JSON으로 응답

- [11.1절 axiosInstance.ts] baseURL 끝에 /api 포함, 요청·응답 인터셉터 추가

-        → 모든 요청에 토큰 자동 첨부 + 401 응답 시 자동 로그아웃

- [11.3절 LoginScreen] API 경로에서 /api 제거 (baseURL에 포함되므로)

- [신규 12장] ScheduleController 기본 구조 — 네임스페이스 주의사항

**★ v6.1 변경사항 (2026-04-19)**

- [8장] CORS 설정 — CorsMiddleware 직접 생성 방법

- [11장] axiosInstance.ts, authStore.ts Zustand v5 문법

- [9장] frontend/.env VITE_API_URL 주의사항 (localhost vs 10.0.2.2)

## **전체 매뉴얼 시리즈**

| **버전** | **제목** | **핵심 내용** | **상태** |
| --- | --- | --- | --- |
| v1 | 로컬 개발 환경 세팅 | Laragon, VSCode, Git, Node.js, MySQL Workbench | ✅ 완료 |
| v2 | 프로젝트 폴더 구조 + Laravel 백엔드 설치 | Laravel 12, .env (SESSION_DRIVER=file), Sanctum, ApiResponse | ✅ 완료 |
| v3 | DB 설계 및 마이그레이션 | 8개 테이블, Model, Seeder, SoftDeletes | ✅ 완료 |
| v4 | React 웹 관리자 설치·설정 | React 19 + TypeScript, Ant Design, TanStack Table | ✅ 완료 |
| v5 | React Native 앱 설치·설정 | RN 0.85.1, Paper Provider 래핑, AsyncStorage @1.23.1 | ✅ 완료 |
| v6 ◀ | API 라우팅 + 인증 구현 | routes/api.php, Sanctum, axios 인터셉터, CORS, 예외 처리 | ▶ 현재 |
| v7 | 핵심 기능 API + 캘린더 뷰 | 스케줄 CRUD, 커스텀 Day, 상세 화면 | ✅ 완료 |
| v8 | 배포 및 운영 자동화 | 카페24 배포, Nginx, cron 백업, 모니터링 | ⏳ 예정 |

# **1. 이 문서가 다루는 범위**

- 1. Laravel routes/api.php — API 라우트 구조 설계 (★ v6.2 권한별 분리)

- 2. 회원가입 API (POST /api/auth/register)

- 3. 로그인 API (POST /api/auth/login) — Sanctum 토큰 발급

- 4. 로그아웃 API (POST /api/auth/logout)

- 5. 내 정보 조회 API (GET /api/me)

- 6. 권한 미들웨어 — manager / member 분기

- 7. CORS 설정 — CorsMiddleware 직접 생성

- 8. bootstrap/app.php — 미들웨어 등록 + API 예외 JSON 처리 (★ v6.2)

- 9. React 웹 — 실제 API 로그인 연동

- 10. React Native 앱 — axiosInstance 인터셉터 + 로그인 연동 (★ v6.2)

- 11. Thunder Client로 API 동작 테스트

- 12. ScheduleController 기본 구조 (★ v6.2 신규 — 네임스페이스 주의)

# **2. 인증이란? — 개념 먼저 이해하기**

## **2.1 토큰(Token) 기반 인증이란?**

💡 토큰 인증 비유 — ① 처음 로그인할 때 → 놀이공원 매표소에서 입장권(토큰)을 받음 ② 이후 API 호출할 때 → 입장권을 보여주면 바로 통과 ③ 로그아웃할 때 → 입장권을 반납(삭제)하면 더 이상 사용 불가. 결론: 모바일 앱은 이 토큰을 AsyncStorage에 저장해두고, 매번 API 호출 시 자동으로 제시합니다.

## **2.2 미들웨어(Middleware)란?**

💡 미들웨어 비유 — auth 미들웨어는 "입장권(토큰)이 있나요?"를 검사하고 없으면 401 오류를 반환합니다. role:manager 미들웨어는 "팀장 이상만 입장 가능"을 검사하고 팀원이 시도하면 403 오류를 반환합니다.

## **2.3 axios 인터셉터란? ★ v6.2 추가**

인터셉터(interceptor)는 모든 HTTP 요청/응답을 자동으로 가로채서 공통 작업을 해주는 기능이에요.

💡 인터셉터 비유 — 공항 보안검색대처럼, 모든 비행기에 타기 전 자동으로 검사(요청)하고, 내린 후 자동으로 세관 검사(응답)하는 구조입니다. 매번 개발자가 수동으로 토큰을 붙이지 않아도, 인터셉터가 자동으로 처리해줍니다.

- 요청 인터셉터: 요청이 나가기 전 → 자동으로 토큰을 Authorization 헤더에 추가

- 응답 인터셉터: 응답이 도착한 후 → 401이면 토큰 자동 삭제 + 로그아웃

# **3. Laravel API 라우트 설계 ★ v6.2 전면 재정리**

## **3.1 라우트 설계 원칙**

💡 라우트(Route)란? 라우트는 "이 주소로 요청이 오면 → 이 함수를 실행해라" 라는 교통 안내판입니다. 예: Route::post('/login', [AuthController::class, 'login']) = POST /api/login 요청 시 AuthController의 login 함수 실행.

⚠️ v6.2 주의 — apiResource() 중복 등록 금지! apiResource()는 한 번만 사용하면 5개 라우트(index, store, show, update, destroy)를 동시에 생성하지만, 같은 리소스에 대해 두 번 호출하면 URL 충돌이 발생합니다. 우리 프로젝트는 권한별로 세분화해서 개별 Route::get/post 등으로 명시적으로 분리합니다.

## **3.2 권한 분배 원칙**

모든 라우트를 권한 기준으로 두 그룹으로 나눕니다:

| **그룹** | **권한** | **가능한 작업** |
| --- | --- | --- |
| 조회 그룹 | member+ (모든 로그인 사용자) | GET /schedules, GET /schedules/{id}, GET /sites, GET /sites/{id} |
| 변경 그룹 | manager+ (팀장 이상) | POST, PUT, DELETE /schedules, /sites |
| 개인 데이터 | member+ (본인 것만) | attendances CRUD |
| 팀 관리 | manager+ | teams CRUD |

## **3.3 routes/api.php 최종 코드 ★ v6.2**

<?php

// routes/api.php

use App\Http\Controllers\Api\AuthController;

use App\Http\Controllers\Api\ScheduleController;

use App\Http\Controllers\Api\SiteController;

use App\Http\Controllers\Api\AttendanceController;

use App\Http\Controllers\Api\TeamController;

use App\Http\Controllers\Api\CalculateController;

use App\Http\Controllers\Api\PhotoController;

use Illuminate\Support\Facades\Route;

 

// ═══════════════════════════════════════════════

// ── 공개 라우트 (인증 불필요) ──

// ═══════════════════════════════════════════════

Route::prefix('auth')->group(function () {

    Route::post('/register', [AuthController::class, 'register']);

    Route::post('/login',    [AuthController::class, 'login']);

});

 

// ═══════════════════════════════════════════════

// ── 로그인 필수 라우트 ──

// ═══════════════════════════════════════════════

Route::middleware('auth:sanctum')->group(function () {

 

    // 내 정보 + 로그아웃

    Route::get('/me',           [AuthController::class, 'me']);

    Route::post('/auth/logout', [AuthController::class, 'logout']);

 

    // ═══════════════════════════════════════════

    // ── 조회 (member 이상 모두 가능) ──

    // ═══════════════════════════════════════════

    Route::get('/schedules',       [ScheduleController::class, 'index']);

    Route::get('/schedules/{id}',  [ScheduleController::class, 'show']);

    Route::get('/sites',           [SiteController::class, 'index']);

    Route::get('/sites/{id}',      [SiteController::class, 'show']);

 

    // 근태는 본인 것만 CRUD (member 이상)

    Route::apiResource('attendances', AttendanceController::class);

 

    // 팀 가입

    Route::post('/teams/join',     [TeamController::class, 'join']);

 

    // 평수 계산

    Route::post('calculate/area', [CalculateController::class, 'area']);

 

    // ═══════════════════════════════════════════

    // ── 등록·수정·삭제 (manager 이상) ──

    // ═══════════════════════════════════════════

    Route::middleware('role:manager')->group(function () {

        // 일정 CUD

        Route::post('/schedules',        [ScheduleController::class, 'store']);

        Route::put('/schedules/{id}',    [ScheduleController::class, 'update']);

        Route::delete('/schedules/{id}', [ScheduleController::class, 'destroy']);

 

        // 현장 CUD

        Route::post('/sites',        [SiteController::class, 'store']);

        Route::put('/sites/{id}',    [SiteController::class, 'update']);

        Route::delete('/sites/{id}', [SiteController::class, 'destroy']);

 

        // 팀 관리

        Route::apiResource('teams', TeamController::class)

            ->only(['index', 'show', 'update', 'destroy']);

 

        // 현장 사진 업로드·삭제

        Route::post('schedules/{scheduleId}/photos',              [PhotoController::class, 'store']);

        Route::delete('schedules/{scheduleId}/photos/{photoId}',  [PhotoController::class, 'destroy']);

    });

});

**★ 왜 apiResource 대신 개별 Route로 분리했나? — apiResource는 한 번에 5개 라우트를 만들지만 권한별 세분화가 불가능합니다. ****"****조회는 누구나, 변경은 manager만****"**** 같은 구조는 개별 Route가 필수입니다.**

## **3.4 라우트 등록 확인**

Laragon Terminal에서 등록된 라우트를 확인할 수 있습니다.

cd C:\project\team-schedule\backend

php artisan route:list --path=api/schedules -v

 

# 예상 출력:

GET|HEAD   api/schedules       @index    미들웨어: api, sanctum

POST       api/schedules       @store    미들웨어: api, sanctum, role:manager

GET|HEAD   api/schedules/{id}  @show     미들웨어: api, sanctum

PUT        api/schedules/{id}  @update   미들웨어: api, sanctum, role:manager

DELETE     api/schedules/{id}  @destroy  미들웨어: api, sanctum, role:manager

💡 확인 포인트 — GET /schedules/{id}에 role:manager가 없어야 member도 조회 가능. 만약 role:manager가 붙어 있다면 라우트가 중복 등록된 것입니다.

# **4. 권한 미들웨어 생성**

## **4.1 RoleMiddleware 생성**

cd C:\project\team-schedule\backend

php artisan make:middleware RoleMiddleware

## **4.2 RoleMiddleware.php 코드**

<?php

// app/Http/Middleware/RoleMiddleware.php

namespace App\Http\Middleware;

 

use Closure;

use Illuminate\Http\Request;

use App\Http\Responses\ApiResponse;

 

class RoleMiddleware

{

    public function handle(Request $request, Closure $next, string $role): mixed

    {

        $user = $request->user();

        $hierarchy = ['superadmin' => 1, 'manager' => 2, 'member' => 3];

 

        $userLevel     = $hierarchy[$user->role->name] ?? 99;

        $requiredLevel = $hierarchy[$role]             ?? 99;

 

        if ($userLevel > $requiredLevel) {

            return ApiResponse::error('권한이 없습니다.', 'ERR_AUTH_002', 403);

        }

        return $next($request);

    }

}

## **4.3 bootstrap/app.php — 미들웨어 등록 + ★ v6.2 예외 처리 추가**

⚠️ v6.2 중요 변경 — withExceptions에 API 경로 예외 JSON 처리 추가. 이게 없으면 인증 실패 시 "Route [login] not defined" HTML 에러 페이지가 반환되어 앱에서 파싱 실패합니다.

<?php

// bootstrap/app.php

use Illuminate\Foundation\Application;

use Illuminate\Foundation\Configuration\Exceptions;

use Illuminate\Foundation\Configuration\Middleware;

 

return Application::configure(basePath: dirname(__DIR__))

    ->withRouting(

        web:      __DIR__.'/../routes/web.php',

        api:      __DIR__.'/../routes/api.php',

        commands: __DIR__.'/../routes/console.php',

        health:   '/up',

        apiPrefix: 'api'

    )

    ->withMiddleware(function (Middleware $middleware): void {

        // ★ CORS 미들웨어 — 맨 위에!

        $middleware->prepend(\App\Http\Middleware\CorsMiddleware::class);

 

        // ★ API 라우트는 CSRF 검사 제외 (deprecated 아닌 최신 방식)

        $middleware->preventRequestForgery(except: ['api/*']);

 

        // ★ 권한 미들웨어 별명 등록

        $middleware->alias([

            'role' => \App\Http\Middleware\RoleMiddleware::class,

        ]);

    })

    ->withExceptions(function (Exceptions $exceptions): void {

        // ═══════════════════════════════════════════

        // ★ v6.2 추가 — API 경로 예외 JSON 응답 처리

        // ═══════════════════════════════════════════

 

        // ① 인증 실패 시 401 JSON (리다이렉트 방지)

        $exceptions->render(function (

            \Illuminate\Auth\AuthenticationException $e, $request

        ) {

            if ($request->is('api/*') || $request->expectsJson()) {

                return response()->json([

                    'success'    => false,

                    'message'    => '인증이 필요합니다.',

                    'error_code' => 'ERR_AUTH_003',

                ], 401);

            }

        });

 

        // ② API 경로의 모든 예외 → JSON 응답 (HTML 페이지 방지)

        $exceptions->render(function (\Throwable $e, $request) {

            if ($request->is('api/*')) {

                return response()->json([

                    'success'    => false,

                    'message'    => $e->getMessage() ?: '서버 오류가 발생했습니다.',

                    'error_code' => 'ERR_SERVER_001',

                ], 500);

            }

        });

    })->create();

💡 왜 이 설정이 필요한가? Laravel은 인증 실패 시 기본적으로 login 라우트로 리다이렉트합니다. 하지만 API 전용 프로젝트에는 login 라우트가 없어서 "Route [login] not defined" 500 에러가 발생합니다. withExceptions의 첫 번째 render()로 이걸 막고, 두 번째 render()로 다른 모든 예외도 깔끔한 JSON 응답으로 통일합니다.

# **5. AuthController 생성**

## **5.1 Controller 파일 생성**

cd C:\project\team-schedule\backend

php artisan make:controller Api/AuthController

php artisan make:controller Api/ScheduleController --api

php artisan make:controller Api/SiteController --api

php artisan make:controller Api/AttendanceController --api

php artisan make:controller Api/TeamController --api

💡 --api 옵션: index/store/show/update/destroy 5개 함수를 자동으로 만들어줍니다.

⚠️ ★ v6.2 네임스페이스 주의 — Api 폴더 아래 생성된 컨트롤러는 반드시 namespace App\Http\Controllers\Api; 로 선언되어야 합니다. App\Http\Controllers; (Api 빠짐) 로 되어 있으면 클래스를 못 찾아서 HTML 에러 페이지가 반환됩니다. v7에서 실제 발생한 오류입니다!

## **5.2 AuthController.php 전체 코드**

<?php

// app/Http/Controllers/Api/AuthController.php

namespace App\Http\Controllers\Api;    // ★ Api 빠지면 안 됨!

 

use App\Http\Controllers\Controller;

use App\Http\Responses\ApiResponse;

use App\Models\User;

use Illuminate\Http\Request;

use Illuminate\Support\Facades\Hash;

 

class AuthController extends Controller

{

    // 회원가입 — POST /api/auth/register

    public function register(Request $request)

    {

        $validated = $request->validate([

            'name'     => 'required|string|max:100',

            'email'    => 'required|email|unique:users,email',

            'password' => 'required|min:6|confirmed',

        ]);

 

        $user = User::create([

            'name'     => $validated['name'],

            'email'    => $validated['email'],

            'password' => Hash::make($validated['password']),

            'role_id'  => 3,   // 기본: member

        ]);

 

        return ApiResponse::success($user, '회원가입 완료', 201);

    }

 

    // 로그인 — POST /api/auth/login

    public function login(Request $request)

    {

        $request->validate([

            'email'    => 'required|email',

            'password' => 'required',

        ]);

 

        $user = User::with('role')->where('email', $request->email)->first();

 

        if (!$user || !Hash::check($request->password, $user->password)) {

            return ApiResponse::error(

                '이메일 또는 비밀번호가 틀렸습니다.',

                'ERR_AUTH_001', 401

            );

        }

 

        $token = $user->createToken('auth-token')->plainTextToken;

 

        return ApiResponse::success(

            ['user' => $user, 'token' => $token], '로그인 성공'

        );

    }

 

    // 로그아웃 — POST /api/auth/logout

    public function logout(Request $request)

    {

        $request->user()->currentAccessToken()->delete();

        return ApiResponse::success(null, '로그아웃 되었습니다.');

    }

 

    // 내 정보 조회 — GET /api/me

    public function me(Request $request)

    {

        $user = $request->user()->load('role', 'team');

        return ApiResponse::success($user);

    }

}

# **6. User 모델 관계 설정**

<?php

// app/Models/User.php

namespace App\Models;

 

use Illuminate\Foundation\Auth\User as Authenticatable;

use Illuminate\Notifications\Notifiable;

use Laravel\Sanctum\HasApiTokens;

use Illuminate\Database\Eloquent\SoftDeletes;

 

class User extends Authenticatable

{

    use HasApiTokens, Notifiable, SoftDeletes;

 

    protected $fillable = ['name', 'email', 'password', 'role_id', 'team_id'];

    protected $hidden   = ['password', 'remember_token'];

 

    // belongsTo: "이 User는 하나의 Role에 속한다"

    public function role()

    {

        return $this->belongsTo(Role::class);

    }

 

    // belongsTo: "이 User는 하나의 Team에 속한다"

    public function team()

    {

        return $this->belongsTo(Team::class);

    }

}

# **7. FormRequest — 입력값 검증 클래스 (선택)**

## **7.1 FormRequest 생성**

php artisan make:request Auth/LoginRequest

php artisan make:request Auth/RegisterRequest

💡 FormRequest는 Controller에서 분리된 유효성 검사 클래스입니다. Controller가 복잡해지면 나중에 도입하세요. AuthController에서는 $request->validate()로 간단히 처리해도 됩니다.

# **8. CORS 설정**

## **8.1 CorsMiddleware 생성**

cd C:\project\team-schedule\backend

php artisan make:middleware CorsMiddleware

## **8.2 CorsMiddleware.php 코드**

app/Http/Middleware/CorsMiddleware.php 파일을 아래 내용으로 완전히 교체하세요.

<?php

namespace App\Http\Middleware;

 

use Closure;

use Illuminate\Http\Request;

 

class CorsMiddleware

{

    public function handle(Request $request, Closure $next)

    {

        // OPTIONS 요청 (Preflight) 즉시 허용

        if ($request->getMethod() === 'OPTIONS') {

            return response('', 200)

                ->header('Access-Control-Allow-Origin',  '*')

                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')

                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

        }

 

        $response = $next($request);

 

        return $response

            ->header('Access-Control-Allow-Origin',  '*')

            ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')

            ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

    }

}

💡 Preflight란? 브라우저가 실제 요청 전에 "이 요청 허용해?" 라고 먼저 물어보는 OPTIONS 요청입니다. 이것부터 통과시켜야 실제 요청이 들어옵니다.

## **8.3 서버 재시작**

# 기존 php artisan serve 터미널에서 Ctrl+C로 끄고

cd C:\project\team-schedule\backend

php artisan config:clear

php artisan route:clear

php artisan serve

# **9. React 웹 관리자 — 실제 API 로그인 연동**

## **9.1 frontend/.env 주소 확인**

⚠️ 웹과 앱의 API 주소가 다릅니다! 웹(브라우저): http://localhost:8000 — 일반적인 로컬 주소. 앱(에뮬레이터): http://10.0.2.2:8000 — 에뮬레이터에서 내 PC를 가리키는 특수 주소. frontend/.env 에는 반드시 localhost:8000 을 사용하세요.

# frontend/.env

VITE_API_URL=http://localhost:8000   # ← 웹용 주소

VITE_APP_ENV=development

## **9.2 api/auth.ts 생성**

// frontend/src/api/auth.ts

import axiosInstance from './axiosInstance';

import type { ApiResponse, User } from '../types';

 

export const login = async (email: string, password: string) => {

  const res = await axiosInstance.post<ApiResponse<{ user: User; token: string }>>(

    '/api/auth/login', { email, password }

  );

  return res.data;

};

 

export const logout = async () => {

  const res = await axiosInstance.post<ApiResponse<null>>('/api/auth/logout');

  return res.data;

};

 

export const getMe = async () => {

  const res = await axiosInstance.get<ApiResponse<User>>('/api/me');

  return res.data;

};

# **10. Thunder Client로 API 테스트**

## **10.1 Laravel 서버 실행**

cd C:\project\team-schedule\backend

php artisan serve

# INFO  Server running on [http://127.0.0.1:8000]

## **10.2 테스트 시나리오**

| **테스트** | **Method** | **URL** | **Auth** | **기대 응답** |
| --- | --- | --- | --- | --- |
| 회원가입 | POST | /api/auth/register | 없음 | 201 + user |
| 로그인 | POST | /api/auth/login | 없음 | 200 + token |
| 내 정보 | GET | /api/me | Bearer 토큰 | 200 + user+role+team |
| 권한 테스트 | DELETE | /api/schedules/1 | member 토큰 | 403 ERR_AUTH_002 |
| 일정 상세 | GET | /api/schedules/1 | Bearer 토큰 | 200 + schedule |

# **11. React Native 앱 — axiosInstance 인터셉터 구성 ★ v6.2 전면 재작성**

## **11.1 app/src/api/axiosInstance.ts ★ v6.2 — baseURL + 인터셉터**

⚠️ v6.2 중요 변경 3가지 — ① baseURL 끝에 /api 포함. ② 요청 인터셉터로 토큰 자동 첨부. ③ 응답 인터셉터로 401 자동 처리.

// app/src/api/axiosInstance.ts

import axios from 'axios';

import AsyncStorage from '@react-native-async-storage/async-storage';

 

// ─────────────────────────────────────────

// baseURL 설명:

//   - 10.0.2.2 = Android 에뮬레이터에서 PC localhost를 가리키는 특수 주소

//   - 포트 8000 = php artisan serve 기본 포트

//   - /api = baseURL에 포함 → 각 API 호출 시 /auth/login 처럼 짧게 쓰면 됨

//

//   ★ 만약 baseURL에 /api가 없으면:

//     → axiosInstance.post('/api/auth/login') 으로 매번 /api 써야 함

//     → 실수할 확률 높음 → 404 에러

// ─────────────────────────────────────────

const axiosInstance = axios.create({

  baseURL: 'http://10.0.2.2:8000/api',   // ★ /api 포함!

  timeout: 10000,

  headers: {

    'Content-Type': 'application/json',

    'Accept':       'application/json',

  },

});

 

// ═══════════════════════════════════════════════

// ── 요청 인터셉터 — 모든 요청에 토큰 자동 첨부 ──

// ═══════════════════════════════════════════════

axiosInstance.interceptors.request.use(

  async (config) => {

    // AsyncStorage에서 토큰 꺼내기

    const token = await AsyncStorage.getItem('token');

    if (token) {

      config.headers.Authorization = `Bearer ${token}`;

    }

    return config;

  },

  (error) => Promise.reject(error),

);

 

// ═══════════════════════════════════════════════

// ── 응답 인터셉터 — 401 오류 시 자동 로그아웃 ──

// ═══════════════════════════════════════════════

axiosInstance.interceptors.response.use(

  (response) => response,

  async (error) => {

    if (error.response?.status === 401) {

      // 토큰 만료/무효 → AsyncStorage에서 토큰 삭제

      await AsyncStorage.removeItem('token');

      // ※ zustand authStore 상태는 여기서 직접 건드리지 않음

      //   (순환 import 방지 — authStore에서 axiosInstance 사용 가능성 때문)

    }

    return Promise.reject(error);

  },

);

 

export default axiosInstance;

**★ 인터셉터의 이점 — ① 모든 API 호출에 매번 Authorization 헤더 수동 추가 불필요. ② 토큰 만료 시 앱 전체가 자동으로 로그인 화면으로 이동. ③ 코드 한 번 작성으로 앱 전체에 적용됨.**

## **11.2 app/src/store/authStore.ts (Zustand v5 문법)**

⚠️ Zustand v5 주의 — create<T>()( ... ) 괄호 두 번! create<T>( 로 쓰면 TypeScript 오류 발생.

// app/src/store/authStore.ts

import { create } from 'zustand';

import AsyncStorage from '@react-native-async-storage/async-storage';

 

interface User {

  id: number; name: string; email: string; role_id: number;

  role?: { id: number; name: string };

  team?: { id: number; name: string };

}

 

interface AuthState {

  user:       User | null;

  token:      string | null;

  isLoggedIn: boolean;

  setAuth:    (user: User, token: string) => Promise<void>;

  logout:     () => Promise<void>;

}

 

// ★ Zustand v5: create<T>()( ... ) — 괄호 두 번!

export const useAuthStore = create<AuthState>()((set) => ({

  user: null, token: null, isLoggedIn: false,

 

  setAuth: async (user, token) => {

    await AsyncStorage.setItem('token', token);

    set({ user, token, isLoggedIn: true });

  },

 

  logout: async () => {

    await AsyncStorage.removeItem('token');

    set({ user: null, token: null, isLoggedIn: false });

  },

}));

## **11.3 app/src/screens/LoginScreen.tsx ★ v6.2 — /api 제거**

⚠️ v6.2 주의 — baseURL에 이미 /api가 포함되므로, API 호출 경로에서 /api 제거! /api/auth/login → /auth/login

// app/src/screens/LoginScreen.tsx

import React, { useState } from 'react';

import { View, StyleSheet, Alert } from 'react-native';

import { TextInput, Button, Text } from 'react-native-paper';

import { useAuthStore } from '../store/authStore';

import axiosInstance from '../api/axiosInstance';

 

export default function LoginScreen() {

  const { setAuth }  = useAuthStore();

  const [email,    setEmail]    = useState('');

  const [password, setPassword] = useState('');

  const [loading,  setLoading]  = useState(false);

 

  const handleLogin = async () => {

    setLoading(true);

    try {

      // ★ v6.2: /api 제거 (baseURL에 이미 포함)

      const res = await axiosInstance.post('/auth/login', { email, password });

 

      if (res.data.success) {

        await setAuth(res.data.data.user, res.data.data.token);

      }

    } catch (e: any) {

      Alert.alert('오류', e?.response?.data?.message || '로그인 실패');

    } finally {

      setLoading(false);

    }

  };

 

  return (

    <View style={styles.container}>

      <Text variant="headlineMedium" style={styles.title}>Team Schedule</Text>

      <TextInput label="이메일" value={email} onChangeText={setEmail}

        keyboardType="email-address" autoCapitalize="none" style={styles.input} />

      <TextInput label="비밀번호" value={password} onChangeText={setPassword}

        secureTextEntry style={styles.input} />

      <Button mode="contained" onPress={handleLogin} loading={loading}

        style={styles.btn}>로그인</Button>

    </View>

  );

}

 

const styles = StyleSheet.create({

  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5f5f5' },

  title: { textAlign: 'center', marginBottom: 32, color: '#1F3864', fontWeight: 'bold' },

  input: { marginBottom: 12, backgroundColor: 'white' },

  btn: { marginTop: 8, paddingVertical: 4 },

});

# **12. ScheduleController 기본 구조 ★ v6.2 신규**

**★ 이 장이 신설된 이유 — v7에서 ScheduleController의 namespace 실수로 ****"****클래스를 못 찾음****"**** 오류가 발생했습니다. 컨트롤러 생성 시 주의사항을 v6에 미리 정리해서 재발을 방지합니다.**

## **12.1 Controller 네임스페이스 규칙 ★ 가장 중요**

⚠️ Laravel PSR-4 자동 로딩 규칙 — 파일 위치가 폴더 경로와 네임스페이스가 정확히 일치해야 합니다. 틀리면 런타임에 "Undefined type" 오류 → HTML 에러 페이지 반환 → 앱에서 JSON 파싱 실패.

| **항목** | **올바른 예** | **잘못된 예 (실제 발생 오류)** |
| --- | --- | --- |
| 파일 위치 | app/Http/Controllers/Api/ScheduleController.php | — |
| 네임스페이스 | namespace App\Http\Controllers\Api; | namespace App\Http\Controllers; (Api 빠짐!) |
| 결과 | 정상 동작 | Undefined type 오류 → HTML 반환 |

## **12.2 ScheduleController 기본 뼈대**

v7에서 실제 기능을 구현하기 전, 뼈대만 먼저 만들어두면 좋습니다.

<?php

// app/Http/Controllers/Api/ScheduleController.php

namespace App\Http\Controllers\Api;   // ★ Api 필수!

 

use App\Http\Controllers\Controller;

use App\Models\Schedule;

use App\Http\Responses\ApiResponse;

use Illuminate\Http\Request;

 

class ScheduleController extends Controller

{

    public function index(Request $request)

    {

        // v7에서 구현

        return ApiResponse::success([], '일정 목록');

    }

 

    public function show(Request $request, string $id)

    {

        // v7에서 구현

        return ApiResponse::success(null, '일정 상세');

    }

 

    public function store(Request $request) { /* v7 */ }

    public function update(Request $request, string $id) { /* v7 */ }

    public function destroy(Request $request, string $id) { /* v7 */ }

}

💡 SiteController, AttendanceController, TeamController, CalculateController, PhotoController도 같은 패턴으로 만들어둡니다. 실제 내용은 v7에서 채웁니다.

## **12.3 Schedule 모델 관계 설정 (v7 대비)**

Schedule 모델에 users(belongsToMany), site(belongsTo), team(belongsTo) 관계를 미리 정의해둡니다.

<?php

// app/Models/Schedule.php

namespace App\Models;

 

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\SoftDeletes;

 

class Schedule extends Model

{

    use SoftDeletes;

 

    protected $fillable = [

        'date', 'district', 'work_type', 'area_m2', 'memo',

        'team_id', 'site_id', 'status',

    ];

 

    // 다대다: 하나의 일정에 여러 팀원 배정 (schedule_users 테이블 경유)

    public function users()

    {

        return $this->belongsToMany(User::class, 'schedule_users')

                    ->withTimestamps();

    }

 

    // 하나의 일정은 하나의 현장에 속함

    public function site()

    {

        return $this->belongsTo(Site::class);

    }

 

    // 하나의 일정은 하나의 팀에 속함

    public function team()

    {

        return $this->belongsTo(Team::class);

    }

}

💡 belongsToMany 관계명은 복수형(users)이 관례입니다. v7 개발 중 assignedUsers → users로 통일했습니다.

# **13. Git 커밋**

cd C:\project\team-schedule

git add .

git commit -m "feat: API 라우팅 + 인증 구현 (Sanctum, 권한, CORS, 인터셉터, 예외 처리)"

git push origin main

# **14. 설치 완료 최종 점검 체크리스트**

| **항목** | **확인 방법** | **비고** |
| --- | --- | --- |
| RoleMiddleware 생성 + 등록 | bootstrap/app.php에 'role' alias 확인 |  |
| CorsMiddleware 생성 + 등록 | bootstrap/app.php에 prepend(CorsMiddleware) |  |
| routes/api.php 라우트 재정리 ★ | php artisan route:list로 중복 없는지 확인 | v6.2 변경 |
| withExceptions API 예외 처리 ★ | bootstrap/app.php에 render() 2개 등록 | v6.2 추가 |
| AuthController 4개 함수 | register/login/logout/me |  |
| 네임스페이스 확인 ★ | namespace App\Http\Controllers\Api; | v6.2 강조 |
| User 모델 관계 | role(), team() |  |
| Schedule 모델 관계 ★ | users(), site(), team() | v6.2 추가 |
| 회원가입 API 테스트 | Thunder Client → 201 |  |
| 로그인 API 테스트 | Thunder Client → 토큰 반환 |  |
| 내 정보 API 테스트 | Thunder Client → user+role+team |  |
| 권한 테스트 | 팀원 토큰으로 팀장 API → 403 |  |
| 인증 실패 JSON 응답 확인 ★ | 토큰 없이 호출 → 401 JSON (HTML 아님) | v6.2 확인 |
| React 웹 실제 API 로그인 | localhost:3000에서 로그인 성공 |  |
| axiosInstance baseURL /api 포함 ★ | http://10.0.2.2:8000/api | v6.2 변경 |
| axios 요청 인터셉터 ★ | 토큰 자동 첨부 동작 확인 | v6.2 신규 |
| axios 응답 인터셉터 ★ | 401 시 토큰 자동 삭제 확인 | v6.2 신규 |
| authStore Zustand v5 문법 | create<AuthState>()((set) => ...) |  |
| RN 앱 로그인 API 연동 | 에뮬레이터에서 실제 로그인 성공 |  |
| GitHub Push 완료 | github.com에서 커밋 확인 |  |

# **15. 다음 단계 안내 (v7 예고)**

| **v7에서 할 일** | **목적** |
| --- | --- |
| ScheduleController 완성 (index, show, store, update, destroy) | 일정 CRUD + 팀원 배정 (belongsToMany attach/sync) |
| CalendarScreen 커스텀 Day 컴포넌트 | 작업자·현장 표시, dot 마커, +N 더보기 |
| 캘린더 툴바 | 오늘 버튼, 화살표, 범례, 스와이프 |
| ScheduleDetailScreen 화면 | 일정 상세 + 사진 업로드 |
| AppNavigator에 ScheduleDetail 등록 | 네비게이션 구조 확장 |
| Site, Attendance CRUD | 현장·근태 기능 완성 |

— v6 API 라우팅 + 인증 구현 완료 —

다음: 개발 매뉴얼 v7 — 핵심 기능 API + 캘린더 뷰

# **변경 이력**

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| v6.0 | 2026-04-19 | 최초 작성 — API 라우팅 + 인증 구현 |
| v6.1 | 2026-04-19 | CorsMiddleware 신규 / preventRequestForgery / axiosInstance 누락 파일 추가 / Zustand v5 문법 수정 / frontend/.env 주소 주의사항 |
| v6.2 | 2026-04-22 | [3장] routes/api.php 라우트 중복 제거 + 권한별 재정리 (조회 member+, 변경 manager+) / [4.3절] withExceptions에 API 예외 JSON 처리 (인증 실패 500 오류 방지) / [11.1절] axiosInstance baseURL에 /api 포함 + 요청/응답 인터셉터 추가 (토큰 자동 첨부, 401 자동 로그아웃) / [11.3절] LoginScreen API 경로에서 /api 제거 / [12장 신규] ScheduleController 네임스페이스 주의사항 (Api 폴더 경로 일치 필수) + Schedule 모델 관계 설정 |

© 2026 Team Schedule Manager

-  -