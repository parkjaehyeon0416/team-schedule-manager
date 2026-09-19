*Team Schedule Manager  |  개발 매뉴얼 v18 (모바일 앱 화면 — 팀/견적/보고서/명함/세무자료)*

**Team Schedule Manager**

**개발 매뉴얼 v18**

**모바일 앱 화면 5종 추가 (v11.8·v12.1·v12~v13·v14·v17 모바일 연동)**

작성일: 2026-09-19

대상 OS: Windows 10/11 (React Native 개발 환경)

*기준: v12.1(견적서) 완료. v11.8/v12.1/v12~13/v14/v17을 웹 대시보드로만 구현하고
모바일 화면 없이 넘어갔던 것을 사용자가 지적해서 이번에 채워 넣음.*

| **★ v18 핵심 안내 — 반드시 읽을 것** **• 이 세션에는 안드로이드 에뮬레이터나 iOS 시뮬레이터가 없어서, 이번에 작성한 화면들은 `npx tsc --noEmit`(전체 통과)과 `eslint`(내가 만든 파일 기준 경고만 있고 에러 없음)로만 검증했습니다. 실제 기기/에뮬레이터에서 `npm run android`로 빌드해서 눈으로 확인하는 과정은 못 거쳤습니다 — 개발자가 직접 한 번 실행해서 레이아웃 깨짐이나 런타임 에러가 없는지 확인 필요합니다.** **• PDF 다운로드(견적서·세무자료)는 인증 토큰이 필요한데 모바일에 PDF 뷰어/파일 다운로드 라이브러리(react-native-fs, react-native-share 등)가 설치되어 있지 않아서, 이번엔 설치하지 않고 "웹 대시보드에서 다운로드하세요" 안내로 대체했습니다. 새 네이티브 의존성을 추가하면 pod install/gradle sync가 필요한데 그 결과를 검증할 방법이 이 환경엔 없어서 보수적으로 판단했습니다.** **• 공유 링크가 있는 자동 보고서·명함은 인증이 필요 없어서 `Linking.openURL()`로 바로 열람 가능하게 만들었습니다.** |
| --- |

# **1. 추가된 화면 목록**

| **화면** | **파일** | **진입 경로** |
| --- | --- | --- |
| 팀 관리 | `TeamScreen.tsx` | Drawer "👥 팀 관리" |
| 견적서 목록 | `QuoteListScreen.tsx` | Drawer "💵 견적서 관리" |
| 견적서 작성 | `QuoteCreateScreen.tsx` | QuoteListScreen의 "+ 견적 작성" 버튼 |
| 자동 보고서 관리 | `ScheduleReportsScreen.tsx` | ScheduleDetailScreen의 "자동 보고서 관리" 버튼(신규 추가) |
| 내 명함 | `BusinessCardScreen.tsx` | Drawer "🪪 내 명함" |
| 세무 자료 | `TaxSummaryScreen.tsx` | Drawer "🧾 세무 자료" |

# **2. API 모듈 신규 추가**

`teamApi.ts`, `quoteApi.ts`, `reportApi.ts`, `businessCardApi.ts`, `taxSummaryApi.ts` — 전부 웹 프론트엔드(`frontend/src/api/*.ts`)의 대응 파일과 같은 엔드포인트를 호출하며, 기존 `axiosInstance.ts`(AsyncStorage 토큰 자동 첨부)를 그대로 재사용한다.

`types/api.ts`에 `Team`, `Quote`, `QuoteLine`, `UserMaterial`, `SiteReport`, `BusinessCard`, `TaxSummary`, `TaxMonthRow` 타입을 추가했다.

# **3. 화면별 설계 메모**

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

# **4. 검증 한계 (반드시 재확인 필요)**

| **항목** | **검증 여부** |
| --- | --- |
| TypeScript 타입 체크 (`tsc --noEmit`) | ✅ 통과 |
| ESLint (신규 작성 파일만) | ✅ 에러 없음(인라인 스타일 경고만 있음, 기존 코드베이스에도 흔함) |
| 실제 기기/에뮬레이터 실행 | ❌ 미실시 — 이 환경에 Android/iOS 빌드 도구 없음 |
| 백엔드 API와의 실제 통신 확인 | ❌ 미실시 — 웹 프론트엔드로는 모든 엔드포인트를 이미 curl+브라우저로 검증했으나, 모바일 axios 인스턴스(`10.0.2.2`/`localhost` 등 에뮬레이터별 호스트 설정)로 실제 붙여보지는 못함 |
| 네비게이션 흐름(Drawer/Stack 전환) | ❌ 미실시 |

**다음에 반드시 할 일**: `npm run android`(또는 `ios`)로 실제 빌드해서 위 미검증 항목을 확인할 것. 특히 `axiosInstance.ts`의 `SERVER_BASE_URL`이 에뮬레이터/실기기 환경에 맞게 설정되어 있는지(`10.0.2.2` vs `localhost`, 코드 주석 참고) 확인 필요.

# **5. 알려진 제한 사항**

- PDF 다운로드(견적서·세무자료)는 모바일에서 지원하지 않음 — 웹 대시보드 이용 안내.
- 팀 이름 수정/삭제는 모바일에서 지원하지 않음(웹 전용).
- 명함 미리보기가 앱 내 WebView가 아니라 외부 브라우저로 열림.
- 견적서 상태 변경(전달됨/반려) UI 없음 — 승인/삭제만 지원.

# **변경 이력**

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| v18.0 | 2026-09-19 | TeamScreen/QuoteListScreen/QuoteCreateScreen/ScheduleReportsScreen/BusinessCardScreen/TaxSummaryScreen 신규, 대응 API 모듈 5개 신규, types/api.ts 확장, AppNavigator에 Drawer 4개+Stack 2개 등록, ScheduleDetailScreen에 보고서 진입 버튼 추가. 실기기/에뮬레이터 검증은 못 함(4장 참조) |

*— v18 매뉴얼 — 웹 대시보드에만 있던 v11.8~v17 기능들의 모바일 화면 채움, 실기기 검증 필요 —*

© 2026 Team Schedule Manager
