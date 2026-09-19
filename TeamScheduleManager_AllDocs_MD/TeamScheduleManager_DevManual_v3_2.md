Team Schedule Manager  |  개발 매뉴얼 v3.2  |  DB 설계 및 마이그레이션

# **Team Schedule Manager**

**개발 매뉴얼 v3.2**

DB 설계 및 마이그레이션

작성일: 2026년 04월  |  최종 수정: 2026-04-19 (v3.2)  |  기획서 v1.4 기준

★ v3.2 변경사항
[전체 매뉴얼 시리즈 표]  v7(핵심 기능 API 개발), v8(배포 및 운영 자동화) 항목 추가
— 개발 매뉴얼 v1.1 · v2.1 · v3.1 세 파일의 전체 시리즈 표가 서로 달라서 v1.1 기준 8개 항목으로 통일

★ v3.1 변경사항
[4장] DB 확인 도구: TablePlus → MySQL Workbench 로 변경 반영
  - STEP 3 확인 방법: Structure 탭 → Columns 탭 (MySQL Workbench 기준)
[7장] 최종 점검 체크리스트 전체 확인 방법 MySQL Workbench 기준으로 수정

★ v3 업데이트 내용
1. schedule_users 테이블 — softDeletes() 추가 (팀원 배정 복구 가능)
2. site_files 테이블 — softDeletes() 추가 (현장 파일 복구 가능)
3. 이미 만들어진 테이블에 Soft Delete 추가하는 방법 수록 (4장)

# **전체 매뉴얼 시리즈**

| **버전** | **제목** | **핵심 내용** | **상태** |
| --- | --- | --- | --- |
| v1 | 로컬 개발 환경 세팅 | Laragon, VSCode, Git, Node.js, MySQL Workbench, Composer | ✅ 완료 |
| v2 | 프로젝트 폴더 구조 + Laravel 백엔드 설치 | 폴더 구조, Laravel 12 설치, .env, Sanctum, DB 연결, ApiResponse, Git Push/Pull | ✅ 완료 |
| **v3** | **DB 설계 및 마이그레이션  ←** | **기획서 v1.4 테이블 생성, Model 생성, Seeder** | **▶ 현재** |
| v4 | React 웹 관리자 설치·설정 | React 19 + TypeScript, Ant Design, FullCalendar, Toast UI Grid | ⏳ 예정 |
| v5 | React Native 앱 설치·설정 | RN 0.83, Android 에뮬레이터, RN Paper, React Navigation | ⏳ 예정 |
| v6 | API 라우팅 + 인증 구현 | routes/api.php, Sanctum 토큰, 권한 미들웨어 | ⏳ 예정 |
| v7 | 핵심 기능 API 개발 | 스케줄·현장·근태 CRUD API, 파일 업로드, 집계 통계 | ⏳ 예정 |
| v8 | 배포 및 운영 자동화 | 카페24 이지업 배포, Nginx, cron 백업, 모니터링 | ⏳ 예정 |

# **1. DB 설계 원칙 — 코딩 전 필독**

## **1.1 FK 제약 없는 설계 방침**

• FK(외래키, Foreign Key) 제약을 사용하지 않습니다.

• 테스트 데이터 삽입 순서 강제, 마이그레이션·복원 복잡성, 서비스 확장 시 성능 이슈를 방지하기 위해서입니다.

• 대신 관련 컬럼은 참조 컬럼으로만 만들고, 무결성은 Laravel Model과 Controller 코드에서 직접 관리합니다.

**💡 FK 제약 없는 방식 비교**

  FK 제약 있는 방식 (사용 안 함): foreignId('team_id')->constrained('teams')

  FK 제약 없는 방식 (이 프로젝트): unsignedBigInteger('team_id')

## **1.2 기획서 확정 사항 반영**

• 권한 컬럼 방식 (12.2절): 별도 roles 테이블 / users 테이블에 role_id FK 없이 참조

• Soft Delete 전략 (12.2절): users, teams, schedules, sites, schedule_users, site_files 에 deleted_at 추가

• 타임존 저장 방식 (12.2절): timestamps()는 UTC 저장 — 앱·API에서 KST 변환하여 사용

• FK 제약 방식: FK 조건 없이 unsignedBigInteger 참조 컬럼만 사용

# **2. 테이블 설계 전체 구조**

## **2.1 8개 테이블 한눈에 보기**

