Team Schedule Manager

**UI 버그 수정 가이드**

모바일 실기기 테스트 + 공종/공정 통합 + 세금 표현 수정 + 원천징수 기능 추가

작성일: 2026-04-27     버전: v1.3

# 0. 수정 항목 전체 요약

UI 버그 3건 + 구조 개선 3건 + 신규 기능 1건 = 총 7가지 수정/추가 작업입니다.

| **#** | **화면** | **내용** | **난이도** | **수정 파일** |
| --- | --- | --- | --- | --- |
| **1** | **로그인** | 비밀번호 마스킹 흰색으로 안 보임 | ⭐ 5분 | LoginScreen.tsx |
| **2** | **내 수입 현황** | 섹션 카드 배경 검정 → 텍스트 안 보임 | ⭐⭐ 15분 | MySummaryScreen.tsx |
| **3** | **홈 캘린더** | 격자선 흐리고 날짜 텍스트 너무 작음 | ⭐⭐ 20분 | CalendarScreen.tsx |
| **4** | **일정 등록/상세** | 공종(ENUM)·공정 중복 → 공정 하나로 통합 | ⭐⭐ 25분 | ScheduleCreateScreen ScheduleDetailScreen |
| **5** | **내 수입 현황** | "실수령액" → "순수입" 표현 수정 | ⭐ 10분 | MySummaryScreen.tsx |
| **6** | **내 수입 현황 (백엔드)** | 3.3% 자동공제 → 참고용으로 분리 | ⭐⭐ 15분 | MonthlySummaryService.php MySummaryScreen.tsx |
| **7** | **일정 등록/상세 수입 현황** | ★ 신규: 원천징수 여부 토글 추가 (DB + 백엔드 + 모바일 3곳) | ⭐⭐⭐ 60분 | 마이그레이션 Schedule.php ScheduleController.php ScheduleCreateScreen ScheduleDetailScreen MySummaryScreen |

# 1~6. 기존 수정 항목 (v1.2와 동일)

| 💡 항목 1~6의 수정 방법은 v1.2 문서와 동일합니다. v1.3은 v1.2 내용에 항목 7(원천징수 기능)이 추가된 버전이에요. |
| --- |

# 7. 원천징수 여부 토글 — 신규 기능 추가 (★ v1.3 신규)

## 7-1. 원천징수가 뭔가요?

"돈 받기 전에 업체가 세금을 미리 떼는 것"이에요.

| **구분** | **원천징수 있음** | **원천징수 없음** |
| --- | --- | --- |
| **돈 받는 방법** | 업체가 3.3% 떼고 입금 (967,000원 / 100만원 청구 시) | 100만원 그대로 입금 (나중에 직접 신고) |
| **주로 해당** | 업체에서 용역비 청구하는 경우 (개인사업자 등록 여부 무관) | 직접 고객 받을 때 일용직으로 처리될 때 |
| **앱에서 활용** | 원천징수된 금액 합계 계산 → PDF 자료에 기재 | 그냥 수입으로만 기록 |

## 7-2. 완성 후 사용자가 보는 화면

**[ 일정 등록 폼 ]**

| ┌─────────────────────────────────────┐ │  원천징수 여부                       │ │  없음 ──●── 있음(3.3%)              │ │  (기본값: 없음)                      │ └─────────────────────────────────────┘ |
| --- |

**[ 내 수입 현황 화면 하단 ]**

| ┌─────────────────────────────────────┐ │  📈 총 수입          ₩5,180,000     │ │  🧾 총 경비            ₩32,000      │ │  💰 순수입           ₩5,148,000     │ │  ─────────────────────────────────  │ │  📋 원천징수 참고 (3.3%)             │ │  원천징수 현장 수입  ₩3,000,000     │ │  원천징수된 금액       ₩99,000      │ │  ※ 실제 세액은 세무사 확인 권장     │ └─────────────────────────────────────┘ |
| --- |

