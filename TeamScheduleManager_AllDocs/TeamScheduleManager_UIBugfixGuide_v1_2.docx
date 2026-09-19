Team Schedule Manager

**UI 버그 수정 가이드**

모바일 실기기 테스트 + 공종/공정 통합 + 세금 표현 수정

작성일: 2026-04-27     버전: v1.2

# 0. 수정 항목 전체 요약

실제 핸드폰 테스트 후 발견된 UI 문제 3가지 + 일정 등록 화면 구조 개선 1가지 + 세금 표현 수정 2가지를 수정합니다.

| **#** | **문제 화면** | **증상/내용** | **난이도** | **수정 파일** |
| --- | --- | --- | --- | --- |
| **1** | **로그인 화면** | 비밀번호 마스킹이 흰색으로 안 보임 | ⭐ 5분 | LoginScreen.tsx |
| **2** | **내 수입 현황** | 섹션 카드 배경이 검정이라 텍스트 안 보임 | ⭐⭐ 15분 | MySummaryScreen.tsx |
| **3** | **홈 캘린더** | 격자선 흐리고 날짜/일정 텍스트 너무 작음 | ⭐⭐ 20분 | CalendarScreen.tsx |
| **4** | **일정 등록/상세** | 공종(ENUM)·공정(커스텀) 중복 → 공정 하나로 통합 | ⭐⭐ 20분 | ScheduleCreateScreen ScheduleDetailScreen |
| **5** | **내 수입 현황 (텍스트)** | "실수령액" 표현이 세금 계산처럼 오해될 수 있음 → 표현 수정 | ⭐ 10분 | MySummaryScreen.tsx |
| **6** | **내 수입 현황 (백엔드)** | net_income 계산 시 3.3% 자동 공제 → 참고용으로 변경 | ⭐⭐ 15분 | MonthlySummaryService.php MySummaryScreen.tsx |

# 1~4. 기존 수정 항목 (v1.1과 동일)

| 💡 항목 1~4의 수정 방법은 v1.1 문서와 동일합니다. 이 v1.2 문서는 v1.1 내용에 항목 5·6이 추가된 버전이에요. 1~4 수정 내용은 v1.1 문서를 참고하세요. |
| --- |

# 5. 내 수입 현황 — "실수령액" 표현 수정 (★ v1.2 신규)

## 5-1. 왜 수정하는가

현재 MySummaryScreen 상단에 "이번 달 실수령액"이라는 표현이 있어요.

"실수령액"이란 단어는 보통 "세금 뗀 후 실제로 받는 돈"이라는 의미로 쓰여요.

**사용자가 이 숫자를 보고 ****"****세금까지 계산된 금액****"****이라고 오해할 수 있어요.**

하지만 우리 앱은 정확한 세금 계산을 하지 않기로 방향을 정했어요 (기획서 v2.4 참조).

→ 표현을 정확하게 바꾸고, 세금 관련 안내 문구를 추가해야 해요.

## 5-2. 수정 위치

| **항목** | **내용** |
| --- | --- |
| **파일 경로** | app/src/screens/MySummaryScreen.tsx |
| **찾을 키워드** | "실수령액" 텍스트가 있는 Text 컴포넌트 |
| **수정 범위** | 라벨 텍스트 변경 + 안내 문구 추가 |

## 5-3. 수정 전 / 후 코드

**[ 수정 전 ]**

// ❌ "실수령액" → 세금 계산된 금액처럼 오해

<Text style={styles.bigLabel}>💰 이번 달 실수령액</Text>

<Text style={styles.bigAmount}>{formatMoney(summary.net_income)}</Text>

**[ 수정 후 ]**

// ✅ "순수입"으로 변경 + 경비 공제 기준 명시

<Text style={styles.bigLabel}>💰 이번 달 순수입</Text>

<Text style={styles.bigAmount}>{formatMoney(summary.net_income)}</Text>

<Text style={styles.subNote}>총수입 - 경비 기준 / 세금은 별도</Text>

// styles에 추가

subNote: {

  fontSize: 12,

  color: '#999999',

  textAlign: 'center',

  marginTop: 4,

},

| 💡 "실수령액"과 "순수입"의 차이: 실수령액은 세금까지 뗀 돈, 순수입은 수입에서 경비만 뺀 돈이에요. 우리 앱은 세금을 계산하지 않으니 "순수입"이 정확한 표현이에요. |
| --- |

# 6. 수입 계산 — 3.3% 자동 공제 처리 변경 (★ v1.2 신규)

## 6-1. 현재 상황 파악 먼저 (확인 필요)

백엔드 MonthlySummaryService에서 net_income을 어떻게 계산하는지 먼저 확인하세요.

