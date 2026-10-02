# 배포 전 점검 보고서 (2026-10-02 작성)

> ✅ **2026-10-02 백엔드 실서버 배포 완료** (`7d7f099`): DB 백업(`~/backup_20261002_pre_v18_29.sql`) → git pull → 마이그레이션 8개 → 캐시 갱신 → `storage:link` 생성(업로드 이미지 서빙이 안 되던 상태였음) → 신규 API 실호출 검증까지 완료. 아래 1-2/1-3 항목은 해소됨.
> 배포 중 발견: 일정 API가 `workType` 관계를 `work_type` 키로 내보내 문자열 컬럼을 객체로 덮어쓰는 크래시 위험 → `workTypeRelation`(→ `work_type_relation` 키)으로 수정 후 재배포함. 서버 `.git` 일부가 root 소유라 `www-data`로 pull이 실패해서 소유권을 `www-data`로 맞춤.
> **남은 것**: 새 APK 배포(사용자 기기 설치), 사업자정보/약관 플레이스홀더 교체, DB 자동 백업 cron.

> 디자인 캔버스 마이그레이션(44개 화면) 완료 직후 기준. 실제 배포 전 반드시 확인/조치가 필요한 항목을 우선순위별로 정리함.
> 화면별 상세 구현 내역·디자인과의 의도적 차이점은 [DESIGN_CANVAS_MIGRATION_TODO.md](DESIGN_CANVAS_MIGRATION_TODO.md)에 더 자세히 있음 — 이 문서는 "배포 가능 여부" 관점의 요약+액션 아이템.

---

## 🔴 1. 최우선 — 배포를 막는 블로커

### 1-1. 이번 세션 작업물이 전부 Git에 커밋 안 됨
`git status` 기준 수정 34개 파일 + 신규 파일 30개+ 가 전부 워킹트리에만 존재(미커밋). 마지막 커밋은 `c25c75d`(v18.28, 어제 이전)이고, 그 이후의 **디자인 캔버스 전면 재작업 전체**(SITE_*, SCHEDULE_*, TEAM_*, QUOTE_*, TAX_*, INCOME_*, MY_RATES, QUICK_CREATE, SettingsScreen 삭제 등)가 미커밋 상태.
- **조치**: 배포/빌드 전에 반드시 커밋부터 할 것. 디스크 장애·실수로 되돌리기 한 번이면 이 세션 작업이 통째로 날아감.
- 삭제된 파일 4개(`QuoteCreateScreen.tsx`, `SettingsScreen.tsx`, `TaxSummaryScreen.tsx`, `TeamScreen.tsx`, `WageSettingsScreen.tsx`)도 `git add -A`로 반영해야 git이 삭제로 인식함.

### 1-2. 백엔드 마이그레이션 8개가 프로덕션에 미적용
로컬엔 DB가 없어 직접 `php artisan migrate`를 못 돌렸음 — 서버에서 실행 필요.

| 마이그레이션 | 영향 |
|---|---|
| `2026_10_01_190000_add_design_fields_to_sites_table.php` | `sites`에 `start_date/end_date/customer/status` 추가. 미적용 시 현장 등록/수정에서 새 필드 저장 실패(422 또는 무시) |
| `2026_10_01_193000_create_wage_profiles_table.php` | `wage_profiles` 신규 테이블(MY_RATES 화면용). 미적용 시 `GET/PUT /wage-profile` 전체가 500 |
| `2026_10_01_196000_add_design_fields_to_notification_settings_table.php` | `tax_reminder/marketing_opt_in/night_quiet_hours/schedule_reminder_time` 4개 컬럼. 미적용 시 해당 토글 저장이 새로고침하면 원복됨(에러는 안 남) |
| `2026_10_01_199000_add_design_fields_to_schedules_table.php` | `title/start_time/end_time/reminder_time` 4개 컬럼. 미적용 시 일정 등록에서 제목/시간/알림 저장 안 됨 + "공정"이 항상 "-"로 보이는 기존 버그 수정도 같이 묶여 있음(워크타입 eager-load 누락 수정) |
| `2026_10_02_100000_add_design_fields_to_teams_table.php` | `teams`에 `photo_path/description/specialty/activity_area` 추가. 미적용 시 팀 만들기에서 사진/설명/공정/지역이 전부 무시됨(이름만 저장) |
| `2026_10_02_103000_add_design_fields_to_schedules_table_2.php` | `schedules`에 `employment_type/payment_status` 추가. 미적용 시 세무/수입 화면의 고용형태·지급상태가 항상 기본값(일용근로/미지급)으로 고정 |
| `2026_10_02_106000_add_tax_type_to_quotes_table.php` | `quotes`에 `tax_type/vat_amount` 추가. 미적용 시 견적서 할인/부가세 계산이 서버에 저장되지 않고 항상 "별도 0원"으로 돌아옴 |
| `2026_10_02_110000_create_app_notifications_table.php` | 알림 피드 신규 테이블(`notifications`와 이름 충돌 방지용 `app_notifications`). 미적용 시 알림 탭 전체가 500 |