## 7-3. STEP 1 — DB 컬럼 추가 (마이그레이션)

schedules 테이블에 원천징수 여부를 저장할 컬럼 1개를 추가해요.

| **항목** | **내용** |
| --- | --- |
| **할 일** | 마이그레이션 파일 생성 → schedules 테이블에 컬럼 추가 |
| **추가할 컬럼명** | withholding_tax |
| **타입** | TINYINT(1) — 0 또는 1만 들어가는 숫자 (0=없음, 1=있음) |
| **기본값** | 0 (없음) — 기존 데이터는 자동으로 0으로 설정됨 |

**[ Laragon Terminal에서 실행 ]**

cd C:\project\team-schedule\backend

php artisan make:migration add_withholding_tax_to_schedules_table --table=schedules

**[ 생성된 마이그레이션 파일 내용 ]**

public function up(): void

{

    Schema::table('schedules', function (Blueprint $table) {

        $table->tinyInteger('withholding_tax')

              ->default(0)

              ->comment('원천징수 여부: 0=없음, 1=있음(3.3%)')

              ->after('expenses_memo');  // 기존 컬럼 뒤에 추가

    });

}

public function down(): void

{

    Schema::table('schedules', function (Blueprint $table) {

        $table->dropColumn('withholding_tax');

    });

}

**[ 마이그레이션 적용 ]**

php artisan migrate

| 💡 tinyInteger(0 또는 1)를 쓰는 이유: "원천징수 있음/없음"은 딱 두 가지 상태예요. boolean처럼 쓰지만 MySQL에서는 TINYINT(1)로 저장돼요. Laravel에서 boolean()으로 써도 결과는 같아요. |
| --- |

## 7-4. STEP 2 — 백엔드 모델 수정 (Schedule.php)

| **항목** | **내용** |
| --- | --- |
| **파일 경로** | app/Models/Schedule.php |
| **할 일** | fillable 배열에 withholding_tax 추가 casts 배열에 boolean으로 추가 |

// fillable 배열에 추가

protected $fillable = [

    // ... 기존 항목들 ...

    'withholding_tax',   // ★ 추가

];

// casts 배열에 추가 (0/1을 true/false로 자동 변환)

protected $casts = [

    // ... 기존 항목들 ...

    'withholding_tax' => 'boolean',   // ★ 추가

];

| 💡 casts에 boolean을 넣으면: DB에서 0/1로 저장되지만, PHP 코드에서는 true/false로 편하게 쓸 수 있어요. 모바일 앱에도 true/false로 전달돼요. |
| --- |

## 7-5. STEP 3 — 백엔드 API 수정 (ScheduleController.php)

| **항목** | **내용** |
| --- | --- |
| **파일 경로** | app/Http/Controllers/ScheduleController.php |
| **수정 위치** | store() 메서드와 update() 메서드의 validate 규칙 |
| **할 일** | validation에 withholding_tax 항목 추가 |

// store() 와 update() 의 $request->validate([...]) 안에 추가

'withholding_tax' => 'boolean',   // ★ 추가

**[ MonthlySummaryService.php — 원천징수 합계 계산 추가 ]**

// recalculate() 메서드 안에 추가

// 원천징수된 수입 합계

$withheld_income = Schedule::where('user_id', $userId)

    ->whereYear('date', $year)

    ->whereMonth('date', $month)

    ->where('withholding_tax', 1)       // 원천징수 있는 것만

    ->sum(DB::raw('daily_wage * work_units'));

$withheld_amount = round($withheld_income * 0.033);  // 3.3% 계산

| ⚠️ monthly_summaries 테이블에 withheld_income, withheld_amount 컬럼이 없으면 별도 마이그레이션이 필요해요. 또는 API 응답에 계산값으로만 포함시켜도 돼요. |
| --- |

## 7-6. STEP 4 — 모바일 일정 등록 화면 (ScheduleCreateScreen.tsx)