| **이런 코드가 있다면 (수정 필요)** | **이런 코드라면 (수정 불필요)** |
| --- | --- |
| // 3.3% 자동 공제 중 $tax = $income * 0.033; $net = $income - $exp - $tax; | // 경비만 뺌 $net = $income - $expenses; // tax 계산 없음 |

## 6-2. 수정 방향

3.3%가 자동 공제되어 있다면 아래 방향으로 수정해요:

| **항목** | **내용** |
| --- | --- |
| **파일 (백엔드)** | app/Http/Services/MonthlySummaryService.php |
| **파일 (모바일)** | app/src/screens/MySummaryScreen.tsx |
| **처리 방향** | net_income = 총수입 - 경비 (세금 공제 제거) 3.3% 값은 별도 참고용 필드로만 보관 |

## 6-3. 백엔드 수정 코드

**[ MonthlySummaryService.php — net_income 계산 수정 ]**

// ❌ 수정 전: 세금 자동 공제

//$tax_amount = $total_income * 0.033;

//$net_income = $total_income - $total_expenses - $tax_amount;

// ✅ 수정 후: 경비만 공제, 3.3%는 참고용으로만 보관

$net_income = $total_income - $total_expenses;

$tax_reference = round($total_income * 0.033);  // 참고용 (DB 저장 X)

## 6-4. 모바일 화면 수정 코드

**[ MySummaryScreen.tsx — 3.3% 참고 정보 표시 ]**

// ✅ 3.3% 참고값을 별도 안내로만 표시

{summary && summary.total_income > 0 && (

  <View style={styles.taxRefBox}>

    <Text style={styles.taxRefTitle}>📋 3.3% 원천징수 참고</Text>

    <Text style={styles.taxRefAmount}>

      {formatMoney(Math.round(summary.total_income * 0.033))}

    </Text>

    <Text style={styles.taxRefNote}>

      ※ 참고값입니다. 실제 세액은 세무사에게 확인하세요.

    </Text>

  </View>

)}

// styles 추가

taxRefBox: {

  backgroundColor: '#F8F9FA',

  borderRadius: 8,

  padding: 12,

  marginTop: 8,

  borderLeftWidth: 3,

  borderLeftColor: '#ADB5BD',

},

taxRefTitle: { fontSize: 13, color: '#666', fontWeight: '600' },

taxRefAmount: { fontSize: 18, color: '#333', fontWeight: 'bold', marginTop: 4 },

taxRefNote: { fontSize: 11, color: '#999', marginTop: 4 },

| ⚠️ 3.3% 참고값 옆에는 반드시 "실제 세액과 다를 수 있습니다" 문구를 붙여주세요. 없으면 사용자가 이 금액을 정확한 세금으로 오해할 수 있어요. |
| --- |

# 7. 집에서 작업할 순서 (전체)

| **순서** | **파일** | **할 일** | **예상 시간** |
| --- | --- | --- | --- |
| **1** | **LoginScreen.tsx** | input 스타일에 color: '#222222' 추가 | 5분 |
| **2** | **MySummaryScreen.tsx** | card/container에 backgroundColor 명시 | 15분 |
| **3** | **CalendarScreen.tsx** | Calendar 컴포넌트 theme 속성 추가 | 20분 |
| **4** | **ScheduleCreateScreen.tsx** | work_type ENUM UI 제거 | 15분 |
| **5** | **ScheduleDetailScreen.tsx** | work_type Chip 제거, 공정 dot만 유지 | 10분 |
| **6** | **MySummaryScreen.tsx** | "실수령액" → "순수입" + subNote 문구 추가 | 10분 |
| **7** | **MonthlySummaryService.php → MySummaryScreen.tsx** | 3.3% 자동공제 여부 확인 후 분리 처리 + 화면에 참고용 표시 추가 | 15분 |

| 💡 6·7번은 기존 UI 버그 수정이 아니라 "방향 수정"이에요. 먼저 1~5번 버그를 다 고친 다음에 진행하세요. |
| --- |

# 변경 이력

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| **v1.0** | 2026-04-27 | 최초 작성 — 실기기 테스트 UI 버그 3건 (로그인/수입화면/캘린더) |
| **v1.1** | 2026-04-27 | 항목 4 추가 — 공종(ENUM)·공정(커스텀) 중복 구조 개선. ScheduleCreateScreen / ScheduleDetailScreen |
| **v1.2** | 2026-04-27 | ★ 항목 5·6 추가 — 기획서 v2.4 세금 방향 재정의 반영. (5) MySummaryScreen "실수령액" → "순수입" 표현 수정 + 경비 공제 기준 안내 문구. (6) MonthlySummaryService 3.3% 자동공제 여부 확인 및 분리 처리 + 화면에 참고용 표시 추가. 작업 순서 7단계로 확장. |

© 2026 Team Schedule Manager