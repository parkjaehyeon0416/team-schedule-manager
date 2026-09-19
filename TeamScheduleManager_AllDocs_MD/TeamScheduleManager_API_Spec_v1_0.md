Team Schedule Manager  |  API 명세서 v1.0

**Team Schedule Manager**

API 명세서 v1.0

| **작성일** | 2026-04-19 |
| --- | --- |
| **버전** | v1.0 |
| **베이스 URL** | http://localhost:8000 |
| **인증 방식** | Laravel Sanctum (Bearer Token) |
| **응답 형식** | application/json |

# **1. 공통 규칙**

## **1.1 기본 응답 구조**

모든 API는 아래 형식으로 응답합니다.

| **필드** | **타입** | **설명** |
| --- | --- | --- |
| **success** | boolean | 성공 여부 (true / false) |
| **message** | string | 결과 메시지 (한국어) |
| **data** | object │ null | 실제 데이터 (오류 시 null) |
| **error_code** | string │ null | 오류 코드 (성공 시 null) |

## **1.2 공통 요청 헤더**

| **헤더** | **값** | **비고** |
| --- | --- | --- |
| **Content-Type** | application/json | 모든 요청 필수 |
| **Accept** | application/json | 모든 요청 필수 |
| **Authorization** | Bearer {토큰} | 인증 필요 API만 (로그인 후 발급된 토큰) |

## **1.3 권한 체계**

| **권한명** | **role_id** | **가능한 작업** |
| --- | --- | --- |
| **superadmin** | 1 | 모든 기능 사용 가능 |
| **manager** | 2 | 일정·현장·팀 관리 (등록·수정·삭제) |
| **member** | 3 | 일정·현장 조회, 본인 근태 등록 |

# **2. 인증 API (Authentication)**

**베이스 URL: http://localhost:8000/api**

## **2.1 회원가입**

| ** POST ****  /api/auth/register**    새 사용자 계정 생성 |
| --- |

| **항목** | **내용** |
| --- | --- |
| **인증 필요** | 불필요 (공개 API) |
| **권한** | 누구나 접근 가능 |
| **설명** | 새로운 사용자를 등록합니다. 기본 권한은 member(팀원)로 자동 설정됩니다. |

**▶ 요청 헤더 (Request Headers)**

| **헤더명** | **값 / 설명** |
| --- | --- |
| **Content-Type** | application/json |
| **Accept** | application/json |

**▶ 요청 바디 (Request Body — JSON)**

| **필드명** | **타입** | **필수** | **설명** |
| --- | --- | --- | --- |
| **name** | string | 필수 | 사용자 이름 (최대 100자) |
| **email** | string | 필수 | 이메일 주소 (중복 불가) |
| **password** | string | 필수 | 비밀번호 (최소 6자) |
| **password_confirmation** | string | 필수 | password와 동일한 값 (일치 확인용) |

**▶ 성공 응답 (Response)**

| **필드** | **타입** | **설명** |
| --- | --- | --- |
| **success** | boolean | true |
| **message** | string | "회원가입이 완료되었습니다." |
| **data.id** | integer | 생성된 사용자 ID |
| **data.name** | string | 사용자 이름 |
| **data.email** | string | 이메일 주소 |
| **data.role_id** | integer | 기본값 3 (member) |

**▶ 오류 응답 (Error Response)**

| **HTTP** | **에러코드** | **메시지** |
| --- | --- | --- |
| **422** | **ERR_VALID_001** | 입력값 유효성 검사 실패 (필드 누락, 형식 오류) |
| **422** | **ERR_VALID_002** | 이미 사용 중인 이메일입니다. |

| 💡 회원가입 직후 로그인이 자동으로 되지 않습니다. 별도로 로그인 API를 호출해 토큰을 받아야 합니다. |
| --- |

## **2.2 로그인 (토큰 발급)**

| ** POST ****  /api/auth/login**    로그인 후 Sanctum 토큰 발급 |
| --- |

| **항목** | **내용** |
| --- | --- |
| **인증 필요** | 불필요 (공개 API) |
| **권한** | 누구나 접근 가능 |
| **설명** | 이메일과 비밀번호로 로그인합니다. 성공 시 Bearer 토큰을 반환합니다. 이후 모든 인증 필요 API에서 이 토큰을 사용합니다. |

**▶ 요청 헤더 (Request Headers)**

| **헤더명** | **값 / 설명** |
| --- | --- |
| **Content-Type** | application/json |
| **Accept** | application/json |

**▶ 요청 바디 (Request Body — JSON)**

| **필드명** | **타입** | **필수** | **설명** |
| --- | --- | --- | --- |
| **email** | string | 필수 | 가입한 이메일 주소 |
| **password** | string | 필수 | 비밀번호 |

