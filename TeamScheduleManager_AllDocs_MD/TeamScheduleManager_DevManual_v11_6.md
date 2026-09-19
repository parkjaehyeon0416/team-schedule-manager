*Team Schedule Manager  |  개발 매뉴얼 v11.6~v11.7 (홈 화면 개편 + 공통 헤더, 소급 작성)*

**Team Schedule Manager**

**개발 매뉴얼 v11.6 ~ v11.7**

**모바일 홈 화면 개편 + 공통 헤더(AppHeader) 도입**

*2026-09-19 소급 작성 — 실제 커밋(`0ce8dc5`, `aff5e06`)을 기준으로 사후 문서화*

작성일: 2026-09-19 (원 작업일: 2026-06-13 / 2026-06-27)

대상 OS: Windows 10/11

*기준: v11 완료(현장 사진 구조화) / DevManual v11.0*

| **★ 이 문서에 대하여** **이 매뉴얼은 v11.0 이후 두 커밋(`0ce8dc5` "홈 화면 개편 + UI 버그 수정", `aff5e06` "공통헤더 및 오류 수정")이 문서화되지 않은 채 v11.6까지 작업이 진행되어 발생한 문서-코드 갭을 메우기 위해 2026-09-19에 사후 작성되었습니다.** **• 실제 작업일은 각각 2026-06-13, 2026-06-27이며, 코드 자체는 이미 리포지토리에 존재합니다.** **• 코드 내부 주석(`AppHeader.tsx` 상단)은 이 작업을 "v11.7"로 표기하고 있어, 커밋 메시지의 "v11.6"과 내부 버전 표기가 한 단계 어긋나 있습니다. 향후 버전 표기는 커밋 메시지가 아니라 코드 주석 기준으로 통일하는 것을 권장합니다.** |
| --- |

# **0. 전체 매뉴얼 시리즈 (갱신)**

| **버전** | **제목** | **상태** |
| --- | --- | --- |
| v1~v10.3 | (v11.0 문서 0장과 동일, 생략) | ✅ 완료 |
| v11 | 현장 사진 구조화 (시공 전·중·후) | ✅ 완료 |
| **v11.6~v11.7 ◀** | **홈 화면 개편 + 공통 헤더(AppHeader) 도입** | **▶ 현재 (소급 작성)** |
| v12 | 자동 보고서 생성 1단계 (PDF) | ⏳ 예정 |

# **1. 이 작업이 다루는 범위**

## **1.1 변경된 파일 (커밋 기준)**

| **커밋** | **날짜** | **파일** | **변경 성격** |
| --- | --- | --- | --- |
| `0ce8dc5` | 2026-06-13 | `app/src/screens/HomeScreen.tsx` | 대폭 재작성 (251줄 변경) — 자체 헤더(☰/🏠/연월/오늘) + 요약 스트립 재구성 |
| `0ce8dc5` | 2026-06-13 | `app/src/screens/CalendarScreen.tsx` | 대폭 확장 (688줄 변경) — `CalendarHandle`(ref로 `goToday`/`jumpToDate` 노출), 셀 높이 동적 계산 |
| `0ce8dc5` | 2026-06-13 | `app/src/screens/LoginScreen.tsx`, `MySummaryScreen.tsx` | UI 버그 수정 |
| `0ce8dc5` | 2026-06-13 | `app/src/navigation/AppNavigator.tsx` | 홈 화면 네비게이션 구조 조정 |
| `0ce8dc5` | 2026-06-13 | `backend/config/database.php` | 설정 1줄 변경 (DB 커넥션 관련 사소한 수정) |
| `aff5e06` | 2026-06-27 | `app/src/components/AppHeader.tsx` **(신규)** | HomeScreen에서 만든 헤더를 공통 컴포넌트로 추출·일반화 |
| `aff5e06` | 2026-06-27 | `app/src/navigation/AppNavigator.tsx` | 화면별 헤더를 `headerShown: false` + `AppHeader`로 통일 (92줄 변경) |
| `aff5e06` | 2026-06-27 | `AttendanceScreen`, `CalendarScreen`, `HomeScreen`, `MySummaryScreen`, `ProfileScreen`, `ScheduleCreateScreen`, `ScheduleDetailScreen`, `SettingsScreen`, `WageSettingsScreen` | 각 화면에 `AppHeader` 적용 (`leftType='menu'` 또는 `'back'`) |
| `aff5e06` | 2026-06-27 | `app/src/types/vector-icons.d.ts` **(신규)** | 아이콘 폰트 타입 선언 추가 |

## **1.2 핵심 변경 사항 요약**