- **조치 순서**: ① 코드(백엔드 PHP 전체) 배포 → ② `php artisan migrate` → ③ 모바일 신규 APK 배포. 순서가 꼬이면 구버전 앱이 신규 컬럼 모르는 백엔드에 요청 보내다 꼬일 수 있음(단, 하위호환은 고려되어 있어 치명적이진 않음).

### 1-3. 새 백엔드 라우트 14개 — 배포 안 하면 404
```
PUT    /quotes/{id}                   (견적서 내용 수정 — 기존엔 상태변경만 가능했음)
GET    /wage-profile
PUT    /wage-profile
GET    /sites/{id}/photos
POST   /sites/{id}/photos
DELETE /sites/{id}/photos/{photoId}
POST   /teams/preview                 (초대코드만으로 팀 미리보기)
POST   /teams/{id}/photo              (팀 사진 업로드)
DELETE /teams/{id}/photo              (팀 사진 삭제)
DELETE /account                       (회원 탈퇴)
GET    /notifications
PATCH  /notifications/read-all
PATCH  /notifications/{id}/read
GET    /tax-summary/export            (세무자료 CSV 내보내기)
```
`WageProfileController.php`, `NotificationController.php`(신규 파일 2개)도 같이 배포해야 함.

### 1-4. 모바일 신규 패키지 — 빌드 서버/CI에 설치 필요
`react-native-linear-gradient@^2.8.3`, `react-native-view-shot`, `@react-native-camera-roll/camera-roll` 추가됨. `npm install` 안 하면 빌드 자체가 실패함(네이티브 모듈 포함이라 autolinking 재실행을 위해 클린 빌드 권장).

---

## 🟠 2. 남아있는 미구현 기능 (2026-10-02 대폭 해소함)

**이번에 실제로 구현 완료**(전부 신규 백엔드 배포 전까지는 동작 안 함 — 체크리스트 참고):
- [NotificationsScreen.tsx](app/src/screens/NotificationsScreen.tsx) 알림 피드 — `app_notifications` 테이블 신규 + 팀 일정추가/팀참여/견적발송 3개 트리거로 실제 적재됨
- [AppInfoScreen.tsx](app/src/screens/AppInfoScreen.tsx) 위치기반 이용약관 / [OpenSourceLicensesScreen.tsx](app/src/screens/OpenSourceLicensesScreen.tsx) 오픈소스 라이선스 / 문의하기(mailto·tel) / 회원탈퇴(`DELETE /account`, 비밀번호 재확인) — 전부 실제 동작
- [TaxExportScreen.tsx](app/src/screens/TaxExportScreen.tsx) 세무자료 "자료 생성" — `GET /tax-summary/export`로 CSV 텍스트를 받아 OS 공유 시트로 저장/전달(엑셀 선택도 CSV로 생성됨 — PhpSpreadsheet 등 전용 패키지는 설치 안 함)

**2026-10-02 추가 후속 조치 완료**(사용자 지시):
- **네이버/애플 로그인 버튼 제외**: [LoginScreen.tsx](app/src/screens/LoginScreen.tsx)에서 두 버튼을 주석 처리로 숨김(외부 계정 설정 전까지). 복원하려면 주석만 해제하면 됨.
- **명함 이미지 저장 구현 완료**: `react-native-view-shot`(캡처) + `@react-native-camera-roll/camera-roll`(갤러리 저장) 신규 설치, [BusinessCardScreen.tsx](app/src/screens/BusinessCardScreen.tsx)에서 실제 캡처→저장 동작. AndroidManifest에 `WRITE_EXTERNAL_STORAGE`(API 28 이하용) 추가. 실기기에서 MediaStore 쿼리로 저장 파일 확인까지 완료.
- **견적서 PDF 저장 제거, CSV/엑셀만 가능**: [QuotePreviewScreen.tsx](app/src/screens/QuotePreviewScreen.tsx)의 "PDF 저장" 버튼을 "CSV/엑셀 저장"으로 교체 — 클라이언트에서 바로 CSV 텍스트를 만들어 OS 공유 시트로 전달(백엔드 호출 없음). 실기기에서 공유 시트까지 확인 완료.

