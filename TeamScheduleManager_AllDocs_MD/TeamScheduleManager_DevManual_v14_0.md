*Team Schedule Manager  |  개발 매뉴얼 v14 (모바일 명함 + QR 공유)*

**Team Schedule Manager**

**개발 매뉴얼 v14**

**모바일 명함 + QR 공유 (웹 대시보드 1차 구현)**

*기획서 `BusinessCardFeature_v1.0` 반영 — 로드맵 1차 출시 6번째 핵심 기능*

작성일: 2026-09-19

대상 OS: Windows 10/11

*기준: v13(자동 보고서 공유) 완료*

| **★ v14 핵심 안내** **• 기획서(`TeamScheduleManager_BusinessCardFeature_v1_0.md`)는 명함을 "모바일 화면 + React Native Share API"로 설계했지만, 이번 작업은 이 리포지토리의 웹 프론트엔드에 우선 구현했습니다. 모바일 앱(BusinessCardScreen 등)은 이번 범위 밖입니다 — 8장 참조.** **• 기획서 6-1절의 "견적서 PDF에 QR 삽입"은 이 프로젝트에 견적서(Quote) 기능 자체가 없어 스킵하고, 6-2절의 "자동 보고서(v12/13) PDF에 QR 삽입"만 구현했습니다.** **• 기획서는 "연락처는 회원가입 정보 자동 채움"이라 했지만 `users` 테이블에 `phone` 컬럼이 없어 명함에서 직접 입력받도록 설계를 변경했습니다.** |
| --- |

# **0. 전체 매뉴얼 시리즈 (갱신)**

| **버전** | **제목** | **상태** |
| --- | --- | --- |
| v1~v13 | (이전 매뉴얼 참조, 생략) | ✅ 완료 |
| **v14 ◀** | **모바일 명함 + QR 공유 (웹 1차)** | **▶ 현재** |

# **1. 설계서 대비 변경점**

| **기획서 설계** | **실제 구현** | **사유** |
| --- | --- | --- |
| 연락처는 회원가입 정보 자동 채움 | `business_cards.contact_phone`을 명함에서 직접 입력 | `users` 테이블에 phone 컬럼 없음 |
| 모바일 화면(BusinessCardScreen 등) | 웹 대시보드 페이지(`BusinessCard.tsx`)로 우선 구현 | 이 리포지토리의 개발 패턴(v11.6 이후 신규 기능을 웹에 먼저 붙이는 것)과 일치, 모바일은 범위 밖 |
| 견적서 PDF에 QR 삽입 | 자동 보고서(v12/13) PDF에 QR 삽입으로 대체 | 이 프로젝트에 견적서(Quote) 기능이 없음 |
| 카카오톡 공유 버튼 (React Native Share API) | 미구현. 대신 "공유 링크 복사"(clipboard) | 카카오 SDK/딥링크 연동은 이번 범위 밖 |
| 시공 사진 3장 수동 선택 + 자동 추천 | 자동 추천만 구현(최근 업로드 3장), 수동 재선택 UI 없음 | MVP 범위 축소 |

# **2. DB 설계**

기획서 5장을 그대로 따르되, `business_cards`에 `contact_phone` 컬럼을 추가했습니다(위 1장 참조).

- `business_cards`: `user_id`(unique, FK 제약 없음 — 이 프로젝트 정책), `share_code`(unique), 표시 정보 필드들, `showcase_photo_ids`(JSON), `is_public`, `view_count`/`monthly_view_count`/`last_viewed_at`, softDeletes.
- `card_views`: `card_id`, `viewer_ip_hash`(SHA-256), `user_agent`, `referrer`, `viewed_at`.

# **3. 백엔드 구현**

## **3.1 BusinessCardController (인증 필요, `/api/business-card`)**

- `show()`: 내 명함 조회(없으면 `data: null`).
- `store()`: upsert — 없으면 생성(`share_code` 자동 발급), 있으면 수정. `showcase_photo_ids`를 요청에 명시하지 않으면 `autoSelectShowcasePhotos()`가 본인이 업로드한 최근 사진(`SiteFile.uploaded_by`) 중 최대 3장을 자동 채움.
- `destroy()`: 명함 soft delete.

## **3.2 BusinessCardPageController (인증 불필요, `routes/web.php`의 `/c/{code}`)**

기획서 2-3절("앱 설치 없이도 볼 수 있어야 함") 때문에 `/api` 프리픽스가 붙는 `api.php`가 아니라 `web.php`에 등록했습니다.

- `share_code`로 명함을 찾고 `is_public=false`면 404.
- 조회 시 IP를 SHA-256 해시해 최근 30분 내 같은 해시의 조회가 있으면 카운트하지 않음(중복 방지, 기획서 5-2절). 아니면 `card_views`에 로그를 남기고 `view_count`/`monthly_view_count`를 증가시킴.
- `resources/views/cards/show.blade.php`를 렌더링 — Open Graph 메타태그, 프로필/직함/지역/전문분야/한줄소개, 전화 버튼(`tel:`), 시공 사진 그리드, 워터마크 푸터.

## **3.3 자동 보고서 PDF에 QR 삽입 (`SiteReportController`)**

`renderAndStorePdf()`가 보고서 작성자의 공개 명함이 있으면 `endroid/qr-code`로 `{APP_URL}/c/{share_code}`를 가리키는 QR PNG를 base64 data URI로 만들어 `reports.basic` 뷰에 전달합니다. 명함이 없거나 비공개면 QR 섹션 자체가 생략됩니다.

