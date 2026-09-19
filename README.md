# 팀 일정 관리 시스템 (Team Schedule Manager)

인테리어 시공(도배·타일·필름) 현장 팀을 위한 **일정 · 급여 · 현장 사진 통합 관리 시스템**입니다. (근태 자동 집계는 로드맵상 후순위로 개발 예정)
현장 관리자(manager)는 웹 대시보드에서 일정과 현장을 관리하고, 현장 작업자(member)는 모바일 앱으로 일정을 확인하고 현장 사진을 업로드하며 공수 단가를 등록해 월 수입을 확인합니다.

---

## 📌 프로젝트 소개

시공 현장은 보통 여러 팀원이 여러 현장을 오가며 작업하기 때문에, 누가 언제 어느 현장에 투입되는지, 근태와 급여는 어떻게 계산되는지를 종이나 메신저로 관리하면 누락과 착오가 생기기 쉽습니다.

이 프로젝트는 이런 문제를 해결하기 위해 만든 **웹(관리자용) + 모바일 앱(작업자용) 구조의 현장 관리 시스템**입니다.

- 관리자는 **웹 대시보드**에서 현장·일정·팀원을 등록하고 관리합니다.
- 작업자는 **모바일 앱**으로 본인 일정을 확인하고, 출퇴근을 기록하며, 현장 사진을 올립니다.
- 두 클라이언트가 하나의 **Laravel API 서버**를 함께 사용하는 구조입니다.

---

## ✅ 주요 기능

### 🔐 인증 및 권한 관리
- 회원가입 / 로그인 (Laravel Sanctum 토큰 기반 인증)
- 역할 기반 접근 제어(RBAC): `manager`(관리자) / `member`(작업자) 2단계 권한

### 📅 일정 관리
- 현장별 일정 등록 · 조회 · 수정 · 삭제 (관리자 권한)
- 웹은 FullCalendar, 앱은 react-native-calendars 기반 캘린더 UI
- 일정에 투입 인원(팀원) 배정

### 🏗 현장(Site) 관리
- 현장 등록 · 조회 · 수정 · 삭제 (관리자), 일정(Schedule)에서 `site_id`로 참조
- 현장별 작업 사진 업로드 · 비교 · 수정 · 삭제(시공 전/중/후/기타)

### 🕒 근태 관리 (개발 예정 — 로드맵상 후순위 보류)
- `/api/attendances` 라우트는 존재하지만 `AttendanceController`는 현재 빈 스텁 상태입니다.
- 서비스 기획 v2.3 이후 "현장 사진 구조화" 기능이 우선순위로 채택되면서 근태 자동 집계는 후순위로 미뤄졌습니다.

### 💰 공수 · 급여 자동 계산
- 공정(도배 / 타일 / 필름)별 개인 단가 설정
- 월별 수입 자동 집계 (캐시 우선 조회, 없으면 서버에서 실시간 재계산)

### 📐 평수 · 자재 자동 계산기
시공 종류에 따라 필요한 자재량을 자동으로 계산해주는 기능입니다.

| 공정 | 입력값 | 계산 결과 |
|---|---|---|
| 도배 | 가로 · 세로 · 높이(m) | 평수, 필요 도배지 롤 수, 총 면적 |
| 타일 | 시공 면적(㎡) · 타일 규격(mm) | 평수, 필요 타일 개수 |
| 필름 | 시공 면적(㎡) · 필름 폭(cm) | 평수, 필요 필름 길이(m) |

- 손실률(로스율)을 직접 입력하지 않으면 공정별 기본값(도배 10%, 타일 15%, 필름 10%)이 자동 적용됩니다.

### 👥 팀 관리
- 팀 생성 · 조회 · 수정 · 삭제, 초대 코드를 통한 팀원 가입
- 아직 팀이 없는 사용자가 팀을 생성하면 자동으로 관리자(manager) 권한으로 승격되고 해당 팀에 소속됩니다.
- 이미 존재하는 팀은 초대 코드로 가입할 수 있습니다. 한 사용자는 하나의 팀에만 소속됩니다.
- 팀 수정·삭제는 관리자(manager) 이상만 가능합니다.