새 네이티브 모듈 2개(`react-native-view-shot`, `@react-native-camera-roll/camera-roll`)가 `app/package.json`에 추가됐으니, 배포 전 체크리스트의 `npm install` 항목에 포함해야 함(1-4 항목 참고).

---

## 🟡 3. 플레이스홀더 — 배포 전 실제 정보로 교체 필수

- **[AppInfoScreen.tsx](app/src/screens/AppInfoScreen.tsx)**: 사업자 정보가 디자인 원본 그대로 `[회사명]` / `[대표자명]` / `[고객센터 번호]` / `[support 이메일]`로 박혀 있음. **이대로 출시하면 안 됨.**
- 이용약관/개인정보처리방침 본문(`LegalDocumentScreen.tsx`가 참조하는 콘텐츠)도 상단에 "배포 전 반드시 회사 정보로 교체" 주석이 달려 있음 — 실제 법무 검토된 문서로 교체 필요.

---

## 🔴 1-5. 전체 워크플로우 테스트에서 발견한 실버그 (2026-10-02, 전부 수정 완료)

로그인부터 전체 메뉴를 실기기로 직접 눌러보며 테스트한 결과 찾은 버그들. 전부 코드 수정 + 타입체크 + 재빌드 + 재설치 + 실기기 재검증까지 완료함.

- **루트 스택 화면 9곳에서 바텀탭 화면 이름으로 바로 `navigate()`해서 전부 먹통이었음**: 바텀탭(`HomeDashboard`/`Schedule`/`Profile`) 내부가 아니라 루트 스택에 떠 있는 화면들이 `navigation.navigate('HomeDashboard')`처럼 탭 화면 이름을 직접 불렀는데, 이건 루트 스택 입장에선 존재하지 않는 라우트라 React Navigation이 조용히 무시함(에러도 안 뜨고 그냥 아무 반응 없음 — 같은 네비게이터 "안"에서 호출할 때만 유효한 이름이라 바깥에서 부르면 실패함). 영향받은 곳:
  - [IncomeListScreen](app/src/screens/IncomeListScreen.tsx) / [QuoteListScreen](app/src/screens/QuoteListScreen.tsx) / [SiteListScreen](app/src/screens/SiteListScreen.tsx) / [TaxHomeScreen](app/src/screens/TaxHomeScreen.tsx) / [TeamListScreen](app/src/screens/TeamListScreen.tsx) / [ScheduleDayScreen](app/src/screens/ScheduleDayScreen.tsx) / [ScheduleDetailScreen](app/src/screens/ScheduleDetailScreen.tsx) — 뒤로가기 버튼이 전부 눌러도 반응 없었음 → `onBackPress` 오버라이드를 제거해 `AppHeader` 기본 동작(`navigation.goBack()`)을 쓰도록 수정
  - [NotificationsSettingScreen](app/src/screens/NotificationSettingsScreen.tsx) / [MyRatesScreen](app/src/screens/MyRatesScreen.tsx) — 동일하게 수정
  - **[ScheduleDetailScreen](app/src/screens/ScheduleDetailScreen.tsx)의 "일정 삭제" 성공 후 네비게이션도 같은 버그** — 삭제 자체는 서버에서 성공했는데 화면 전환이 안 돼서 사용자가 "삭제가 안 됐나?"하고 다시 누르면 "일정을 찾을 수 없습니다" 에러가 뜨는 혼란스러운 흐름이었음(이번 세션 실기기 테스트 중 직접 겪은 버그). `navigation.navigate('MainTabs', { screen: 'Schedule' })`로 명시적 중첩 네비게이션 경로를 써서 수정
  - [SiteDetailScreen](app/src/screens/SiteDetailScreen.tsx)의 "일정 이력 전체 보기" 링크도 동일하게 수정
- **ScheduleCreateScreen/ScheduleDetailScreen — 이미 삭제된 일정을 열면 영구 고착**: 수정/상세 조회가 실패했을 때 `Alert.alert('조회 실패', ...)`에 확인 버튼 콜백이 없어서, 사용자가 "확인"을 눌러도 빈 폼에 그대로 남아있고 알림만 계속 다시 뜸(뒤로가기를 눌러도 포커스 이벤트가 재발동되어 같은 일정을 다시 조회 시도). "확인" 버튼에 `navigation.goBack()`을 연결해서 수정함.
- **HomeDashboardScreen "견적 현황" 섹션이 API 에러 시 통째로 사라짐**: 다른 섹션(수입/오늘의 일정)은 에러 시 빈 상태를 보여주는데 이 섹션만 `null`로 떨어뜨려 전체가 안 보였음 — 에러 시에도 0건으로 표시되도록 통일함.

