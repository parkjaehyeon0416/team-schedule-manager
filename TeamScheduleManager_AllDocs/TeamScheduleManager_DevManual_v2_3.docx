Team Schedule Manager  |  개발 매뉴얼 v2.3

**Team Schedule Manager**

**개발 매뉴얼 v2.3**

프로젝트 폴더 구조 + Laravel 백엔드 설치

작성일: 2026년 04월  |  최종 수정: 2026-04-22 (v2.3)  |  대상 OS: Windows 10/11

**★ v2.3 변경사항 (2026-04-22)**

- [5.2절] .env 설정에 SESSION_DRIVER=file 추가

-        → Laravel 12 기본값이 database이므로 sessions 테이블 미존재 시 500 에러 발생

-        → 우리는 Sanctum 토큰 방식이므로 file로 설정 (세션 DB 불필요)

**★ v2.2 변경사항**

- [전체 매뉴얼 시리즈 표] v7, v8 항목 추가

**★ v2.1 변경사항**

- [6장] DB 클라이언트: TablePlus → MySQL Workbench

- [12장] 체크리스트 확인 방법 MySQL Workbench 기준으로 수정

# **0. 이 문서를 읽기 전에 — 전체 매뉴얼 시리즈 안내**

| **버전** | **제목** | **핵심 내용** | **상태** |
| --- | --- | --- | --- |
| v1 | 로컬 개발 환경 세팅 | Laragon, VSCode, Git, Node.js, MySQL Workbench, Composer | ✅ 완료 |
| v2 ◀ | 프로젝트 폴더 구조 + Laravel 백엔드 설치 | 폴더 구조, Laravel 12 설치, .env, Sanctum, DB 연결, ApiResponse | ▶ 현재 |
| v3 | DB 설계 및 마이그레이션 | 기획서 v1.4 테이블 생성, Model 생성, Seeder | ⏳ 예정 |
| v4 | React 웹 관리자 설치·설정 | React 19 + TypeScript, Ant Design, FullCalendar, TanStack Table | ⏳ 예정 |
| v5 | React Native 앱 설치·설정 | RN 0.85, Android 에뮬레이터, RN Paper, React Navigation | ⏳ 예정 |
| v6 | API 라우팅 + 인증 구현 | routes/api.php, Sanctum 토큰, 권한 미들웨어 | ⏳ 예정 |
| v7 | 핵심 기능 API 개발 | 스케줄·현장·근태 CRUD API, 파일 업로드, 집계 통계 | ⏳ 예정 |
| v8 | 배포 및 운영 자동화 | 카페24 배포, Nginx, cron 백업, 모니터링 | ⏳ 예정 |

# **1. 이 문서가 다루는 범위**

- 1. GitHub 저장소 생성 + 프로젝트 폴더 구조 설계

- 2. Laravel 12 프로젝트 생성 (backend 폴더)

- 3. .env 파일 설정 (DB 연결 정보 + ★ SESSION_DRIVER)

- 4. MySQL 데이터베이스 생성

- 5. Laravel Sanctum 설치 및 설정

- 6. ApiResponse 공통 응답 클래스 생성

- 7. Git 최초 커밋 + Push / 다른 컴퓨터에서 Pull

- 8. 기본 동작 테스트

# **2. 프로젝트 폴더 구조 설계**

## **2.1 최종 폴더 구조**

C:\project\team-schedule 아래에 아래처럼 폴더를 나눕니다.

C:\project\team-schedule\

├── backend\          ← Laravel 12 API 서버 (PHP)

├── frontend\         ← React 웹 관리자 (v4에서 생성)

├── app\              ← React Native 앱 (v5에서 생성)

└── .gitignore        ← Git 제외 파일 목록

💡 왜 이렇게 나누나요? 백엔드(Laravel)와 프론트엔드(React, React Native)를 폴더로 명확히 분리하면 나중에 각각 독립적으로 관리하기 쉬워요. 마치 주방(백엔드)과 홀(프론트엔드)을 구분하는 것처럼요.

## **2.2 폴더 생성**

Laragon Terminal 또는 VSCode 터미널에서 아래 명령어를 실행하세요.

cd C:\project\team-schedule

mkdir frontend

mkdir app

# **3. GitHub 저장소 연결**

## **3.1 GitHub란?**