| **항목** | **내용** |
| --- | --- |
| **파일 경로** | app/src/screens/ScheduleCreateScreen.tsx |
| **추가할 UI** | 토글 스위치 (Switch 컴포넌트) |
| **기본값** | false (원천징수 없음) |

// 1. state 추가 (기존 state들 아래에)

const [withholdingTax, setWithholdingTax] = useState<boolean>(false);

// 2. UI 추가 (공수/단가 입력 아래쪽에)

import { Switch } from 'react-native';   // 상단 import에 추가

<View style={styles.toggleRow}>

  <View style={styles.toggleInfo}>

    <Text style={styles.label}>원천징수 여부</Text>

    <Text style={styles.labelSub}>

      {withholdingTax ? '있음 — 3.3% 원천징수 적용' : '없음'}

    </Text>

  </View>

  <Switch

    value={withholdingTax}

    onValueChange={setWithholdingTax}

    trackColor={{ false: '#DDDDDD', true: '#2E75B6' }}

    thumbColor={withholdingTax ? '#FFFFFF' : '#FFFFFF'}

  />

</View>

// 3. API 전송 payload에 추가

const payload = {

  // ... 기존 항목들 ...

  withholding_tax: withholdingTax,   // ★ 추가

};

// 4. 수정 모드일 때 기존 값 불러오기

// fetchExistingSchedule() 결과를 폼에 채울 때

setWithholdingTax(data.withholding_tax ?? false);   // ★ 추가

// 5. styles 추가

toggleRow: {

  flexDirection: 'row',

  alignItems: 'center',

  justifyContent: 'space-between',

  paddingVertical: 12,

  borderBottomWidth: 1,

  borderBottomColor: '#F0F0F0',

},

toggleInfo: { flex: 1 },

labelSub: { fontSize: 12, color: '#999', marginTop: 2 },

## 7-7. STEP 5 — 모바일 일정 상세 화면 (ScheduleDetailScreen.tsx)

| **항목** | **내용** |
| --- | --- |
| **파일 경로** | app/src/screens/ScheduleDetailScreen.tsx |
| **추가할 UI** | 원천징수 여부 표시 (뱃지 형태) |
| **위치** | 단가/공수 카드 아래쪽 |

// 공수/단가 카드 아래에 추가

{schedule.withholding_tax && (

  <View style={styles.withheldBadge}>

    <Text style={styles.withheldText}>

      📋 원천징수 3.3% 적용

    </Text>

    <Text style={styles.withheldAmount}>

      참고 공제액: {formatMoney(

        Math.round(parseFloat(schedule.daily_wage) *

        parseFloat(schedule.work_units) * 0.033)

      )}

    </Text>

  </View>

)}

// styles 추가

withheldBadge: {

  backgroundColor: '#F0F7FF',

  borderRadius: 8,

  padding: 10,

  marginTop: 8,

  borderLeftWidth: 3,

  borderLeftColor: '#2E75B6',

},

withheldText: { fontSize: 13, color: '#2E75B6', fontWeight: '600' },

withheldAmount: { fontSize: 12, color: '#666', marginTop: 4 },

## 7-8. STEP 6 — 모바일 수입 현황 화면 (MySummaryScreen.tsx)

| **항목** | **내용** |
| --- | --- |
| **파일 경로** | app/src/screens/MySummaryScreen.tsx |
| **추가할 UI** | 원천징수 참고 섹션 (화면 하단) |
| **조건** | 원천징수 있는 현장이 1개 이상일 때만 표시 |

// API 응답에서 원천징수 관련 데이터 받기

// (백엔드에서 withheld_income, withheld_amount를 응답에 추가한 경우)

// 기존 순수입 표시 아래에 추가