## 🟢 4. 디자인 대비 의도적으로 생략/대체한 기능 (버그 아님, 재확인용 요약)

2026-10-02: 사용자 지시로 QR코드·"초대 대기중" 상태를 제외한 나머지 항목(팀 생성 필드, 팀 미리보기, 견적서 할인/부가세, 세무·수입 고용형태/지급상태)을 전부 디자인대로 구현 완료함. 상세는 [DESIGN_CANVAS_MIGRATION_TODO.md](DESIGN_CANVAS_MIGRATION_TODO.md) 참고. **단, 전부 위 1-2/1-3의 신규 마이그레이션·라우트 배포가 끝나야 실제로 동작함.**

이제 의도적으로 남겨둔 항목은 아래 두 가지뿐:

- **팀 초대 QR**: 장식용 패턴이고 실제 스캔 기능 없음(TEAM_INVITE) — 사용자 지시로 이번 작업 범위에서 제외.
- **"초대 대기중" 상태**: 초대코드 입력 즉시 가입되는 구조라 "대기 중" 개념 자체가 없음 — 사용자 지시로 이번 작업 범위에서 제외.
- 명함 QR: 이와 별개로, 이전 세션에서 사용자 피드백으로 완전히 제거함(공유는 카카오톡/문자/링크복사로 충분하다는 판단).
- ~~홈 대시보드 "내수입" 경로가 `IncomeListScreen`으로 바뀌면서 구 `MySummaryScreen`이 고아 화면이 됨~~ → **2026-10-02 정리 완료**: 아무 화면에서도 더 이상 참조하지 않는 것을 확인하고 `MySummaryScreen.tsx`, `monthStore.ts`(마찬가지로 완전히 미사용) 둘 다 삭제하고 `AppNavigator.tsx`의 라우트도 제거함(SettingsScreen 때와 동일한 패턴).

---

## 🔵 5. 인프라 — 서버 측 미완료 항목 (SERVER_SETUP_NCP.md 기준)

- **큐 워커**: `QUEUE_CONNECTION=database`로 당장은 안 막히지만, 알림 등 백그라운드 작업이 실제로 쌓이기 시작하면 `supervisor`로 `php artisan queue:work` 상시 실행 필요. `schedule:run` cron 등록도 미확인.
- **DB 백업**: 자동 백업 스크립트/cron이 아예 없음. 실사용자 데이터가 쌓이기 전에 반드시 구성.
- **결제수단 등록 여부**: NCP Micro(g3) 1년 무료 혜택 조건 확인 필요(사용자 본인이 진행했는지 미확인 상태로 메모 남아있음).
- HTTPS(sslip.io)는 적용 완료됐다고 기록되어 있으나, 실제 커스텀 도메인 연결 여부는 별도 확인 필요.

---

## ⚪ 6. 확인만 하고 넘어갈 것 (과거 이슈, 현재는 해소된 것으로 보임)

- **Play Protect 설치 차단**: 과거(v18.21 시점) APK 설치가 막혔던 기록이 있으나, 이번 세션에서 같은 방식(adb install)으로 반복 설치가 전부 정상 동작했음. 다만 이건 adb 직접 설치일 뿐, **실제 Play 스토어 내부 테스트/일반 배포 경로에서의 설치 차단 여부는 별도로 재확인 필요**(adb 성공이 Play Store 경로의 안전을 보장하지 않음).
- **역할(role_id) 전역 한계**: 여러 팀 동시 소속 시 권한은 "활성 팀" 기준으로만 반영됨(의도된 v1 범위 제한, 버그 아님) — 사용자 안내 문구가 있는지 확인.

---

## 체크리스트 요약 (배포 당일 순서)

- [ ] 현재 워킹트리 전체 커밋 (삭제 파일 포함)
- [ ] `app/package.json` 변경사항 반영해 `npm install` (react-native-linear-gradient)
- [ ] 백엔드 코드 전체 배포 (신규 컨트롤러 `WageProfileController`/`NotificationController` 포함)
- [ ] `php artisan migrate` 실행 (신규 마이그레이션 8개)
- [ ] 신규 라우트 14개 정상 응답하는지 서버에서 curl로 1차 확인
- [ ] AppInfoScreen 사업자 정보 플레이스홀더 → 실제 정보로 교체
- [ ] 이용약관/개인정보처리방침 콘텐츠 실제 문서로 교체
- [ ] 새 릴리즈 APK 빌드 + 설치 테스트
- [ ] DB 백업 cron 구성 (배포 전이 이상적)
- [ ] "준비 중" 처리된 기능들(2번 섹션)에 대해 출시 공지/고객 안내 문구 필요 여부 검토