GitHub는 코드를 인터넷에 백업해두는 서비스예요.

💡 Git: 내 컴퓨터에서 코드 변경 이력을 기록하는 도구 / GitHub: 그 일기장을 인터넷에 올려두는 서비스

## **3.2 GitHub 저장소 생성**

- github.com 접속 후 로그인

- 오른쪽 상단 + 버튼 → New repository 클릭

- Repository name: team-schedule-manager 입력

- Private 선택 (소스코드 비공개)

- Create repository 클릭

## **3.3 로컬 폴더와 GitHub 연결**

cd C:\project\team-schedule

git init

git remote add origin https://github.com/본인계정/team-schedule-manager.git

git remote -v

# **4. Laravel 12 설치**

## **4.1 Laravel 설치 명령어**

cd C:\project\team-schedule

composer create-project laravel/laravel backend

cd backend

💡 설치 중 Would you like to run the default database migrations? → no 입력 후 Enter

## **4.2 설치 확인**

php artisan --version

# 출력 예시: Laravel Framework 12.x.x

# **5. .env 파일 설정**

## **5.1 .env 파일이란?**

.env 파일은 DB 비밀번호, 앱 이름 등 '환경마다 달라지는 설정값'을 저장하는 파일이에요. 보안상 이유로 절대 GitHub에 올리면 안 됩니다.

💡 .env: 실제 비밀번호가 담긴 파일 / .env.example: 어떤 항목들이 필요한지 보여주는 샘플 파일

## **5.2 .env 수정 내용  ★ v2.3 수정**

**★ v2.3 변경 — SESSION_DRIVER=file 추가 필수**

Laravel 12부터 세션 기본 저장 방식이 database로 바뀌었어요. 그런데 우리는 sessions 테이블을 만든 적이 없어서(Sanctum 토큰 방식 사용), 그대로 두면 아래와 같은 500 에러가 발생합니다.

⚠️ Base table or view not found: 1146 Table 'team_schedule.sessions' doesn't exist

따라서 .env에 SESSION_DRIVER=file 한 줄을 반드시 추가해야 합니다.

완성된 .env 내용:

APP_NAME=TeamScheduleManager

APP_ENV=local

APP_DEBUG=true

APP_URL=http://localhost:8000

# ★ v2.3 추가 — Laravel 12 대응

SESSION_DRIVER=file

DB_CONNECTION=mysql

DB_HOST=127.0.0.1

DB_PORT=3308          # XAMPP 공존 시 3307 / Laragon 단독이면 3306

DB_DATABASE=team_schedule

DB_USERNAME=root

DB_PASSWORD=          # Laragon 기본값은 비밀번호 없음

💡 왜 file 방식을 쓰나요? 우리는 모바일 앱 인증에 Sanctum 토큰 방식을 사용해요. 세션 저장소는 Laravel이 내부적으로만 가끔 쓰는데, file 방식이 가장 가볍고 설정이 필요 없습니다. database 방식으로 바꾸려면 별도로 sessions 테이블을 만들어야 하는데 불필요한 작업이에요.

## **5.3 .env 수정 후 캐시 비우기  ★ v2.3 추가**

⚠️ .env를 수정했다면 반드시 설정 캐시를 비워야 변경이 적용됩니다!

Laragon Terminal에서:

cd C:\project\team-schedule\backend

php artisan config:clear

# 출력: INFO  Configuration cache cleared successfully.

💡 config:clear가 필요한 이유 — Laravel은 성능을 위해 .env 내용을 메모리에 캐시해둡니다. 그래서 .env를 고쳐도 캐시를 비우지 않으면 옛날 값을 계속 사용해요. 마치 메모장을 고쳐놓고 출력은 예전 버전을 쓰는 것과 같습니다.

# **6. MySQL 데이터베이스 생성**

MySQL Workbench를 열고 MySQL에 연결한 후, 아래 SQL을 실행해서 데이터베이스를 만드세요.

CREATE DATABASE team_schedule

  CHARACTER SET utf8mb4

  COLLATE utf8mb4_unicode_ci;

**★ MySQL Workbench에서 SQL 실행 방법**

- 상단 메뉴 Query → Execute Current Statement

- 단축키: Ctrl+Enter

- 위 코드 붙여넣기 → 실행 클릭 → 좌측 SCHEMAS 목록에 team_schedule DB가 생기면 성공!