**▶ 성공 응답 (Response)**

| **필드** | **타입** | **설명** |
| --- | --- | --- |
| **data.user.id** | integer | 사용자 ID |
| **data.user.name** | string | 사용자 이름 |
| **data.user.email** | string | 이메일 주소 |
| **data.user.role_id** | integer | 권한 ID (1:superadmin / 2:manager / 3:member) |
| **data.user.role** | object | 권한 상세 정보 { id, name } |
| **data.token** | string | Bearer 토큰 — 이후 API 호출 시 Authorization 헤더에 사용 |

**▶ 오류 응답 (Error Response)**

| **HTTP** | **에러코드** | **메시지** |
| --- | --- | --- |
| **401** | **ERR_AUTH_001** | 이메일 또는 비밀번호가 틀렸습니다. |
| **422** | **ERR_VALID_001** | 입력값 누락 또는 형식 오류 |

| 💡 응답의 data.token 값을 앱에 저장해두세요. React Native는 AsyncStorage, 웹은 localStorage에 저장합니다. |
| --- |

## **2.3 로그아웃**

| ** POST ****  /api/auth/logout**    현재 기기 토큰 삭제 (로그아웃) |
| --- |

| **항목** | **내용** |
| --- | --- |
| **인증 필요** | 필요 (Bearer 토큰) |
| **권한** | member 이상 (로그인된 모든 사용자) |
| **설명** | 현재 사용 중인 토큰을 서버에서 삭제합니다. 삭제된 토큰으로는 더 이상 API를 사용할 수 없습니다. 다른 기기의 토큰은 영향을 받지 않습니다. |

**▶ 요청 헤더 (Request Headers)**

| **헤더명** | **값 / 설명** |
| --- | --- |
| **Authorization** | Bearer {로그인 시 받은 토큰} |
| **Accept** | application/json |

**▶ 성공 응답 (Response)**

| **필드** | **타입** | **설명** |
| --- | --- | --- |
| **success** | boolean | true |
| **message** | string | "로그아웃 되었습니다." |
| **data** | null | null |

**▶ 오류 응답 (Error Response)**

| **HTTP** | **에러코드** | **메시지** |
| --- | --- | --- |
| **401** | **ERR_AUTH_003** | 토큰이 없거나 유효하지 않음 (이미 로그아웃된 상태) |

| 💡 로그아웃 후 클라이언트(앱/웹)에서도 저장된 토큰을 삭제해야 합니다. |
| --- |

## **2.4 내 정보 조회**

| ** GET ****  /api/me**    로그인한 사용자 본인 정보 조회 |
| --- |

| **항목** | **내용** |
| --- | --- |
| **인증 필요** | 필요 (Bearer 토큰) |
| **권한** | member 이상 (로그인된 모든 사용자) |
| **설명** | 현재 로그인된 사용자의 정보를 반환합니다. 권한 정보(role)와 소속 팀(team) 정보를 포함합니다. |

**▶ 요청 헤더 (Request Headers)**

| **헤더명** | **값 / 설명** |
| --- | --- |
| **Authorization** | Bearer {로그인 시 받은 토큰} |
| **Accept** | application/json |

**▶ 성공 응답 (Response)**

| **필드** | **타입** | **설명** |
| --- | --- | --- |
| **data.id** | integer | 사용자 ID |
| **data.name** | string | 사용자 이름 |
| **data.email** | string | 이메일 주소 |
| **data.role_id** | integer | 권한 ID |
| **data.team_id** | integer | 소속 팀 ID (없으면 null) |
| **data.role.id** | integer | 권한 ID |
| **data.role.name** | string | 권한명 (superadmin / manager / member) |
| **data.team.id** | integer | 팀 ID |
| **data.team.name** | string | 팀 이름 |
| **data.team.invite_code** | string | 팀 초대 코드 |

**▶ 오류 응답 (Error Response)**

| **HTTP** | **에러코드** | **메시지** |
| --- | --- | --- |
| **401** | **ERR_AUTH_003** | 토큰 없음 또는 유효하지 않은 토큰 |

| 💡 이 API로 앱 실행 시 로그인 상태를 검증합니다. 토큰이 유효하면 200, 만료되면 401을 반환합니다. |
| --- |

# **3. 전체 API 라우트 목록**

v6에서 설계된 전체 라우트 구조입니다. v7에서 각 API의 상세 기능이 완성됩니다.

