*Team Schedule Manager  |  개발 매뉴얼 v18 (모바일 앱 화면 — 팀/견적/보고서/명함/세무자료 + 설정 3종 + 법적 문서)*

**Team Schedule Manager**

**개발 매뉴얼 v18**

**모바일 앱 화면 5종 추가(v11.8·v12.1·v12~v13·v14·v17 모바일 연동) + 실기기 검증 완료 + 설정 화면 스텁 실구현**

최초 작성일: 2026-09-19
최종 갱신일: 2026-09-20

대상 OS: Windows 10/11 (React Native 개발 환경)

*기준: v12.1(견적서) 완료. v11.8/v12.1/v12~13/v14/v17을 웹 대시보드로만 구현하고
모바일 화면 없이 넘어갔던 것을 사용자가 지적해서 이번에 채워 넣음. 이후 2026-09-19~20에
걸쳐 Android 에뮬레이터(Pixel_8)로 실기기 검증을 완료했고, 그 과정에서 발견한 버그 2건을
수정했으며, 설정 화면의 미구현 스텁 5개도 전부 채워 넣었다(v18.1~v18.3, 3장 참고).*

| **★ v18 현재 상태 요약 — 반드시 읽을 것** **• 최초 작성 시에는 에뮬레이터가 없어 `tsc`/`eslint` 정적 검증만 했으나, 이후 세션에서 Pixel_8 에뮬레이터로 실제 APK를 빌드·설치해서 전 화면과 핵심 CRUD 플로우를 실기기에서 검증 완료했다(4장 참고).** **• 검증 과정에서 실제 버그 2건을 발견해 수정·배포했다: ①견적서 목록 화면 크래시(3자리 hex 색상 코드 버그, 커밋 7fa21d3), ②로그인 세션이 앱 재실행 시 복원되지 않던 버그(커밋 3c815d6). 둘 다 아래 4-1장에 상세 기술.** **• PDF 다운로드(견적서·세무자료)는 여전히 모바일 미지원 — "웹 대시보드에서 다운로드하세요" 안내로 대체(정책 변경 없음).** **• 공유 링크가 있는 자동 보고서·명함은 인증이 필요 없어서 `Linking.openURL()`로 바로 열람 가능.** |
| --- |

# **1. 추가된 화면 목록 (v18.0)**

| **화면** | **파일** | **진입 경로** |
| --- | --- | --- |
| 팀 관리 | `TeamScreen.tsx` | Drawer "👥 팀 관리" |
| 견적서 목록 | `QuoteListScreen.tsx` | Drawer "💵 견적서 관리" |
| 견적서 작성 | `QuoteCreateScreen.tsx` | QuoteListScreen의 "+ 견적 작성" 버튼 |
| 자동 보고서 관리 | `ScheduleReportsScreen.tsx` | ScheduleDetailScreen의 "자동 보고서 관리" 버튼 |
| 내 명함 | `BusinessCardScreen.tsx` | Drawer "🪪 내 명함" |
| 세무 자료 | `TaxSummaryScreen.tsx` | Drawer "🧾 세무 자료" |

# **2. API 모듈 신규 추가 (v18.0)**

`teamApi.ts`, `quoteApi.ts`, `reportApi.ts`, `businessCardApi.ts`, `taxSummaryApi.ts` — 전부 웹 프론트엔드(`frontend/src/api/*.ts`)의 대응 파일과 같은 엔드포인트를 호출하며, 기존 `axiosInstance.ts`(AsyncStorage 토큰 자동 첨부)를 그대로 재사용한다.

`types/api.ts`에 `Team`, `Quote`, `QuoteLine`, `UserMaterial`, `SiteReport`, `BusinessCard`, `TaxSummary`, `TaxMonthRow` 타입을 추가했다.

# **3. 화면별 설계 메모 (v18.0)**

## **3.1 TeamScreen**

팀 없음/있음 두 상태를 하나의 화면에서 분기 처리(웹 `Teams.tsx`와 동일한 UX). 초대 코드는 `Share.share()`(React Native 코어 API, 별도 설치 불필요)로 카톡/문자 등에 바로 공유 가능. 팀 이름 수정·삭제는 이번 모바일 화면에서 제외(웹에서만 가능) — 조회+생성+가입까지만 지원.