### 📄 자동 보고서 (PDF) + 공유 링크
- 현장이 연결된 일정에 대해 시공 완료 보고서를 PDF로 자동 생성합니다.
- 고객명 · 연락처 · 인사말을 입력하면 현장 정보 + 공정 정보 + 시공 전/중/후 카테고리별 사진 + 시공 전·후 비교 이미지가 포함된 PDF가 만들어집니다.
- 웹 대시보드의 일정 상세(캘린더에서 일정 클릭)에서 생성 · 다운로드 · 삭제할 수 있습니다.
- 고객은 로그인 없이 공유 링크(`/api/report/{share_token}`) 하나로 PDF를 브라우저에서 바로 열람할 수 있으며, 열람 횟수 · 마지막 열람 시각이 자동으로 기록되어 웹 대시보드에서 확인할 수 있습니다.

### 🪪 모바일 명함 + QR 공유
- 이름 · 직함 · 경력 · 활동 지역 · 전문 분야 · 연락처 · 한 줄 소개로 나만의 명함을 만들 수 있습니다.
- 최근 업로드한 시공 사진 최대 3장이 포트폴리오로 자동 노출됩니다(수동 선택은 미지원).
- 앱 설치 없이 누구나 볼 수 있는 공개 링크(`/c/{share_code}`)가 자동 생성되며, 전화 걸기 버튼과 카카오톡 미리보기(Open Graph)를 지원합니다.
- 자동 보고서(PDF)에 명함으로 연결되는 QR코드가 자동으로 삽입됩니다.
- 조회수(누적/이번 달)를 웹 대시보드에서 확인할 수 있습니다. (⚠️ 현재는 웹 대시보드에서만 관리 가능 — 모바일 앱 화면은 미구현)

---

## 🛠 기술 스택

**Backend**
`PHP 8.3` · `Laravel 13` · `Laravel Sanctum` (토큰 인증) · `MySQL` · `Pest` (테스트)

**Frontend (웹 관리자 대시보드)**
`React 19` · `TypeScript` · `Vite` · `Ant Design` · `FullCalendar` · `TanStack Query` · `Zustand` · `Recharts` · `Axios`

**App (모바일, 작업자용)**
`React Native 0.85` · `TypeScript` · `React Navigation` · `React Native Paper` · `TanStack Query` · `Zustand`

---

## 📁 프로젝트 구조

이 저장소는 백엔드 API 서버, 웹 관리자 대시보드, 모바일 앱을 하나의 저장소에서 함께 관리하는 **모노레포(monorepo)** 구조입니다.
(모노레포란, 여러 개의 프로젝트/앱을 하나의 저장소 안에 폴더로 나눠서 함께 관리하는 방식을 말합니다.)

```
team-schedule-manager/
├── backend/                  # Laravel REST API 서버
│   ├── app/
│   │   ├── Http/Controllers/Api/   # 인증·일정·현장·근태·급여 등 API 컨트롤러
│   │   ├── Models/                 # Eloquent 모델 (Schedule, Site, Team, Attendance 등)
│   │   └── Services/                # 월별 급여 집계 등 비즈니스 로직
│   └── routes/api.php               # API 라우트 정의
│
├── frontend/                 # React 웹 관리자 대시보드
│   └── src/
│       ├── pages/             # Dashboard, Schedule, Attendance, Sites, Teams 등 화면
│       ├── store/             # 전역 상태 관리 (Zustand)
│       └── api/               # 서버 통신 모듈 (Axios)
│
└── app/                       # React Native 모바일 앱 (현장 작업자용)
    └── src/
        ├── screens/            # Calendar, Attendance, PhotoCompare, WageSettings 등 화면
        └── store/
```

---

## 🚀 시작하기 (로컬 실행 방법)

### 1) Backend (Laravel API)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate

# .env 파일에서 DB_DATABASE, DB_USERNAME, DB_PASSWORD 등 DB 접속 정보 설정 후
php artisan migrate
php artisan db:seed   # roles(권한) 등 기본 데이터 필수 — 생략 시 manager 권한 체크에서 500 에러 발생
php artisan serve
```

기본적으로 `http://localhost:8000` 에서 API 서버가 실행됩니다.

### 2) Frontend (웹 관리자 대시보드)

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:5173` (Vite 기본 포트)로 접속합니다. API 주소는 `frontend/.env`의 `VITE_API_URL`에서 설정합니다.

### 3) App (모바일 앱)

```bash
cd app
npm install

# Android
npm run android

