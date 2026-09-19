Team Schedule Manager  |  API 명세서 v1.1

**Team Schedule Manager**

API 명세서 v1.1 (2026-09-19 현행화)

| **작성일** | 2026-09-19 |
| --- | --- |
| **버전** | v1.1 |
| **기준 코드** | 커밋 `e154969` (v11.6 "홈 화면 개편" + `aff5e06` "공통헤더 및 오류 수정" 이후) |
| **베이스 URL** | http://localhost:8000 |
| **인증 방식** | Laravel Sanctum (Bearer Token) |
| **응답 형식** | application/json |

> v1.0(2026-04-19, v6 시점)에서 인증 API 4종만 상세 기술되고 나머지는 "v7에서 상세 구현 예정"으로 남겨져 있었습니다. 이 v1.1은 v11.6 시점 실제 코드(`backend/routes/api.php`, 각 Controller)를 기준으로 3장(전체 라우트 목록)·4장(에러 코드 목록)만 갱신한 문서입니다. 1~2장(공통 규칙, 인증 API 상세)은 v1.0과 동일하며 변경 없습니다.

# **3. 전체 API 라우트 목록 (v11.6 기준 현행화)**

각 라우트의 **구현 상태**를 명시합니다. ⏳ 표시는 라우트/컨트롤러 메서드는 존재하나 실제 로직 없이 `501 ERR_NOT_IMPLEMENTED`를 반환하는 스텁입니다.

| **Method** | **엔드포인트** | **권한** | **설명** | **상태** |
| --- | --- | --- | --- | --- |
| POST | /api/auth/register | 공개 | 회원가입 | ✅ 구현됨 |
| POST | /api/auth/login | 공개 | 로그인 (토큰 발급, platform 파라미터 지원) | ✅ 구현됨 |
| POST | /api/auth/logout | member+ | 로그아웃 (토큰 삭제) | ✅ 구현됨 |
| GET | /api/me | member+ | 내 정보 조회 | ✅ 구현됨 |
| **일정(Schedule)** |
| GET | /api/schedules | member+ | 일정 목록 조회 (year/month 쿼리 필터) | ✅ 구현됨 |
| GET | /api/schedules/{id} | member+ | 일정 단건 조회 | ✅ 구현됨 |
| POST | /api/schedules | manager+ | 일정 등록 (투입 인원·공수·단가·경비 포함, v9.0 확장) | ✅ 구현됨 |
| PUT | /api/schedules/{id} | manager+ | 일정 수정 | ✅ 구현됨 |
| DELETE | /api/schedules/{id} | manager+ | 일정 삭제 | ✅ 구현됨 |
| **현장(Site)** |
| GET | /api/sites | member+ | 현장 목록 조회 | ✅ 구현됨 (2026-09-19 신규) |
| GET | /api/sites/{id} | member+ | 현장 단건 조회 | ✅ 구현됨 (2026-09-19 신규) |
| POST | /api/sites | manager+ | 현장 등록 | ✅ 구현됨 (2026-09-19 신규) |
| PUT | /api/sites/{id} | manager+ | 현장 수정 | ✅ 구현됨 (2026-09-19 신규) |
| DELETE | /api/sites/{id} | manager+ | 현장 삭제 | ✅ 구현됨 (2026-09-19 신규) |
| **현장 사진(Photo) — ★ v11 신규** |
| GET | /api/schedules/{scheduleId}/photos | member+ | 사진 목록 조회 (시공 전/중/후/기타 카테고리) | ✅ 구현됨 |
| POST | /api/schedules/{scheduleId}/photos | member+ | 사진 업로드 | ✅ 구현됨 |
| PATCH | /api/schedules/{scheduleId}/photos/{photoId} | member+ | 사진 부분 수정 (페어 매칭 `paired_with_id`, v11.1.1) | ✅ 구현됨 |
| DELETE | /api/schedules/{scheduleId}/photos/{photoId} | member+ | 사진 삭제 | ✅ 구현됨 |
| **근태(Attendance)** |
| GET/POST/PUT/DELETE | /api/attendances | member+ | 본인 근태 CRUD | ⏳ 스텁 (로드맵 v2.3 이후 후순위 보류, 의도된 상태) |
| **팀(Team)** |
| GET | /api/team/members | member+ | 내 팀 팀원 목록 조회 (일정 투입 인원 선택용, v9 신규) | ✅ 구현됨 |
| POST | /api/teams/join | member+ | 초대 코드로 팀 가입 | ⏳ 스텁 |
| GET | /api/teams | manager+ | 팀 목록 조회 | ⏳ 스텁 |
| GET | /api/teams/{id} | manager+ | 팀 단건 조회 | ⏳ 스텁 |
| PUT | /api/teams/{id} | manager+ | 팀 수정 | ⏳ 스텁 |
| DELETE | /api/teams/{id} | manager+ | 팀 삭제 | ⏳ 스텁 |
| **공수·급여 자동 계산 — ★ v10.1 신규** |
| POST | /api/calculate/area | member+ | 평수·자재 자동 계산 (도배/타일/필름) | ✅ 구현됨 |
| GET | /api/work-types | member+ | 공정 목록 조회 | ✅ 구현됨 |
| GET | /api/wage-settings | member+ | 내 단가 설정 조회 | ✅ 구현됨 |
| POST | /api/wage-settings | member+ | 내 단가 설정 등록 | ✅ 구현됨 |
| DELETE | /api/wage-settings/{id} | member+ | 내 단가 설정 삭제 | ✅ 구현됨 |
| GET | /api/monthly-summary | member+ | 월별 수입 집계 조회 (캐시 우선, `?year=&month=`) | ✅ 구현됨 |