**★ v3 업데이트: schedule_users · site_files 에 Soft Delete 추가**

| **테이블명** | **설명** | **Soft Delete** | **비고** |
| --- | --- | --- | --- |
| roles | 권한 등급 (superadmin·manager·member) | ❌ |  |
| teams | 팀 정보 | ✅ |  |
| users | 사용자 (팀원/관리자) | ✅ |  |
| schedules | 일정 (현장 배정) | ✅ |  |
| **schedule_users** | 일정-팀원 중간 테이블 | ✅ 추가됨 | **★ v3 변경** |
| sites | 현장 정보 | ✅ |  |
| **site_files** | 현장 첨부 파일 | ✅ 추가됨 | **★ v3 변경** |
| attendances | 근태 기록 (출퇴근) | ❌ |  |

## **2.2 Soft Delete 판단 기준**

• schedule_users: 팀원 배정 잘못 삭제 시 복구 가능 / 배정 변경 이력 추적 → ✅ 추가

• site_files: 현장 도면 실수 삭제 시 복구 가능 / 중요 업무 자료 보호 → ✅ 추가

• attendances: 출퇴근 기록은 수정이 맞음 / 복구보다 정정이 자연스러움 → ❌ 불필요

• roles: 시스템 기본값이라 삭제 자체를 안 함 → ❌ 불필요

# **3. 마이그레이션 파일 생성 및 내용 작성**

## **3.1 마이그레이션이란?**

마이그레이션(Migration)은 DB 테이블 설계를 PHP 코드로 표현한 파일입니다.

💡 마이그레이션 파일 = 설계 도면 / php artisan migrate = 도면대로 건물 짓기

## **3.2 마이그레이션 파일 생성 명령어**

cd C:\project\team-schedule\backend

php artisan make:migration create_roles_table

php artisan make:migration create_teams_table

php artisan make:migration create_users_table

php artisan make:migration create_schedules_table

php artisan make:migration create_schedule_users_table

php artisan make:migration create_sites_table

php artisan make:migration create_site_files_table

php artisan make:migration create_attendances_table

## **3.3 schedule_users 테이블 ★ 변경됨**

**★ v3 변경: softDeletes() 추가 — 팀원 배정을 실수로 삭제했을 때 복구할 수 있도록 deleted_at 컬럼 추가**

// create_schedule_users_table.php

Schema::create('schedule_users', function (Blueprint $table) {

    $table->id();

    $table->unsignedBigInteger('schedule_id');

    $table->unsignedBigInteger('user_id');

    $table->timestamps();

    $table->softDeletes();   // ✅ 신규 추가 — 배정 삭제 복구 가능

    $table->index(['schedule_id', 'user_id']);

});

## **3.4 site_files 테이블 ★ 변경됨**

**★ v3 변경: softDeletes() 추가 — 현장 도면·PDF를 실수로 삭제했을 때 복구할 수 있도록 추가**

// create_site_files_table.php

Schema::create('site_files', function (Blueprint $table) {

    $table->id();

    $table->unsignedBigInteger('site_id');

    $table->string('original_name');

    $table->string('stored_name');

    $table->string('mime_type');

    $table->unsignedBigInteger('file_size');

    $table->string('file_path');

    $table->string('file_type')->nullable();

    $table->unsignedBigInteger('uploaded_by')->nullable();

    $table->timestamps();

    $table->softDeletes();   // ✅ 신규 추가 — 파일 삭제 복구 가능

});

# **4. 이미 만들어진 테이블에 Soft Delete 추가하기**

## **4.1 방법 선택**

방법 A: 개발 초기 / 테스트 데이터만 있음 → 가장 깔끔함 / 기존 데이터 모두 삭제됨 → ✅ 권장

방법 B: 이미 실제 데이터가 있음 → 기존 데이터 유지됨 / 파일이 2개로 늘어남 → 데이터 있을 때

## **4.2 방법 A — 테이블 초기화 후 재생성 (개발 초기 권장)**

**⚠️ 주의: 이 방법은 team_schedule DB의 모든 테이블과 데이터를 삭제합니다.**

**STEP 1. 마이그레이션 파일 수정**

create_schedule_users_table.php 와 create_site_files_table.php 파일을 열어서 softDeletes() 한 줄 추가 (3장 코드 참고)

**STEP 2. 전체 초기화 + 재실행 + Seeder 한 번에**