# **7. Laravel Sanctum 설치 및 설정**

## **7.1 Sanctum이란?**

Sanctum은 모바일 앱에서 로그인할 때 사용하는 토큰(열쇠) 기반 인증 시스템이에요.

💡 마치 놀이공원 입장권처럼, 처음 로그인할 때 토큰(입장권)을 받아요. 이후에는 토큰만 보여주면 인증이 됩니다.

## **7.2 Sanctum 설치**

cd C:\project\team-schedule\backend

php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

## **7.3 API 전용 모드 설정**

# routes/api.php 파일이 생성됐는지 확인

# 없으면 아래 명령어로 생성

php artisan install:api

# **8. ApiResponse 공통 응답 클래스 생성**

## **8.1 왜 만드나요?**

기획서 12.3에서 API 응답 포맷을 { success, data, message } 구조로 확정했어요. 매 API마다 직접 이 구조를 만들면 번거롭고 실수가 생길 수 있어서 공통 클래스를 만듭니다.

## **8.2 파일 생성**

mkdir backend\app\Http\Responses

# 파일 경로: backend/app/Http/Responses/ApiResponse.php

## **8.3 ApiResponse.php 코드**

<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;

class ApiResponse {

    public static function success(mixed $data = null, string $message = '', int $status = 200): JsonResponse {

        return response()->json([

            'success' => true, 'message' => $message, 'data' => $data

        ], $status);

    }

    public static function error(string $message = '오류가 발생했습니다.', string $error_code = '', int $status = 400): JsonResponse {

        return response()->json([

            'success' => false, 'message' => $message, 'error_code' => $error_code

        ], $status);

    }

}

## **8.4 실제 사용 예시**

return ApiResponse::success($user);

return ApiResponse::success($schedules, '일정 조회 성공');

return ApiResponse::error('이메일 또는 비밀번호가 틀렸습니다.', 'ERR_AUTH_001', 401);

## **8.5 에러코드 목록**

| **에러코드** | **HTTP 상태코드** | **상황** |
| --- | --- | --- |
| ERR_AUTH_001 | 401 | 이메일 또는 비밀번호 불일치 |
| ERR_AUTH_002 | 403 | 권한 없음 (팀장 기능을 팀원이 시도) |
| ERR_AUTH_003 | 401 | 토큰 만료 또는 유효하지 않은 토큰 |
| ERR_VALID_001 | 422 | 입력값 유효성 검사 실패 |
| ERR_NOT_FOUND | 404 | 요청한 데이터가 존재하지 않음 |
| ERR_SERVER | 500 | 서버 내부 오류 (예상치 못한 오류) |

# **9. 타임존 설정 — Asia/Seoul 적용**

## **9.1 왜 설정해야 하나요?**

Laravel은 기본적으로 UTC(세계 표준시) 기준으로 동작해요. 그대로 쓰면 출퇴근 시간이 한국 시간과 9시간 차이가 납니다.

기획서 12.2절에서 'Asia/Seoul KST 직접 저장'으로 확정했으니 반드시 변경해야 합니다.

## **9.2 config/app.php 수정**

# 수정 전: 'timezone' => env('APP_TIMEZONE', 'UTC'),

# 수정 후: 'timezone' => env('APP_TIMEZONE', 'Asia/Seoul'),

## **9.3 설정 확인**

php artisan tinker

>>> now()

# 출력 예시: date: 2026-04-22 09:00:00.0 Asia/Seoul (+09:00)  ← 성공!

# **10. Git 커밋 · Push · Pull**

## **10.1 최초 Push**

cd C:\project\team-schedule

git add .

git commit -m "feat: 프로젝트 초기 설정 및 Laravel 12 설치"

git branch -M main

git push -u origin main

## **10.2 일반적인 작업 흐름**

git checkout -b feature/login   # 새 기능 브랜치 생성

git add .

git commit -m "feat: 로그인 API 구현"

git push origin feature/login

## **10.3 커밋 메시지 작성 규칙**

| **prefix** | **의미** | **예시** |
| --- | --- | --- |
| feat: | 새 기능 추가 | feat: 로그인 API 구현 |
| fix: | 버그 수정 | fix: 토큰 만료 오류 수정 |
| chore: | 설정, 환경 변경 | chore: .env 설정 업데이트 |
| docs: | 문서 수정 | docs: README 업데이트 |
| refactor: | 코드 구조 개선 | refactor: ApiResponse 클래스 분리 |