## **3.2 QuoteListScreen / QuoteCreateScreen**

작성 화면을 목록과 분리된 별도 Stack 화면으로 만들었다(이 앱이 이미 `ScheduleCreateScreen`을 `ScheduleDetailScreen`과 분리해둔 기존 패턴과 통일). 항목(줄) 추가는 `useState` 배열로 관리하고, `내 자재 목록`(`getMaterials()`)을 가로 스크롤 버튼 형태로 보여줘 탭 한 번으로 항목명/단위/단가를 자동 채운다(웹의 AutoComplete를 모바일 터치에 맞게 버튼 형태로 재구성).

## **3.3 ScheduleReportsScreen**

기존 `ScheduleDetailScreen.tsx`를 최소 침습으로 수정 — `handleReportsPress` 함수 하나와 버튼 하나만 추가하고, 실제 보고서 생성/목록/공유/삭제 로직은 전부 별도 화면으로 분리했다(702줄짜리 기존 파일에 로직을 더 얹으면 회귀 위험이 커서 분리를 택함).

## **3.4 BusinessCardScreen**

명함 미리보기는 `Linking.openURL(getPublicCardUrl(...))`로 기기의 기본 브라우저를 열어 보여준다(앱 내 WebView는 이번 범위 밖). 공유는 `Share.share()`.

## **3.5 TaxSummaryScreen**

연도 이동 버튼(◀/▶) + 카드 4개(총수입/총경비/예상원천징수/실수령) + 월별 리스트. PDF는 웹 안내로 대체(1장 참조).

# **4. 실기기 검증 결과 (2026-09-19~20, Pixel_8 에뮬레이터)**

Android 에뮬레이터에서 실제 APK를 빌드(`gradlew.bat app:assembleDebug`)해서 설치하고, adb 자동화(스크린샷/탭/uiautomator dump)로 전 화면과 핵심 인터랙션을 검증했다.

## **4.1 발견 및 수정한 버그 2건**

**버그 ① 견적서 목록 화면 크래시 (커밋 `7fa21d3`)**
`QuoteListScreen.tsx`의 `STATUS_LABEL.draft.color`가 `'#999'`(3자리 축약형 hex)로 정의되어 있었음. 배경색 계산 코드가 `color + '22'`로 알파값을 붙이는데, `'#999' + '22'` = `'#99922'`(5자리, 유효하지 않은 hex)가 되어 `Unable to parse color from string` 렌더 에러로 앱이 크래시됨. 새로 만든 견적은 기본 상태가 draft이므로 **견적서를 하나라도 만들면 목록 화면 진입 시 100% 재현되는 심각한 버그**였다. `'#999999'`(6자리)로 수정. `tsc`/`eslint`로는 잡을 수 없는 유형(문자열 연산 결과가 런타임에만 검증됨) — 실기기 테스트 없이 배포했다면 사용자가 첫 견적서 작성 직후 마주쳤을 크래시.

**버그 ② 로그인 세션 미복원 (커밋 `3c815d6`)**
`authStore.ts`에 앱 시작 시 AsyncStorage에서 로그인 토큰을 복원하는 `restoreAuth()` 함수가 이미 구현되어 있었으나, **`AppNavigator`에서 한 번도 호출되지 않고 있었음**. 토큰은 정상적으로 저장되는데, 앱을 완전히 종료(강제종료/스와이프 종료)했다가 재실행하면 매번 로그인 화면부터 다시 시작해야 했던 것. `AppNavigator` 마운트 시 `useEffect(() => { restoreAuth() }, [])`를 추가하고 복원 중에는 로딩 스피너를 표시하도록 수정. 실기기에서 `force-stop` → 재실행 → 로그인 화면 없이 세션 자동 복원 확인.

## **4.2 화면별 검증 결과**