| **Method** | **엔드포인트** | **권한** | **설명** |
| --- | --- | --- | --- |
| **POST** | /api/auth/register | 공개 | 회원가입 |
| **POST** | /api/auth/login | 공개 | 로그인 (토큰 발급) |
| **POST** | /api/auth/logout | member+ | 로그아웃 (토큰 삭제) |
| **GET** | /api/me | member+ | 내 정보 조회 |
| **스케줄 API — v7에서 상세 구현 예정** |
| **GET** | /api/schedules | member+ | 일정 목록 조회 |
| **POST** | /api/schedules | manager+ | 일정 등록 |
| **GET** | /api/schedules/{id} | member+ | 일정 단건 조회 |
| **PUT** | /api/schedules/{id} | manager+ | 일정 수정 |
| **DELETE** | /api/schedules/{id} | manager+ | 일정 삭제 |
| **현장 API — v7에서 상세 구현 예정** |
| **GET** | /api/sites | member+ | 현장 목록 조회 |
| **POST** | /api/sites | manager+ | 현장 등록 |
| **GET** | /api/sites/{id} | member+ | 현장 단건 조회 |
| **PUT** | /api/sites/{id} | manager+ | 현장 수정 |
| **DELETE** | /api/sites/{id} | manager+ | 현장 삭제 |
| **근태 API — v7에서 상세 구현 예정** |
| **GET** | /api/attendances | member+ | 근태 목록 조회 |
| **POST** | /api/attendances | member+ | 출근 기록 등록 (check_in) |
| **PUT** | /api/attendances/{id} | member+ | 퇴근 기록 업데이트 (check_out) |
| **팀 API — v7에서 상세 구현 예정** |
| **GET** | /api/teams | manager+ | 팀 목록 조회 |
| **POST** | /api/teams/join | member+ | 초대 코드로 팀 가입 |

# **4. 에러 코드 목록 (v6 기준)**

API 오류 발생 시 error_code 필드로 어떤 문제인지 확인하세요.

| **에러코드** | **HTTP** | **메시지** | **발생 상황** |
| --- | --- | --- | --- |
| **ERR_AUTH_001** | **401** | 이메일 또는 비밀번호가 틀렸습니다. | 로그인 시 이메일/비밀번호 불일치 |
| **ERR_AUTH_002** | **403** | 권한이 없습니다. | 팀원이 팀장 전용 기능 시도 |
| **ERR_AUTH_003** | **401** | 인증이 필요합니다. | 토큰 없음 또는 만료된 토큰 사용 |
| **ERR_VALID_001** | **422** | 입력값을 확인해주세요. | 필수 필드 누락, 형식 오류 |
| **ERR_VALID_002** | **422** | 이미 사용 중인 이메일입니다. | 회원가입 시 중복 이메일 |
| **ERR_VALID_003** | **422** | 날짜 형식이 올바르지 않습니다. | 일정 등록 시 날짜 형식 오류 |
| **ERR_VALID_004** | **422** | 필수 입력 항목이 누락되었습니다. | 필수 항목 비워두고 폼 제출 |
| **ERR_SCHEDULE_001** | **404** | 존재하지 않는 일정입니다. | 없는 일정 ID로 조회·수정 시도 |
| **ERR_SCHEDULE_002** | **409** | 해당 날짜에 이미 같은 현장 일정이 있습니다. | 동일 날짜·현장 중복 등록 |
| **ERR_SITE_001** | **404** | 존재하지 않는 현장입니다. | 없는 현장 ID로 조회·수정 |
| **ERR_FILE_001** | **415** | 허용되지 않는 파일 형식입니다. | PDF·JPG·PNG 외 파일 업로드 |
| **ERR_ATTEND_001** | **409** | 이미 출근 처리되었습니다. | 같은 날 출근 버튼 중복 클릭 |
| **ERR_ATTEND_002** | **409** | 출근 기록이 없어 퇴근할 수 없습니다. | 출근 없이 퇴근 버튼 클릭 |
| **ERR_ATTEND_003** | **409** | 이미 퇴근 처리되었습니다. | 같은 날 퇴근 버튼 중복 클릭 |
| **ERR_TEAM_001** | **404** | 존재하지 않는 팀입니다. | 삭제된 팀 또는 잘못된 팀 ID |
| **ERR_TEAM_002** | **409** | 이미 팀에 소속된 사용자입니다. | 이미 팀 소속 사용자가 초대코드 재가입 |
| **ERR_SERVER_001** | **500** | 서버 오류가 발생했습니다. | 예상치 못한 서버 내부 오류 |

# **변경 이력**

| **버전** | **날짜** | **작성자** | **변경 내용** |
| --- | --- | --- | --- |
| v1.0 | 2026-04-19 | — | 최초 작성 — 인증 API 4종 (회원가입·로그인·로그아웃·내 정보) 명세 완성, 전체 라우트 목록 및 에러 코드 정리 |

© 2026 Team Schedule Manager

-  -