php artisan migrate:fresh --seed

# migrate:fresh = 모든 테이블 삭제 후 처음부터 다시 migrate

# --seed = migrate 완료 후 Seeder 자동 실행

**STEP 3. MySQL Workbench에서 확인 ★ v3.1 변경**

MySQL Workbench 접속 → 좌측 SCHEMAS 패널에서 team_schedule 선택

Tables → schedule_users 우클릭 → 'Table Inspector' 클릭

Columns 탭 클릭 → deleted_at 컬럼이 있으면 성공!

## **4.3 방법 B — 컬럼 추가 마이그레이션 생성**

php artisan make:migration add_soft_delete_to_schedule_users_and_site_files

public function up(): void {

    Schema::table('schedule_users', function (Blueprint $table) {

        $table->softDeletes()->after('updated_at');

    });

    Schema::table('site_files', function (Blueprint $table) {

        $table->softDeletes()->after('updated_at');

    });

}

php artisan migrate   # migrate:fresh 가 아닌 migrate 만 실행 → 기존 데이터 유지됨

# **5. Laravel Model 생성**

## **5.1 Model이란?**

Model(모델)은 데이터베이스 테이블과 연결되는 PHP 클래스입니다. SQL을 직접 쓰지 않고 Model을 통해 데이터를 저장·조회·수정·삭제합니다.

💡 테이블 = 창고 / Model = 창고 관리인 / User::find(1) = SELECT * FROM users WHERE id = 1

## **5.2 Model 생성 명령어**

php artisan make:model Role

php artisan make:model Team

# User 모델은 Laravel 설치 시 이미 생성됨 (덮어쓰기 금지!)

php artisan make:model Schedule

php artisan make:model ScheduleUser

php artisan make:model Site

php artisan make:model SiteFile

php artisan make:model Attendance

## **5.3 ScheduleUser.php ★ 변경됨**

// app/Models/ScheduleUser.php

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\SoftDeletes; // ✅ 추가

class ScheduleUser extends Model {

    use SoftDeletes; // ✅ 추가 — delete() 호출 시 deleted_at 기록

    protected $fillable = ['schedule_id', 'user_id'];

}

## **5.4 SiteFile.php ★ 변경됨**

// app/Models/SiteFile.php

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\SoftDeletes; // ✅ 추가

class SiteFile extends Model {

    use SoftDeletes; // ✅ 추가 — 파일 삭제 복구 가능

    protected $fillable = ['site_id','original_name','stored_name','mime_type','file_size','file_path','file_type','uploaded_by'];

}

## **5.5 SoftDeletes 사용 방법 요약**

$scheduleUser->delete();                           // 삭제 (deleted_at에 시간 기록)

$list = ScheduleUser::all();                        // 조회 (deleted_at=NULL인 것만)

$all = ScheduleUser::withTrashed()->get();           // 삭제된 것까지 포함 조회

ScheduleUser::withTrashed()->find(1)->restore();     // 복구 (deleted_at을 NULL로)

ScheduleUser::withTrashed()->find(1)->forceDelete(); // 완전 삭제 (DB에서 행 제거)

# **6. Seeder — 테스트 데이터 생성**

## **6.1 Seeder란?**

Seeder는 개발 중 테스트에 필요한 더미 데이터를 DB에 자동으로 넣어주는 도구입니다.

💡 씨앗(Seed)을 뿌리듯 DB에 초기 데이터를 심는다는 뜻입니다.

## **6.2 DatabaseSeeder.php 코드**

// database/seeders/DatabaseSeeder.php

class DatabaseSeeder extends Seeder {

    public function run(): void {

        // 1. roles 기본 데이터

        Role::insert([

            ['id'=>1,'name'=>'superadmin','permissions'=>null,...],

            ['id'=>2,'name'=>'manager',   'permissions'=>null,...],

            ['id'=>3,'name'=>'member',    'permissions'=>null,...],

        ]);

        // 2. 테스트 팀

        $team = Team::create(['name'=>'테스트팀A', 'invite_code'=>strtoupper(Str::random(6)), ...]);

        // 3~5. 사용자 3명 (슈퍼관리자, 팀장, 팀원)

        User::create(['name'=>'슈퍼관리자','email'=>'superadmin@test.com','role_id'=>1,...]);

        User::create(['name'=>'홍길동팀장','email'=>'manager@test.com',   'role_id'=>2,...]);

        User::create(['name'=>'김팀원',    'email'=>'member@test.com',    'role_id'=>3,...]);

        // 6. 테스트 현장

        Site::create(['address'=>'서울시 강남구 역삼동', 'apt_name'=>'테스트아파트', ...]);

    }

}

