Team Schedule Manager  |  오류 코드 정의서  v1.2  |  Confidential

**오류 코드 정의서**

Error Code Definition

Team Schedule Manager  |  v1.2  |  Confidential (2026-09-22 현행화)

| **문서명** | 오류 코드 정의서 (Error Code Definition) | **버전** | v1.2 |
| --- | --- | --- | --- |
| **프로젝트** | Team Schedule Manager | **작성일** | 2026-09-22 |
| **작성 기준** | v18.13 시점 실제 코드(`backend/app/Constants/ErrorCode.php`, `backend/bootstrap/app.php`) | **다음 갱신** | 개발 진행에 따라 수시 업데이트 |

**■ v1.0 대비 변경 요약**

v1.0(2026-04, 개발 매뉴얼 v2 기준)은 8개 도메인 28개 코드를 "확정/예정"으로 나눠 정의했지만, 실제 코드(`ErrorCode.php`)와 대조한 결과 다음과 같은 차이가 있었습니다.

- v1.0의 "예정" 코드 중 **실제로 구현된 것은 하나도 없습니다** (ERR_AUTH_004/005, ERR_SCHEDULE_003/004, ERR_SITE_002/003, ERR_FILE_002/003/004, ERR_ATTEND_004, ERR_TEAM_003, ERR_SERVER_002 — 전부 미구현 상태로 코드에 존재하지 않음). "예정"이 아니라 **보류/미착수**로 정정합니다.
- v1.0에 없던 **WAGE·SUMMARY·WORKTYPE·PHOTO 4개 도메인**이 v10.1~v11에서 신규 추가되었습니다.
- AUTH 도메인은 004/005를 건너뛰고 007/008(v9.1, 웹/모바일 플랫폼 분리)이 추가됐습니다. 004/005 번호는 예약되지 않았으므로 향후 재사용 가능합니다.
- ERR_FILE_001(파일 형식 오류)은 v1.0 문서에는 "확정"이라 되어 있었지만 실제로는 `PhotoController`에서 아직 이 코드를 사용하지 않습니다(업로드 검증 로직 자체가 다른 방식). 문서상 "확정"을 "미사용"으로 정정합니다.

# **1. 개요 (v1.0과 동일, 변경 없음)**

네이밍 규칙(`ERR_{도메인}_{순번}`), HTTP 상태코드 병행 사용 원칙은 v1.0과 동일합니다.

**▶ 도메인 구분 (v1.1 현재)**

AUTH · VALID · SCHEDULE · SITE · FILE · ATTEND · TEAM · SERVER (v1.0부터) + **WAGE · SUMMARY · WORKTYPE · PHOTO (v10.1~v11 신규)**

# **2. 오류 코드 전체 목록 (실제 코드 기준, 2026-09-19)**

*※ "구현됨": `ErrorCode.php`에 상수가 존재하고 실제로 사용됨  |  "미구현": v1.0에서 "예정"으로 표시됐으나 코드에 없음*

| **오류 코드** | **HTTP** | **발생 상황** | **상태** |
| --- | --- | --- | --- |
| **■ AUTH** |
| ERR_AUTH_001 | 401 | 이메일/비밀번호 불일치 | 구현됨 |
| ERR_AUTH_002 | 403 | 권한 없음 (역할 부족) | 구현됨 |
| ERR_AUTH_003 | 401 | 토큰 없음/만료 | 구현됨 |
| ERR_AUTH_004 | — | 타 팀 데이터 접근 차단 | 미구현 |
| ERR_AUTH_005 | — | 잘못된 초대 코드 | 미구현 |
| ERR_AUTH_007 | 403 | 웹 전용 API를 모바일 플랫폼으로 호출 (v9.1 신규) | 구현됨 |
| ERR_AUTH_008 | 403 | 모바일 전용 API를 웹 플랫폼으로 호출 (v9.1 신규) | 구현됨 |
| **■ VALID** |
| ERR_VALID_001~004 | 422 | 입력값 검증 실패 전반 | 구현됨 |
| **■ SCHEDULE** |
| ERR_SCHEDULE_001 | 404 | 존재하지 않는 일정 | 구현됨 |
| ERR_SCHEDULE_002 | 409 | 동일 날짜·현장 중복 등록 | 상수만 존재, 실제로 발생시키는 로직 없음(중복 등록 검증 자체가 미구현) |
| ERR_SCHEDULE_003/004 | — | 수정 권한/완료 상태 변경 제한 | 미구현 |
| **■ SITE** |
| ERR_SITE_001 | 404 | 존재하지 않는 현장 | 구현됨 (2026-09-19 SiteController 신규 구현과 함께 실사용 시작) |
| ERR_SITE_002/003 | — | 중복 등록/수정 권한 제한 | 미구현 |
| **■ FILE** |
| ERR_FILE_001~004 | — | 파일 형식/용량/조회/저장 오류 | 미사용 — 현장 사진은 `PHOTO_*` 도메인(아래)으로 대체 구현됨 |
| **■ ATTEND** |
| ERR_ATTEND_001~004 | — | 출퇴근 중복/누락 처리 | 미구현 (AttendanceController 자체가 스텁, 로드맵상 의도된 보류) |
| **■ TEAM** |
| ERR_TEAM_001 | 404 | 존재하지 않는 팀 | 코드 상수만 존재, TeamController가 스텁이라 미사용 |
| ERR_TEAM_002 | 409 | 이미 팀 소속 | 코드 상수만 존재, 미사용 |
| ERR_TEAM_003 | — | 팀 관리 권한 없음 | 미구현 |
| **■ SERVER** |
| ERR_SERVER_001 | 500 | 서버 내부 오류 (예상 못한 예외 / DB 쿼리 오류) | 구현됨 |
| ERR_SERVER_002 | — | 점검 모드 | 미구현 |
| ERR_SERVER_003 | 404 | 존재하지 않는 라우트/URL (v18.13 신규) | 구현됨 |
| ERR_SERVER_004 | 405 | 허용되지 않은 HTTP 메서드 (v18.13 신규) | 구현됨 |
| ERR_SERVER_005 | 429 | rate limit(throttle) 초과 (v18.13 신규) | 구현됨 |
| ERR_SERVER_006 | 404 | findOrFail 등으로 못 찾은 모델 — 도메인별 코드가 없을 때의 기본값 (v18.13 신규) | 구현됨 |
| **■ WAGE (★ v10.1 신규)** |
| ERR_WAGE_001 | 404 | 존재하지 않는 단가 설정 | 구현됨 |
| ERR_WAGE_002 | 409 | 단가 중복 등록 | 구현됨 |
| ERR_WAGE_003 | 422 | 음수 단가 입력 | 구현됨 |
| **■ SUMMARY (★ v10.1 신규)** |
| ERR_SUMMARY_001 | 422 | 잘못된 연/월 파라미터 | 구현됨 |
| ERR_SUMMARY_002 | 500 | 월별 집계 계산 오류 | 구현됨 |
| **■ WORKTYPE (★ v10.1 신규)** |
| ERR_WORKTYPE_001 | 404 | 존재하지 않는 공정 | 구현됨 |
| **■ PHOTO (★ v11 신규)** |
| ERR_PHOTO_001 | 404 | 존재하지 않는 사진 | 구현됨 |
| ERR_PHOTO_002 | 422 | 현장 미연결 일정에 사진 업로드 시도 | 구현됨 |
| ERR_PHOTO_003 | 422 | 시공 전 사진이 아닌데 페어 지정 시도 (v11.1) | 구현됨 |
| ERR_PHOTO_004 | 404 | 페어 대상 시공 전 사진 없음 (v11.1) | 구현됨 |
| ERR_PHOTO_005 | 409 | 이미 다른 페어가 지정됨 (v11.1) | 구현됨 |