# **4. 웹 프론트엔드 구현**

- `frontend/src/api/businessCard.ts`: `getMyBusinessCard`, `saveBusinessCard`, `deleteBusinessCard`, `getPublicCardUrl`.
- `frontend/src/pages/BusinessCard.tsx`: 명함이 없으면 생성 폼만, 있으면 폼 + 공유 링크 복사 + 조회 통계(누적/이번 달)를 함께 보여줌.
- `AdminLayout.tsx` 사이드 메뉴에 "내 명함" 추가, `App.tsx`에 `/business-card` 라우트 추가.

# **5. 테스트 결과 (2026-09-19 수행)**

| **#** | **시나리오** | **결과** |
| --- | --- | --- |
| 1 | 명함 없는 상태에서 GET /api/business-card | `data: null` 정상 |
| 2 | PUT으로 명함 생성 (showcase_photo_ids 미지정) | 최근 업로드 사진 1장이 자동으로 `showcase_photo_ids`에 채워짐 |
| 3 | `GET /c/{code}` (인증 없이 curl) | 200, HTML 페이지 정상 렌더링, 이름/연락처/포트폴리오 확인 |
| 4 | 같은 IP로 3회 연속 조회 | `view_count`가 1로만 증가(중복 방지 정상 동작) |
| 5 | 보고서 생성 → 다운로드 | PDF 마지막 페이지에 QR코드 + 안내문구 정상 삽입 확인(이미지 렌더 직접 확인) |
| 6 | 웹 브라우저로 로그인 → "내 명함" 메뉴 → 폼 작성 → 저장 → 공유 링크로 접속 | 실제 폼 입력 → 저장 → 공개 페이지 노출까지 전 과정 확인 |

테스트에 사용한 팀/사용자/명함/사진은 전부 정리했습니다.

# **6. 발생한 시행착오**

## **6.1 `/c/{code}` 접속 시 500 — sessions 테이블 없음**

증상: 명함 공개 페이지에 처음 접속하니 500 에러.

원인: 이 프로젝트는 지금까지 순수 API 서버로만 운영되어 `routes/web.php`에 실제 페이지를 둔 적이 없었습니다. `.env`의 `SESSION_DRIVER=database`인데 `sessions` 테이블이 마이그레이션되어 있지 않았고, 새로 추가한 웹 라우트가 `web` 미들웨어 그룹(`StartSession` 포함)을 타면서 이 잠재적 설정 누락이 처음으로 드러났습니다.

해결: `php artisan session:table && php artisan migrate`로 `sessions` 테이블을 추가해서 근본적으로 해결(미들웨어를 우회하는 임시방편 대신 정공법 선택).

## **6.2 QR 이미지 라이브러리 선정**

`endroid/qr-code`(+ `bacon/bacon-qr-code`)를 사용했습니다. GD 확장이 이미 설치되어 있어 별도 설정 없이 PNG 생성이 바로 동작했습니다.

# **7. 무료/유료 차별 (기획서 7절 반영 여부)**

기획서는 사진 개수(무료 3장/유료 12장)와 조회수 통계 상세도로 차별화하라고 했으나, **이 프로젝트에는 아직 유료/무료 플랜 구분 로직 자체가 없습니다**(`users.individual_plan` 컬럼은 있지만 사용되는 곳이 없음). 이번 구현은 우선 무료 티어 기준(3장 자동 추천)으로만 만들었고, 플랜별 차등 적용은 결제 시스템이 생기기 전까지는 의미가 없어 보류했습니다.

# **8. 알려진 제한 사항 / 다음 단계**

- **모바일 앱 미구현**: React Native에는 명함 생성/조회 화면이 없습니다. 앱에서 명함을 관리하려면 `BusinessCardScreen`/`CardEditScreen`/`CardShareModal`을 별도로 만들어야 합니다.
- **카카오톡 공유 미구현**: 링크 복사만 지원. 기획서의 "카톡으로 보내기" 버튼(React Native Share API)은 모바일 작업과 함께 다뤄야 합니다.
- **시공 사진 수동 재선택 UI 없음**: 항상 최근 3장 자동 선택. 사용자가 어떤 사진을 보여줄지 고르는 기능은 미구현.
- **프로필 사진 업로드 UI 없음**: `profile_photo_path` 컬럼은 있지만 이를 채우는 업로드 폼이 없습니다(비어있으면 이니셜 아바타로 대체 표시).
- **월별 조회수 리셋 로직 없음**: `monthly_view_count`가 매달 자동으로 0으로 초기화되는 스케줄 작업이 없어, 이름과 달리 계속 누적됩니다. 실제 "이번 달" 의미를 가지려면 스케줄러(예: 매월 1일 0시 리셋 Job) 추가가 필요합니다.
- **플랜별 차별화 없음**: 위 7장 참조.

# **변경 이력**

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| v14.0 | 2026-09-19 | business_cards/card_views 마이그레이션, BusinessCard/CardView 모델, BusinessCardController(CRUD) + BusinessCardPageController(공개 페이지, 조회 추적) 신규, 자동 보고서 PDF에 명함 QR 자동 삽입(endroid/qr-code), 웹 프론트엔드 "내 명함" 페이지 신규. sessions 테이블 누락 버그 발견 및 수정(session:table 마이그레이션 추가) |

*— v14 매뉴얼 — 모바일 명함 웹 1차 구현 완료 —*

© 2026 Team Schedule Manager