## **6.3 Seeder 실행**

php artisan db:seed

# 방법 A(migrate:fresh --seed) 사용 시 이미 자동 실행됨 — 별도 실행 불필요

# **7. 최종 점검 체크리스트**

| **✔** | **항목** | **확인 방법** | **비고** |
| --- | --- | --- | --- |
| [ ] | roles 테이블 생성 + 3개 데이터 | MySQL Workbench에서 확인 |  |
| [ ] | teams 테이블 생성 | MySQL Workbench에서 확인 |  |
| [ ] | users 테이블 생성 (deleted_at 포함) | MySQL Workbench → Columns 탭에서 deleted_at 확인 |  |
| [ ] | schedules 테이블 생성 (date 인덱스 포함) | MySQL Workbench에서 확인 (Columns 탭) |  |
| [ ] | **schedule_users 테이블 생성 (deleted_at 포함)** | ★ MySQL Workbench → Columns 탭에서 deleted_at 확인 | **★ v3 변경** |
| [ ] | sites 테이블 생성 (deleted_at 포함) | MySQL Workbench에서 확인 |  |
| [ ] | **site_files 테이블 생성 (deleted_at 포함)** | ★ MySQL Workbench → Columns 탭에서 deleted_at 확인 | **★ v3 변경** |
| [ ] | attendances 테이블 생성 (deleted_at 없음) | deleted_at 없는 것 확인 |  |
| [ ] | Model 8개 생성 완료 | app/Models 폴더 확인 |  |
| [ ] | **ScheduleUser.php — SoftDeletes 추가됨** | ★ use SoftDeletes; 있는지 확인 | **★ v3 변경** |
| [ ] | **SiteFile.php — SoftDeletes 추가됨** | ★ use SoftDeletes; 있는지 확인 | **★ v3 변경** |
| [ ] | User.php — SoftDeletes + HasApiTokens 추가됨 | User.php 파일 내용 확인 |  |
| [ ] | Seeder 실행 완료 | MySQL Workbench에서 users 3개, roles 3개 확인 |  |

## **GitHub 커밋 · Push**

cd C:\project\team-schedule

git add .

git commit -m "feat: DB 마이그레이션 + schedule_users·site_files SoftDelete 추가"

git push

# **8. 다음 단계 안내 (v4 예고)**

| **v4에서 할 일** | **목적** |
| --- | --- |
| **frontend 폴더 생성** | React 관리자 웹 프로젝트 구조 분리 |
| **React 19 + TypeScript 프로젝트 생성** | 기획서 3.1절 확정 기술 스택 |
| **Ant Design 5.x 설치** | 관리자 UI 컴포넌트 |
| **React Router v7 설치** | 기획서 4.2절 라우팅 구조 구현 |
| **FullCalendar 6.x 설치** | 스케줄 달력 화면 |
| **Toast UI Grid 4.x 설치** | 관리자 목록 테이블 |
| **Axios + TanStack Query 설치** | Laravel API 데이터 연동 |

— v3 DB 설계 및 마이그레이션 완료 (schedule_users · site_files SoftDelete 추가) —

다음: 개발 매뉴얼 v4 — React 웹 관리자 설치·설정

# **변경 이력**

| **버전** | **날짜** | **작성자** | **변경 내용** |
| --- | --- | --- | --- |
| v3.0 | 2026-04 | — | 최초 작성 — DB 설계 및 마이그레이션 (schedule_users · site_files SoftDelete 추가) |
| v3.1 | 2026-04-19 | — | [4장, 7장] DB 클라이언트 변경 TablePlus → MySQL Workbench 반영 / STEP 3 확인: Structure 탭 → Columns 탭 / 체크리스트 전체 MySQL Workbench 기준으로 수정 |
| **v3.2** | 2026-04-19 | — | [전체 매뉴얼 시리즈 표] v7(핵심 기능 API 개발), v8(배포 및 운영 자동화) 항목 추가 — v1.1~v3.1 전 문서 통일 |

© 2026 Team Schedule Manager