# iOS (macOS 환경 필요)
npm run ios
```

---

## 📡 API 개요

| 구분 | 메서드 | 엔드포인트 | 설명 | 필요 권한 |
|---|---|---|---|---|
| 인증 | POST | `/api/auth/register` | 회원가입 | 없음 |
| 인증 | POST | `/api/auth/login` | 로그인 | 없음 |
| 인증 | GET | `/api/me` | 내 정보 조회 | member+ |
| 일정 | GET | `/api/schedules` | 일정 목록/상세 조회 | member+ |
| 일정 | POST/PUT/DELETE | `/api/schedules` | 일정 등록·수정·삭제 | manager+ |
| 현장 | GET | `/api/sites` | 현장 목록/상세 조회 | member+ |
| 현장 | POST/PUT/DELETE | `/api/sites` | 현장 등록·수정·삭제 | manager+ |
| 근태 | GET/POST/PUT/DELETE | `/api/attendances` | (⏳ 스텁, 미구현) | member+ |
| 계산기 | POST | `/api/calculate/area` | 평수·자재 자동 계산 | member+ |
| 사진 | GET/POST/PATCH/DELETE | `/api/schedules/{id}/photos` | 현장 사진 관리 (시공 전/중/후/기타) | member+ |
| 급여 | GET | `/api/wage-settings` | 내 단가 설정 조회/등록/삭제 | member+ |
| 급여 | GET | `/api/monthly-summary` | 월별 수입 집계 조회 | member+ |
| 팀 | GET | `/api/team/members` | 내 팀 팀원 목록 조회 | member+ |
| 팀 | GET | `/api/teams` | 내 팀 조회 (superadmin은 전체) | member+ |
| 팀 | GET | `/api/teams/{id}` | 팀 상세 조회 (본인 팀만) | member+ |
| 팀 | POST | `/api/teams` | 팀 생성 — 생성자는 manager로 자동 승격 | member+ (팀 없는 사용자) |
| 팀 | POST | `/api/teams/join` | 초대 코드로 팀 가입 | member+ (팀 없는 사용자) |
| 팀 | PUT | `/api/teams/{id}` | 팀 정보 수정 | manager+ |
| 팀 | DELETE | `/api/teams/{id}` | 팀 삭제 | manager+ |
| 보고서 | GET | `/api/schedules/{id}/reports` | 일정별 보고서 목록 조회 | member+ |
| 보고서 | POST | `/api/schedules/{id}/reports` | PDF 보고서 생성 (현장 연결된 일정만) | member+ |
| 보고서 | GET | `/api/reports/{id}` | 보고서 메타데이터 조회 | member+ |
| 보고서 | GET | `/api/reports/{id}/download` | PDF 다운로드 | member+ |
| 보고서 | DELETE | `/api/reports/{id}` | 보고서 삭제 | member+ |
| 보고서 | GET | `/api/report/{share_token}` | 공유 링크 공개 열람 (인라인 PDF, 열람 추적) | 없음 (공개) |
| 명함 | GET | `/api/business-card` | 내 명함 조회 | member+ |
| 명함 | PUT | `/api/business-card` | 명함 생성/수정 | member+ |
| 명함 | DELETE | `/api/business-card` | 명함 삭제 | member+ |
| 명함 | GET | `/c/{share_code}` | 명함 공개 페이지 (HTML, 조회수 추적) — `/api` 프리픽스 없음(`routes/web.php`) | 없음 (공개) |

> 전체 라우트 정의는 [`backend/routes/api.php`](./backend/routes/api.php) 에서 확인할 수 있습니다.
> `member+`는 로그인한 모든 사용자, `manager+`는 관리자 권한이 필요함을 의미합니다.
> ⏳ 표시된 항목은 라우트/컨트롤러 메서드는 존재하지만 실제 로직 없이 `501 ERR_NOT_IMPLEMENTED`를 반환하는 상태입니다.

---

## 🔒 역할(Role) 정책

- **member (작업자)**: 일정/현장 조회, 현장 사진 업로드, 팀원 목록 조회, 급여 계산 결과 조회, 팀이 없을 경우 팀 생성/가입 가능(생성 시 manager로 자동 승격)
- **manager (관리자)**: member의 모든 권한 + 일정/현장 등록·수정·삭제, 소속 팀 정보 수정·삭제
- 근태 CRUD는 API 스텁만 존재하며 아직 권한 정책이 확정되지 않았습니다(로드맵상 의도된 보류).

---

## 📝 라이선스

별도의 라이선스가 지정되어 있지 않습니다. 필요 시 `LICENSE` 파일을 추가해 배포 조건을 명시할 수 있습니다.