## **10.4 다른 컴퓨터에서 Pull**

시나리오 A — 처음 사용하는 컴퓨터 (최초 1회)

cd C:\project

git clone https://github.com/본인계정/team-schedule-manager.git team-schedule

cd team-schedule\backend

composer install

copy .env.example .env

php artisan key:generate

시나리오 B — 이미 있는 컴퓨터에서 최신 코드 받기 (매번)

cd C:\project\team-schedule

git pull origin main

cd backend

composer install

# **11. 기본 동작 테스트**

## **11.1 Laravel 서버 실행**

cd C:\project\team-schedule\backend

php artisan serve

# INFO  Server running on [http://127.0.0.1:8000].

💡 php artisan serve는 기본적으로 포트 8000으로 실행됩니다. Laragon Apache(8080)와는 다른 서버예요.

## **11.2 테스트용 API 라우트 추가**

use App\Http\Responses\ApiResponse;

Route::get('/test', function () {

    return ApiResponse::success([

        'version' => '1.0', 'status' => 'running'

    ], 'API 서버 정상 동작 중');

});

브라우저에서 http://localhost:8000/api/test 접속 시 아래처럼 나오면 완료!

{ "success": true, "message": "API 서버 정상 동작 중", "data": { "version": "1.0", "status": "running" } }

# **12. 설치 완료 최종 점검 체크리스트**

| **항목** | **확인 방법** | **상태** |
| --- | --- | --- |
| backend 폴더에 Laravel 설치됨 | php artisan --version → Laravel 12.x.x | [ ] |
| .env 파일 DB 정보 수정 완료 | backend/.env 파일에 DB_DATABASE=team_schedule 확인 | [ ] |
| .env 파일 SESSION_DRIVER=file 추가 ★ | backend/.env에 해당 라인 존재 확인 | [ ] |
| config:clear 실행 완료 ★ | .env 수정 후 반드시 캐시 비우기 | [ ] |
| team_schedule DB 생성됨 | MySQL Workbench에서 team_schedule DB 목록 확인 | [ ] |
| ApiResponse 클래스 생성됨 | backend/app/Http/Responses/ApiResponse.php 존재 | [ ] |
| GitHub Push 완료 | github.com 저장소에서 파일 목록 확인 | [ ] |
| API 테스트 응답 확인 | http://localhost:8000/api/test → success: true 응답 | [ ] |

# **13. 다음 단계 안내 (v3 예고)**

| **v3에서 할 일** | **목적** |
| --- | --- |
| users, teams 테이블 마이그레이션 | 기획서 7장 DB 설계 실제 구현 |
| roles 테이블 설계 (슈퍼관리자/팀장/팀원) | 기획서 12.2 권한 구조 확정 내용 반영 |
| schedules, sites, attendances 테이블 | 핵심 비즈니스 데이터 구조 완성 |
| Seeder로 테스트 데이터 생성 | 개발 중 실제 데이터로 API 테스트 가능 |

— v2 프로젝트 폴더 구조 + Laravel 백엔드 설치 완료 —

다음: 개발 매뉴얼 v3 — DB 설계 및 마이그레이션

# **변경 이력**

| **버전** | **날짜** | **작성자** | **변경 내용** |
| --- | --- | --- | --- |
| v2.0 | 2026-04 | — | 최초 작성 — 프로젝트 폴더 구조 + Laravel 백엔드 설치 가이드 |
| v2.1 | 2026-04-19 | — | [6장] DB 클라이언트 변경 TablePlus → MySQL Workbench / SQL 실행 방법 수정 / [12장] 체크리스트 방법 수정 |
| v2.2 | 2026-04-19 | — | [전체 매뉴얼 시리즈 표] v7, v8 항목 추가 — v1.1~v3.1 전 문서 통일 |
| v2.3 | 2026-04-22 | — | [5.2절] .env에 SESSION_DRIVER=file 추가 (Laravel 12 대응, sessions 테이블 미존재 시 500 에러 방지) / [5.3절] config:clear 실행 절차 신규 추가 / [11장] 포트번호 8080 → 8000 수정 / [12장] 체크리스트 2개 항목 추가 |

© 2026 Team Schedule Manager

-  -