{summary?.withheld_income > 0 && (

  <View style={styles.taxRefBox}>

    <Text style={styles.taxRefTitle}>📋 원천징수 참고 (3.3%)</Text>

    <View style={styles.taxRefRow}>

      <Text style={styles.taxRefLabel}>원천징수 현장 수입</Text>

      <Text style={styles.taxRefValue}>

        {formatMoney(summary.withheld_income)}

      </Text>

    </View>

    <View style={styles.taxRefRow}>

      <Text style={styles.taxRefLabel}>원천징수된 금액</Text>

      <Text style={styles.taxRefValue}>

        {formatMoney(summary.withheld_amount)}

      </Text>

    </View>

    <Text style={styles.taxRefNote}>

      ※ 참고값입니다. 실제 세액은 세무사에게 확인하세요.

    </Text>

  </View>

)}

// styles 추가

taxRefBox: {

  backgroundColor: '#F8F9FA',

  borderRadius: 8,

  padding: 14,

  marginTop: 12,

  borderLeftWidth: 3,

  borderLeftColor: '#ADB5BD',

},

taxRefRow: {

  flexDirection: 'row',

  justifyContent: 'space-between',

  marginTop: 6,

},

taxRefTitle: { fontSize: 13, color: '#666', fontWeight: '600' },

taxRefLabel: { fontSize: 13, color: '#888' },

taxRefValue: { fontSize: 13, color: '#555', fontWeight: '600' },

taxRefNote: { fontSize: 11, color: '#AAA', marginTop: 8 },

# 8. 집에서 작업할 순서 (전체)

| **순서** | **파일** | **할 일** | **시간** |
| --- | --- | --- | --- |
| **1** | **LoginScreen.tsx** | color: '#222222' 추가 | 5분 |
| **2** | **MySummaryScreen.tsx** | backgroundColor 명시 | 15분 |
| **3** | **CalendarScreen.tsx** | theme 속성 추가 | 20분 |
| **4** | **ScheduleCreateScreen ScheduleDetailScreen** | 공종 ENUM UI 제거 | 25분 |
| **5** | **MySummaryScreen.tsx** | "실수령액" → "순수입" 수정 | 10분 |
| **6** | **MonthlySummaryService.php MySummaryScreen.tsx** | 3.3% 자동공제 분리 처리 | 15분 |
| **7-1** | **마이그레이션 신규** | withholding_tax 컬럼 추가 + migrate | 10분 |
| **7-2** | **Schedule.php** | fillable + casts 추가 | 5분 |
| **7-3** | **ScheduleController.php MonthlySummaryService.php** | validate 규칙 + 원천징수 합계 계산 추가 | 15분 |
| **7-4** | **ScheduleCreateScreen.tsx** | 토글 스위치 UI + payload 추가 | 15분 |
| **7-5** | **ScheduleDetailScreen.tsx** | 원천징수 뱃지 표시 추가 | 10분 |
| **7-6** | **MySummaryScreen.tsx** | 원천징수 참고 섹션 추가 | 15분 |

| ✅ 7번 항목(원천징수)은 1~6번을 모두 완료한 후에 진행하세요. 순서대로 하나씩 에뮬레이터에서 확인하면서 진행하는 게 안전해요. |
| --- |

# 변경 이력

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| **v1.0** | 2026-04-27 | 최초 작성 — UI 버그 3건 (로그인/수입/캘린더) |
| **v1.1** | 2026-04-27 | 항목 4 추가 — 공종/공정 통합 |
| **v1.2** | 2026-04-27 | 항목 5·6 추가 — 세금 표현 수정 + 3.3% 분리 처리 |
| **v1.3** | 2026-04-27 | ★ 항목 7 추가 — 원천징수 여부 토글 기능 신규 구현. DB 마이그레이션(withholding_tax 컬럼) / Schedule.php fillable+casts / ScheduleController validate / MonthlySummaryService 원천징수 합계 계산 / ScheduleCreateScreen 토글 스위치 UI / ScheduleDetailScreen 뱃지 표시 / MySummaryScreen 참고 섹션. 전체 작업 순서 12단계로 확장. |

© 2026 Team Schedule Manager