1. **홈 화면 자체 헤더 도입 (v11.6)**: 기존에는 React Navigation 기본 헤더를 썼지만, HomeScreen이 ☰(드로어) / 🏠(오늘로 이동) / "YYYY년 MM월 ▾"(연월 선택 드롭다운) / "오늘" 버튼을 직접 그리는 커스텀 헤더로 교체됨.
2. **캘린더 제어를 위한 `CalendarHandle` ref 패턴 도입**: `CalendarScreen`이 `forwardRef`로 `goToday()` / `jumpToDate(dateString)`를 외부에 노출하여, HomeScreen이 헤더의 버튼 클릭만으로 캘린더를 직접 제어할 수 있게 됨.
3. **연월 선택 UI**: `YearMonthPicker` 컴포넌트(모달)를 통해 임의의 연/월로 캘린더를 점프할 수 있음. (참고: 이 컴포넌트 파일 자체는 이번 소급 조사 시점에 별도 검증하지 않았으므로, 실제 구현 세부는 `app/src/components/YearMonthPicker.tsx`를 직접 참조할 것)
4. **요약 스트립 지표 변경**: "현장 수(siteCount)" 지표가 "총 공수(totalWorkUnits)"로 교체됨. 근무일 탭의 이동 대상도 `Attendance` 화면에서 `MySummary` 화면으로 변경됨 — 근태 화면이 아직 스텁이라는 점과 일관된 조정으로 보임.
5. **공통 헤더 컴포넌트화 (v11.7, `aff5e06`)**: v11.6에서 HomeScreen 안에 인라인으로 작성했던 헤더 UI를 `AppHeader.tsx`로 추출. `leftType` prop으로 Drawer 화면(☰+🏠)과 Stack 화면(←뒤로가기)을 구분하고, `centerContent`/`rightContent`로 화면별 커스텀 콘텐츠(예: 홈의 연월 탭)를 주입하는 구조로 일반화됨. 이후 앱의 거의 모든 화면(근태/캘린더/내수입/프로필/설정/일정등록/일정상세/단가설정)이 이 컴포넌트를 공유하게 됨.
6. **"공통헤더 및 오류 수정"의 "오류 수정" 부분**: 커밋 메시지가 명시하듯 각 화면에 헤더를 적용하며 발생한 자잘한 UI 버그(레이아웃 깨짐 등)도 함께 수정됨 — 정확히 어떤 버그였는지는 커밋 diff에 별도 주석이 없어 특정할 수 없음.

## **1.3 신규 컴포넌트 — AppHeader.tsx**

파일 위치: `app/src/components/AppHeader.tsx`

| interface Props {   leftType?: 'menu' │ 'back';   title?: string;   centerContent?: React.ReactNode;   rightContent?: React.ReactNode;   onBackPress?: () => void;   onMenuPress?: () => void;   onHomePress?: () => void; } |
| --- |

- `leftType='menu'`: Drawer 화면(홈/내수입/근태/프로필/설정)에서 사용 — ☰(드로어 열기) + 🏠(홈으로 이동) 아이콘 표시
- `leftType='back'`: Stack 화면(일정상세/일정등록/단가설정)에서 사용 — ←(뒤로가기) 아이콘 표시
- `centerContent`를 지정하지 않으면 `title` 텍스트를 기본 표시. HomeScreen은 연월 드롭다운을 `centerContent`로 주입해서 사용.

| **💡 왜 화면마다 헤더를 새로 만들지 않고 공통화했나요?** **v11.6에서 HomeScreen에 헤더 UI를 직접 작성한 뒤, 다른 화면(근태·내수입 등)에도 비슷한 헤더가 필요해지자 코드 중복이 발생했습니다. `aff5e06`은 이 중복을 `AppHeader` 하나로 추출해 해결한 리팩토링입니다. 이후 헤더 디자인을 바꿀 때 파일 하나만 고치면 전체 화면에 반영됩니다.** |
| --- |

# **2. 문서화 시점의 한계 (중요)**

이 매뉴얼은 코드를 먼저 작성하고 3개월 가까이 지난 뒤(2026-06-27 → 2026-09-19) 소급 작성되었습니다. 다음 사항에 유의하세요.

- v11.0 매뉴얼처럼 "작업 전 사전 점검 → 단계별 구현 → 시행착오 → 체크리스트" 형식의 튜토리얼이 아니라, **이미 완성된 코드를 사후에 요약·기록한 문서**입니다. 실제 작업 중 어떤 시행착오가 있었는지는 기록이 남아있지 않아 재구성할 수 없었습니다.
- `YearMonthPicker.tsx`, `AttendanceScreen`/`CalendarScreen`/`ProfileScreen` 등 각 화면에 적용된 `AppHeader` 통합의 세부 diff는 이 문서에 전부 옮기지 않았습니다. 필요 시 `git show aff5e06 -- <파일경로>`로 직접 확인하세요.
- **앞으로는 이런 소급 작성을 반복하지 않도록, 기능 커밋 시점에 매뉴얼도 함께 갱신하는 것을 권장합니다.**

# **3. 다음 단계 (v12 예고, v11.0 문서와 동일)**

v11.0 매뉴얼 12장에서 예고한 v12(자동 보고서 생성 1단계, PDF)가 로드맵상 다음 순서로 유효합니다. `site_reports` 테이블은 v9.0에서 이미 마이그레이션되어 있고, `DomPDF` 설치 및 `SiteReportController` 구현이 남아있습니다.

# **변경 이력**

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| v11.6 | 2026-06-13 (소급기록 2026-09-19) | HomeScreen 자체 헤더(☰/🏠/연월/오늘) 도입, CalendarScreen에 `CalendarHandle` ref 패턴 추가, 요약 스트립 지표를 현장 수 → 총 공수로 변경, LoginScreen/MySummaryScreen UI 버그 수정 |
| v11.7 | 2026-06-27 (소급기록 2026-09-19) | `AppHeader.tsx` 신규 — 공통 헤더 컴포넌트로 추출(leftType='menu'\|'back'), 9개 화면에 일괄 적용, 적용 과정에서 발견된 UI 버그 수정 |

*— 이 문서는 사후 소급 작성본입니다. 원 작업 커밋: `0ce8dc5`, `aff5e06` —*

*다음: v12 — 자동 보고서 생성 1단계 (PDF)*

© 2026 Team Schedule Manager