# **4. 에러 코드 목록 (v11.6 기준 현행화)**

v1.0(v6 기준) 대비 v10.1(공수·급여)·v11(현장 사진) 도메인 에러코드가 추가되었습니다. 전체 목록·상세 발생 상황은 `ErrorCode_Definition` 문서를 참조하세요. 여기서는 v1.0 이후 신규 추가분만 정리합니다.

| **에러코드** | **HTTP** | **발생 상황** | **추가 시점** |
| --- | --- | --- | --- |
| ERR_AUTH_007 | 403 | 웹 전용 API를 모바일 플랫폼 토큰으로 호출 | v9.1 |
| ERR_AUTH_008 | 403 | 모바일 전용 API를 웹 플랫폼 토큰으로 호출 | v9.1 |
| ERR_WAGE_001 | 404 | 존재하지 않는 단가 설정 | v10.1 |
| ERR_WAGE_002 | 409 | 이미 등록된 공정의 단가 중복 등록 | v10.1 |
| ERR_WAGE_003 | 422 | 음수 단가 입력 | v10.1 |
| ERR_SUMMARY_001 | 422 | 잘못된 연/월 파라미터 | v10.1 |
| ERR_SUMMARY_002 | 500 | 월별 집계 계산 중 오류 | v10.1 |
| ERR_WORKTYPE_001 | 404 | 존재하지 않는 공정 | v10.1 |
| ERR_PHOTO_001 | 404 | 존재하지 않는 사진 | v11 |
| ERR_PHOTO_002 | 422 | 현장이 연결되지 않은 일정에 사진 업로드 시도 | v11 |
| ERR_PHOTO_003 | 422 | 시공 전(before) 사진이 아닌데 페어 지정 시도 | v11.1 |
| ERR_PHOTO_004 | 404 | 페어로 지정하려는 시공 전 사진이 없음 | v11.1 |
| ERR_PHOTO_005 | 409 | 이미 다른 사진과 페어가 지정됨 | v11.1 |

v1.0에 있던 ERR_SITE_001(현장 없음), ERR_TEAM_001/002, ERR_ATTEND_001~003, ERR_SCHEDULE_001/002 등은 그대로 유효합니다.

# **변경 이력**

| **버전** | **날짜** | **작성자** | **변경 내용** |
| --- | --- | --- | --- |
| v1.0 | 2026-04-19 | — | 최초 작성 — 인증 API 4종 명세 완성, 전체 라우트 목록 및 에러 코드 초안 정리 |
| v1.1 | 2026-09-19 | Claude Sonnet 5 | v11.6 기준 3장(라우트 목록)·4장(에러코드) 현행화 — 사진/공수급여/현장 API 반영, 근태·팀CRUD 스텁 상태 명시 |

© 2026 Team Schedule Manager