| **화면/기능** | **검증 결과** |
| --- | --- |
| LoginScreen, HomeScreen(+ CalendarScreen), TeamScreen, TaxSummaryScreen, MySummaryScreen, ProfileScreen, SettingsScreen, WageSettingsScreen | ✅ 렌더링 정상 |
| BusinessCardScreen | ✅ 저장/수정 → DB 반영까지 end-to-end 확인 |
| ScheduleReportsScreen | ✅ PDF 보고서 생성 → SiteReport 레코드 생성, share_token/pdf_path 발급 확인 |
| QuoteListScreen / QuoteCreateScreen | ✅ 항목 입력 → 총액 계산 → 저장 → DB 반영, 승인 시 Schedule 자동 생성까지 확인 |
| ScheduleCreateScreen / ScheduleDetailScreen | ✅ 등록/수정/삭제, 사진 추가 버튼 → 네이티브 포토피커 호출 확인 |
| 팀 생성 UI / 팀 초대코드 가입 | ✅ 관리자 계정이 만든 초대코드를 팀원 role 계정이 입력 → team_id 반영, role 구분 표시 확인 |
| 로그아웃 | ✅ 확인 다이얼로그 → 로그인 화면 복귀 |
| 로그인 세션 유지(재실행) | ✅ 버그 ② 수정 후 확인 |
| AttendanceScreen(근태) | ✅ v7 예정 안내 플레이스홀더, 의도된 상태(버그 아님) |

| 미검증 | PhotoCompareScreen 실사진 비교(에뮬레이터에 사진 데이터 없어 스킵), 견적서 자재 자동완성 UI, MySummaryScreen 월 이동(◀/▶) |

**중요 발견 (버그 아님, 설계 특성)**: superadmin role은 백엔드에서 `/api/teams` 조회 시 전체 팀 목록을 반환하도록 의도적으로 설계되어 있음(TeamController 주석에 명시). 테스트 계정을 만들 때 role_id를 superadmin(1)이 아닌 manager(2)나 member(3)로 지정해야 "내 팀만 보이는" 일반 사용자 시나리오를 정확히 재현할 수 있다.

# **5. v18.1~v18.3 — 설정 화면 스텁 실구현 (2026-09-20)**

v18.0 시점에는 SettingsScreen(설정 메뉴)의 5개 항목이 전부 `onPress={() => {}}` 빈 스텁이었다. 사용자 요청으로 전부 실제 기능으로 교체했다.

## **5.1 공정별 단가 설정 (v18.1)**

이미 있던 `WageSettingsScreen.tsx`(ProfileScreen의 "내 단가 설정"과 동일 화면)를 재사용, `navigation.navigate('WageSettings')` 연결만 추가. 신규 코드 없음.

## **5.2 현장 목록 (v18.1)**

백엔드 Site 모델·`SiteController`·API(`GET/POST/PUT/DELETE /api/sites`)는 이미 존재해서 재사용. 모바일 쪽만 신규 작성:
- `app/src/api/siteApi.ts`
- `app/src/screens/SiteListScreen.tsx` — WageSettingsScreen과 동일한 목록+모달 CRUD 패턴(주소/아파트명/동/호/평수/메모 입력)

## **5.3 알림 설정 (v18.1)**

백엔드에 알림 인프라가 전혀 없어서(FCM 토큰 저장, 알림 설정 테이블 등 0개) 새로 설계함. 실제 푸시 발송(FCM 등) 인프라는 범위 밖 — 이 설정값은 추후 발송 로직이 붙었을 때 참조할 기준값으로만 저장한다.

- **DB**: `notification_settings` 테이블 신규(user_id당 1행, `schedule_reminder`/`team_activity`/`quote_update`/`report_view` boolean 4개, 전부 기본 true)
- **백엔드**: `NotificationSettingController` — GET은 `firstOrCreate()` 후 조회(자동 생성), PUT은 부분 업데이트. 라우트: `GET/PUT /api/notification-settings`
- **모바일**: `notificationSettingsApi.ts`, `NotificationSettingsScreen.tsx` — 토글마다 즉시 저장(낙관적 업데이트, 실패 시 롤백)
- **개발 중 자체 발견한 버그**: `firstOrCreate()`로 신규 생성한 직후의 모델 인스턴스는 DB 컬럼 기본값(boolean true들)을 갖고 있지 않아서(MySQL이 INSERT 시 기본값을 애플리케이션에 돌려주지 않음), 최초 1회 조회 시 booleans가 응답에서 통째로 빠지는 문제가 있었음. `$setting->refresh()`를 추가해 즉시 수정.