# **3. 전역 예외처리기 (v18.13, `bootstrap/app.php`)**

이전까지 `bootstrap/app.php`의 `withExceptions()`에 `Throwable` 캐치올 하나만 있어서, **예외 종류와 무관하게 전부 500 + ERR_SERVER_001로 응답**하고 있었습니다. 대표적으로 컨트롤러에서 `$request->validate()`가 실패해도 422가 아니라 500으로 나가는 실제 버그였습니다(공정 커스텀 추가 기능 검증 중 발견).

v18.13에서 예외 타입별로 먼저 잡아 정확한 상태코드를 반환하도록 정리했습니다. 처리 순서(위에서부터 먼저 매치):

| 예외 타입 | HTTP | error_code |
| --- | --- | --- |
| `AuthenticationException` | 401 | ERR_AUTH_003 |
| `AuthorizationException` | 403 | ERR_AUTH_002 |
| `ValidationException` | 422 | ERR_VALID_001 (필드별 오류는 `errors` 키에 포함) |
| `ModelNotFoundException` | 404 | ERR_SERVER_006 |
| `NotFoundHttpException` (라우트 없음) | 404 | ERR_SERVER_003 |
| `MethodNotAllowedHttpException` | 405 | ERR_SERVER_004 |
| `TooManyRequestsHttpException` (throttle) | 429 | ERR_SERVER_005 |
| `QueryException` (DB 오류) | 500 | ERR_SERVER_001 (SQL 내용은 로그에만, 클라이언트엔 미노출) |
| 그 외 모든 `Throwable` | 500 | ERR_SERVER_001 (운영에서는 내부 메시지 미노출, `APP_DEBUG=true`일 때만 실제 메시지 노출) |

부수적으로, 인증 미들웨어가 `Accept: application/json` 헤더 없는 요청에서 존재하지 않는 `login` 명명 라우트로 리다이렉트를 시도하다 별도의 500(`RouteNotFoundException`)을 내던 문제도 `redirectGuestsTo(fn () => null)`로 같이 수정했습니다(이 프로젝트는 순수 API 서버라 웹 로그인 페이지가 없음).

컨트롤러에서 개별적으로 `ApiResponse::error()`를 직접 반환하는 기존 도메인별 에러 코드(ERR_WAGE_*, ERR_SCHEDULE_* 등)는 이 예외처리기를 거치지 않으므로 영향 없습니다. 이 표는 **컨트롤러가 예외를 던지거나 Laravel이 자동으로 던지는 경우**에만 적용됩니다.

# **4. 변경 이력**

| **버전** | **작성일** | **작성자** | **변경 내용** |
| --- | --- | --- | --- |
| v1.0 | 2026-04 | — | 최초 작성 — 개발 매뉴얼 v2 기반 오류 코드 체계 확립 (8개 도메인, 28개 코드) |
| v1.1 | 2026-09-19 | Claude Sonnet 5 | v11.6 기준 실제 코드 대조 현행화 — WAGE/SUMMARY/WORKTYPE/PHOTO 4개 도메인 추가, v1.0 "예정" 항목의 미구현 상태 확정, FILE 도메인이 PHOTO로 대체됐음을 명시 |
| v1.2 | 2026-09-22 | Claude Sonnet 5 | 전역 예외처리기 룰 정리 (v18.13) — 예외 타입별 정확한 상태코드 반환하도록 수정, SERVER_003~006 신규 추가, `$request->validate()` 실패가 500으로 나가던 실제 버그 수정 |

*— 문서 끝 —*

© 2026 Team Schedule Manager