## **5.4 이용약관 / 개인정보 처리방침 (v18.3)**

사업자 정보(상호명·대표자·사업자등록번호·주소·연락처)가 필요한 법적 문서라 임의로 지어낼 수 없어 사용자에게 범위를 확인 — "일반 템플릿으로 작성"을 선택받아 진행함.

- `app/src/constants/legalDocuments.ts` — `[회사명]`, `[대표자명]`, `[사업자등록번호]`, `[연락처]`, `[시행일자]` 등 대괄호 placeholder가 포함된 표준 템플릿 텍스트
- `app/src/screens/LegalDocumentScreen.tsx` — `route.params.type`(`'terms' | 'privacy'`)으로 문서 종류만 분기하는 단일 정적 화면, API 호출 없음

**★ 배포 전 필수 조치**: 이 두 문서는 실제 배포 전 반드시 ①대괄호 부분을 실제 사업자 정보로 교체하고 ②법무 검토를 받아야 한다. 현재 상태로 앱스토어에 제출하면 안 된다.

## **5.5 v18.1~v18.3 실기기 검증**

세 신규 화면(알림 설정/현장 목록/공정별 단가) 전부 등록→조회→수정→삭제 end-to-end 확인, DB 반영까지 curl+tinker로 교차 검증. 이용약관/개인정보 처리방침 두 화면은 렌더링 확인(정적 화면이라 별도 API 검증 불필요).

# **6. 알려진 제한 사항**

- PDF 다운로드(견적서·세무자료)는 모바일에서 지원하지 않음 — 웹 대시보드 이용 안내.
- 팀 이름 수정/삭제는 모바일에서 지원하지 않음(웹 전용).
- 명함 미리보기가 앱 내 WebView가 아니라 외부 브라우저로 열림.
- 견적서 상태 변경(전달됨/반려) UI 없음 — 승인/삭제만 지원.
- 설정 화면의 이용약관/개인정보 처리방침은 placeholder 템플릿 상태 — 실 배포 전 실제 정보로 교체 및 법무 검토 필수(5.4 참고).
- 알림 설정은 저장만 될 뿐 실제 푸시 발송(FCM 등) 인프라가 없음 — 발송 기능은 별도 작업 필요.
- PhotoCompareScreen(사진 비교)은 아직 실기기에서 실사진으로 검증되지 않음.

# **변경 이력**

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| v18.0 | 2026-09-19 | TeamScreen/QuoteListScreen/QuoteCreateScreen/ScheduleReportsScreen/BusinessCardScreen/TaxSummaryScreen 신규, 대응 API 모듈 5개 신규, types/api.ts 확장, AppNavigator에 Drawer 4개+Stack 2개 등록, ScheduleDetailScreen에 보고서 진입 버튼 추가. 최초 작성 시점엔 실기기 검증 미실시 |
| v18.0 실기기 검증 | 2026-09-19~20 | Pixel_8 에뮬레이터로 전 화면·핵심 CRUD 플로우 실기기 검증 완료. 버그 2건 발견·수정: 견적목록 색상 크래시(7fa21d3), 로그인 세션 미복원(3c815d6) |
| v18.1 | 2026-09-20 | 현장 목록(SiteListScreen 신규) + 알림 설정(notification_settings 테이블·API·화면 신규) 구현, 공정별 단가 설정은 기존 화면 연결. 커밋 b138d6d |
| v18.3 | 2026-09-20 | 이용약관/개인정보 처리방침 화면 추가(placeholder 템플릿). 커밋 ec41867 |

*— v18 매뉴얼 — 웹 대시보드에만 있던 v11.8~v17 기능들의 모바일 화면 채움 + 실기기 검증 완료 + 설정 화면 스텁 5개 전부 실구현 —*

© 2026 Team Schedule Manager
