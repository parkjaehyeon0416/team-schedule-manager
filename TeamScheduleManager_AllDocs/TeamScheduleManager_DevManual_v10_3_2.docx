*Team Schedule Manager  |  개발 매뉴얼 v10.3 (개정판)*

Team Schedule Manager  |  v10.3 모바일 수입 대시보드 (개정판)

**개발 매뉴얼 v10.3**

**모바일 수입 대시보드 실연동**

*(개정판) 실전 작업 결과 반영 — 캘린더 연동 + 년/월 모달 + 단방향 통신*

작성일: 2026-04-25 (개정판)  |  실전 검증 완료

| **⚠️ 이 매뉴얼은 개정판입니다** 초판 v10.3은 매뉴얼대로 작업하던 중 4가지 버그가 발견되어 설계를 수정했어요. 이 개정판은 실제로 작동하는 최종 코드와 시행착오로 배운 교훈을 함께 담았습니다. 같은 함정을 다시 만나지 않도록 "왜 이렇게 갔는지" 사유까지 기록되어 있어요. |
| --- |

# **0. 전체 매뉴얼 시리즈**

| **버전** | **제목** | **상태** |
| --- | --- | --- |
| v10.1.1 | 핵심 기능 API — 공수·급여 자동 계산 | **✅ 완료** |
| v10.1.2 | 백엔드 패치 — SoftDelete + Observer 타이밍 | **✅ 완료** |
| v10.2 | 모바일 공수/단가 입력 UI | **✅ 완료** |
| v10.2.1 | 모바일 — 일정 수정/삭제 + 상세 v9.0 필드 | **✅ 완료** |
| **v10.3 (개정)** | **모바일 수입 대시보드 + 캘린더 연동 + 년/월 모달** | **✅ 완료** |
| v11 | 근태 자동 집계 + 출퇴근 기록 | ⏳ 다음 |

# **1. 이 매뉴얼이 다루는 내용**

초판 v10.3과 비교해 추가/변경된 항목을 한눈에 정리합니다.

## **1.1 작업 항목 (최종)**

| **#** | **작업** | **내용** |
| --- | --- | --- |
| 1 | types/api.ts 수정 | MonthlySummary.last_calculated_at에 null 허용 (1줄) |
| 2 | schedulesApi.ts 확장 | getMonthlySummary(year, month) 함수 추가 |
| 3 | utils/format.ts 확장 | formatLastCalculated (UTC→KST), formatShortKRW 추가 |
| 4 | YearMonthPicker.tsx 신규 | 재사용 가능한 년/월 선택 모달 (★ 개정판 신규) |
| 5 | CalendarScreen 수정 | onMonthChange 콜백 prop 추가 (★ 개정판 신규) |
| 6 | HomeScreen 교체 | Mock 제거 + 캘린더 연동 + 단방향 params 전달 |
| 7 | MySummaryScreen 교체 | Mock 제거 + useRef 기반 _ts 감지 + 자체 state |

## **1.2 초판과 다른 핵심 변경 4가지**

| **#** | **항목** | **초판 → 개정판** |
| --- | --- | --- |
| 1 | 월 동기화 방식 | 단방향 (홈 → MySummary 진입 시 1회) |
| 2 | 월 이동 UX | ◀▶ 버튼 + ★ 년/월 선택 모달 추가 |
| 3 | 캘린더 ↔ 요약 스트립 연동 | ★ onMonthChange 콜백으로 요약 스트립 자동 갱신 |
| 4 | 재진입 감지 | ★ useRef + _ts 타임스탬프 패턴 |

## **1.3 작업 후 사용자가 보는 것**

| [홈 화면] ┌──────────────────────────────────────┐ │ ☰  🏠  Team Schedule                │ ├──────────────────────────────────────┤ │  18일      ₩518만       9개          │  ← 캘린더 달의 데이터 │  근무일   이번달 수입    현장        │     (캘린더가 3월이면 라벨도 "3월 수입") ├──────────────────────────────────────┤ │  📆 큰 달력 (월 변경 가능)           │  ← 변경 시 요약 스트립 즉시 갱신 └──────────────────────────────────────┘  [내 수입현황 화면] ┌──────────────────────────────────────┐ │ ◀     2026년 04월     ▶              │  ← 텍스트 탭 시 모달 │         탭하여 변경                  │ ├──────────────────────────────────────┤ │  💰 이번 달 실수령액                  │ │  ₩5,008,140                          │ ├──────────────────────────────────────┤ │  📈 총 수입    │  🧾 총 경비          │ │  ₩5,180,000   │  ₩32,000             │ ├──────────────────────────────────────┤ │  📊 활동: 14일 │ 9곳 │ 18.5공수       │ ├──────────────────────────────────────┤ │  마지막 계산: 오늘 12:12  [↻ 새로고침]│ └──────────────────────────────────────┘ |
| --- |

# **2. 핵심 설계 원칙 (★ 개정판 신규)**

실전 작업에서 배운 설계 원칙을 먼저 정리합니다. 이 원칙을 알고 코드를 보면 "왜 이렇게 짰는지" 이해가 빠릅니다.

## **2.1 두 화면은 ****"****분리****"****한다 — 공유하지 않는다**

| **⚠️ 초판의 잘못된 설계** 초판은 두 화면이 같은 month state를 공유한다고 가정했어요. 실제로는 홈은 "캘린더가 보고 있는 달"을, MySummary는 "사용자가 직접 고른 달"을 봐야 해요. 두 화면의 책임이 다릅니다. 같이 묶으면 한쪽이 다른 쪽을 망가뜨려요. |
| --- |

### **2.1.1 각 화면의 책임**

| **화면** | **책임 (Single Responsibility)** |
| --- | --- |
| 홈 (HomeScreen) | 캘린더가 보고 있는 달의 수입을 표시한다. 사용자가 캘린더에서 ◀▶로 다른 달을 보면 요약 스트립도 그 달로 따라간다. |
| 내 수입현황 (MySummaryScreen) | 사용자가 자유롭게 월을 이동하며 상세 수입을 확인한다. 홈의 캘린더와는 무관하게 동작한다. |

### **2.1.2 통신 방향 — 단방향**

| 홈 화면   ↓ "이번달 수입" 탭 시   ↓ navigation.navigate("MySummary", {   ↓     year: calendarYear,   ↓     month: calendarMonth,   ↓     _ts: Date.now()   ↓ })   ↓ 내 수입현황 화면   - 받은 달부터 시작   - 그 후 자유롭게 이동   - 홈으로 영향 안 감 ★ |
| --- |

| **💡 단방향 통신의 장점** 한 방향으로만 데이터가 흐르면 디버깅이 쉽습니다. "홈 → MySummary"만 신경 쓰면 됨. 반대 방향은 아예 없으니 충돌 가능성 0. 경험적으로 양방향 동기화가 필요한 경우는 매우 드물어요. 대부분 단방향으로 충분합니다. |
| --- |

## **2.2 setState는 즉시 반영되지 않는다**

| **⚠️ React 초보가 100% 맞는 함정** setState(newValue)를 호출해도 같은 함수 안에서 state를 읽으면 옛 값이 그대로예요. setState는 "다음 렌더에 새 값으로 그려달라"는 예약일 뿐, 즉시 변수가 바뀌는 게 아닙니다. 비유: 식당에서 메뉴 변경했다고 직원에게 말해도, 주방에 전달되는 데 시간이 걸려요. 그 사이에 옛 주문대로 음식이 나올 수 있죠. |
| --- |

### **2.2.1 잘못된 패턴**

| // ❌ 이렇게 하면 fetch가 옛 month로 호출됨 const handlePrevMonth = () => {   setMonth(month - 1);    // 예약만 됨   fetchData(year, month); // ← month는 아직 옛 값! }; |
| --- |

### **2.2.2 올바른 패턴**

| // ✅ 새 값을 로컬 변수에 저장 후 함께 사용 const handlePrevMonth = () => {   let newMonth = month;   if (month === 1) {     newMonth = 12;     setYear(year - 1);   } else {     newMonth = month - 1;   }   setMonth(newMonth);   fetchData(year, newMonth);  // ← 즉시 사용 가능한 newMonth }; |
| --- |

## **2.3 useFocusEffect는 화면 포커스 시점에만 실행된다**

| **⚠️ useEffect와 헷갈리기 쉬움** useEffect는 의존성 변화에 따라 자동 재실행되지만, useFocusEffect는 화면 진입/이탈 시점에만 실행돼요. 화면 안에 머무르는 동안 state가 바뀌어도 useFocusEffect의 콜백은 자동 재실행되지 않습니다. 그래서 화면 안에서 state 변경 시 fetch는 핸들러가 직접 호출해야 합니다. |
| --- |

## **2.4 Drawer 화면은 메모리에 살아있다**

| **⚠️ Drawer Navigator의 특수성** 햄버거 메뉴(Drawer)에 등록된 화면들은 한 번 열리면 메모리에 그대로 남아있어요. 다른 화면 갔다가 돌아와도 새로 만들어지지 않고 기존 인스턴스 재사용. state도 그대로 유지되므로, useState(initialValue)의 initialValue는 첫 마운트에만 적용돼요. 재진입을 감지하려면 useRef + _ts 같은 별도 트릭이 필요합니다. |
| --- |

# **3. 백엔드 API 사양 (v10.1.1 그대로)**

백엔드는 v10.1.1에서 만든 API를 그대로 사용합니다. 변경 사항 없음.

## **3.1 엔드포인트**

| **항목** | **값** |
| --- | --- |
| Method | GET |
| URL | /api/monthly-summary |
| Query | year (정수, 필수), month (정수 1~12, 필수) |
| 인증 | 필요 (Bearer Token) |
| 권한 | member 이상 (본인 데이터만 조회 가능) |

## **3.2 응답 형식**

| {   "success": true,   "data": {     "user_id": 2,     "year_month": "2026-04",     "total_work_units": "18.5",      // ★ 문자열     "total_income": "5180000.00",     // ★ 문자열     "total_expenses": "32000.00",     "net_income": "5008140.00",     "work_days": 14,                  // 숫자     "site_count": 9,     "estimated_tax": "139860.00",     "last_calculated_at": "2026-04-25T03:12:48.000000Z"  // ★ UTC   },   "error_code": null } |
| --- |

| **💡 데이터 없는 월은 0으로 응답** 해당 월에 일정이 없으면 모든 숫자가 "0"이고 last_calculated_at은 null로 응답됩니다. 모바일에서 last_calculated_at === null을 따로 체크해서 "—"로 표시하면 됩니다. |
| --- |

# **4. STEP 1 — 타입 수정**

가장 작은 변경부터 시작합니다.

## **4.1 src/types/api.ts**

MonthlySummary 인터페이스에서 last_calculated_at에 null 허용을 추가합니다.

| // ─── 변경 전 ───   last_calculated_at: string;  // ─── 변경 후 ───   last_calculated_at: string │ null;  // ★ v10.3: 빈 데이터 월에는 null |
| --- |

| **💡 왜 이게 중요한가요?** TypeScript는 타입 약속을 엄격하게 검사합니다. 실제 백엔드는 빈 데이터 월에 null을 보내는데, 타입에 string만 적어두면 TypeScript는 항상 문자열이라 믿어요. 그러면 화면 코드가 null 체크 없이 사용하다가 런타임 에러가 납니다. 타입을 실제 응답과 정확히 맞춰두는 게 안전한 코드의 시작입니다. |
| --- |

# **5. STEP 2 — schedulesApi.ts 확장**

파일 경로: src/api/schedulesApi.ts

기존 함수들은 그대로 두고, MonthlySummary 타입을 import하고 맨 아래에 함수 하나를 추가합니다.

## **5.1 추가할 코드**

| // 파일 상단 import에 MonthlySummary 추가 import type {   ApiResponse,   Schedule,   TeamMember,   MonthlySummary,  // ★ v10.3 추가 } from '../types/api';  // 파일 맨 아래에 함수 추가 // ───────────────────────────────────────── // [조회] 월별 수입 집계 — v10.3 추가 // GET /api/monthly-summary?year=2026&month=4 // ───────────────────────────────────────── export async function getMonthlySummary(   year: number,   month: number, ): Promise<MonthlySummary> {   const res = await axios.get<ApiResponse<MonthlySummary>>(     '/monthly-summary',     {       params: { year, month },     },   );   return res.data.data; } |
| --- |

| **💡 res.data.data 가 두 번 .data인 이유** res.data — axios가 만드는 HTTP 응답 본체 (Laravel ApiResponse 봉투 전체) res.data.data — ApiResponse 봉투 안의 실제 알맹이 (MonthlySummary 객체) axios의 .data + Laravel ApiResponse의 data 필드가 겹쳐서 .data.data가 됩니다. |
| --- |

# **6. STEP 3 — utils/format.ts 확장**

파일 경로: src/utils/format.ts

UTC→KST 변환 함수와 짧은 금액 표시 함수를 추가합니다.

## **6.1 추가할 코드 (파일 맨 아래에)**

| // ═══════════════════════════════════════════════ // ★ v10.3 추가 // ═══════════════════════════════════════════════  /**  * 큰 금액을 짧게 표시 (홈 요약 스트립용)  *   1,234,567  → "123만"  *   36,000,000 → "3.6천만"  */ export function formatShortKRW(value: number │ null │ undefined): string {   if (!value ││ isNaN(value)) return '0';   if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)}천만`;   if (value >= 10_000) return `${Math.floor(value / 10_000)}만`;   return value.toLocaleString('ko-KR'); }  // 두 자리 패딩 (시각 표시 도우미, 외부 비공개) function pad2(n: number): string {   return String(n).padStart(2, '0'); }  /**  * UTC ISO 8601 → 한국 시각 친화 표시  *   "2026-04-25T03:12:48.000000Z" → "오늘 12:12" (KST)  *   같은 날: "오늘 HH:mm"  *   어제:    "어제 HH:mm"  *   그 외:   "M월 D일 HH:mm"  *   null/잘못된 값: "—"  */ export function formatLastCalculated(   utcIso: string │ null │ undefined, ): string {   if (!utcIso) return '—';   const date = new Date(utcIso);   if (isNaN(date.getTime())) return '—';    const now = new Date();   const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());   const target = new Date(     date.getFullYear(),     date.getMonth(),     date.getDate(),   );   const diffDays = Math.floor(     (today.getTime() - target.getTime()) / 86_400_000,   );    const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;   if (diffDays === 0) return `오늘 ${time}`;   if (diffDays === 1) return `어제 ${time}`;   return `${date.getMonth() + 1}월 ${date.getDate()}일 ${time}`; } |
| --- |

## **6.2 핵심 포인트**

| **포인트** | **설명** |
| --- | --- |
| new Date(utcIso) 자동 변환 | JavaScript의 Date는 UTC 문자열(끝에 Z)을 받으면 휴대폰 시간대로 자동 변환. 한국 휴대폰이면 +9시간 자동 적용. |
| getMonth()는 0부터 시작 | 1월=0, 12월=11. 사용자에게 보여줄 때 +1 필수. |
| 86_400_000 = 하루 | 24*60*60*1000ms. 두 시점의 일수 차이 계산. |
| pad2 함수는 비공개 | 내부 도우미. export 안 하고 같은 파일 내에서만 사용. |

# **7. STEP 4 — YearMonthPicker 컴포넌트 신규 (★ 개정판)**

파일 경로: src/components/YearMonthPicker.tsx (★ 신규)

컴포넌트 폴더가 없으면 src 아래에 components 폴더를 먼저 만들어주세요.

## **7.1 왜 만드나요?**

◀▶ 버튼만으로는 먼 달까지 이동이 너무 느려요. "2025년 03월"로 가려면 ◀를 13번 눌러야 해요. 텍스트를 탭하면 년/월을 한 번에 고를 수 있는 모달이 뜨도록 합니다.

## **7.2 화면 미리보기**

| ┌─────────────────────────────────┐ │        년/월 선택               │ ├─────────────────────────────────┤ │  ◀     2026     ▶               │  ← 년도 (±버튼) ├─────────────────────────────────┤ │  [1월] [2월] [3월] [4월]        │ │  [5월] [6월] [7월] [8월]        │  ← 월 그리드 3x4 │  [9월][10월][11월][12월]        │ ├─────────────────────────────────┤ │      [취소]      [오늘로]       │ └─────────────────────────────────┘ |
| --- |

## **7.3 전체 코드**

| import React, { useState, useEffect } from 'react'; import { View, Text, StyleSheet, Modal, Pressable } from 'react-native'; import { Button, IconButton } from 'react-native-paper';  interface Props {   visible: boolean;   year: number;   month: number;   onClose: () => void;   onSelect: (year: number, month: number) => void; }  export default function YearMonthPicker({   visible, year, month, onClose, onSelect, }: Props) {   const [tempYear, setTempYear] = useState(year);    // 모달 열릴 때마다 외부 year를 임시 state에 동기화   useEffect(() => {     if (visible) setTempYear(year);   }, [visible, year]);    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];   const now = new Date();   const todayYear = now.getFullYear();   const todayMonth = now.getMonth() + 1;    const handleToday = () => onSelect(todayYear, todayMonth);    return (     <Modal visible={visible} transparent animationType="fade"       onRequestClose={onClose}>       <Pressable style={styles.overlay} onPress={onClose}>         <Pressable style={styles.container} onPress={() => {}}>           <Text style={styles.title}>년/월 선택</Text>            <View style={styles.yearRow}>             <IconButton icon="chevron-left" size={28}               onPress={() => setTempYear(y => y - 1)} />             <Text style={styles.yearText}>{tempYear}년</Text>             <IconButton icon="chevron-right" size={28}               onPress={() => setTempYear(y => y + 1)} />           </View>            <View style={styles.monthGrid}>             {months.map(m => {               const isSelected = tempYear === year && m === month;               const isToday = tempYear === todayYear && m === todayMonth;               return (                 <Pressable key={m}                   style={({pressed}) => [                     styles.monthCell,                     isSelected && styles.monthCellSelected,                     isToday && !isSelected && styles.monthCellToday,                     pressed && styles.monthCellPressed,                   ]}                   onPress={() => onSelect(tempYear, m)}                   android_ripple={{ color: '#E8F0FE' }}                 >                   <Text style={[                     styles.monthText,                     isSelected && styles.monthTextSelected,                     isToday && !isSelected && styles.monthTextToday,                   ]}>{m}월</Text>                 </Pressable>               );             })}           </View>            <View style={styles.actionRow}>             <Button mode="outlined" onPress={onClose}               style={styles.actionBtn}>취소</Button>             <Button mode="contained" icon="calendar-today"               onPress={handleToday} style={styles.actionBtn}>오늘로</Button>           </View>         </Pressable>       </Pressable>     </Modal>   ); }  // 스타일 (생략 가능 - 본 매뉴얼 첨부 코드 참조) |
| --- |

## **7.4 핵심 패턴 — Pressable 두 겹**

| <Pressable style={styles.overlay} onPress={onClose}>      // 배경 (탭=닫기)   <Pressable style={styles.container} onPress={() => {}}> // 본체 (전파 차단)     {/* 모달 내용 */}   </Pressable> </Pressable> |
| --- |

| **💡 두 겹의 Pressable이 필요한 이유** 바깥 Pressable (반투명 검은 배경): 탭하면 onClose() — 표준 모달 UX 안쪽 Pressable (흰 카드): 빈 onPress로 이벤트 전파 막음 이 트릭이 없으면 카드 안 빈 공간 탭해도 모달이 닫혀버려서 사용자가 짜증. |
| --- |

## **7.5 핵심 패턴 — tempYear 분리**

| **상황** | **동작** |
| --- | --- |
| 모달 열림 | 외부 year를 tempYear에 복사 |
| ◀▶로 년도 변경 | tempYear만 변경, 외부 year는 그대로 |
| 취소 누름 | 외부 year 그대로 → 원상태 |
| 월 탭함 | onSelect(tempYear, m) 호출 → 외부에 확정 전달 |

| **💡 옷가게 탈의실 비유** 입어보던 옷(tempYear)과 원래 입던 옷(외부 year)을 분리해야 합니다. 입어보다 "역시 안 살래"하면 원래 옷으로 돌아오죠. 코드도 똑같이 동작해야 사용자가 헷갈리지 않아요. |
| --- |

# **8. STEP 5 — CalendarScreen 콜백 추가**

파일 경로: src/screens/CalendarScreen.tsx

기존 캘린더는 자체 month state를 들고 있어요. 부모(HomeScreen)가 이 month를 알 수 있도록 콜백 prop을 추가합니다.

## **8.1 변경 1: Props 인터페이스 추가**

| // 변경 전 export default function CalendarScreen({ navigation }: any) {  // 변경 후 interface Props {   navigation: any;   onMonthChange?: (year: number, month: number) => void; // ★ v10.3 }  export default function CalendarScreen({   navigation, onMonthChange, }: Props) { |
| --- |

## **8.2 변경 2: 월 변경 시 콜백 호출**

| // 변경 전 onMonthChange={m => setCurrentMonth(m.dateString)}  // 변경 후 onMonthChange={m => {   setCurrentMonth(m.dateString);   // ★ 부모에게 알림   if (onMonthChange) {     onMonthChange(m.year, m.month);   } }} |
| --- |

## **8.3 변경 3: 첫 마운트 시에도 알림**

useEffect(() => { fetchSchedules(); }, [fetchSchedules]); 바로 아래에 추가:

| // ★ v10.3: 첫 마운트 시 부모에게 현재 달 알림 useEffect(() => {   if (onMonthChange) {     const m = dayjs(currentMonth);     onMonthChange(m.year(), m.month() + 1);   }   // eslint-disable-next-line react-hooks/exhaustive-deps }, []); |
| --- |

| **💡 호환성 — onMonthChange는 optional** Props에서 onMonthChange?: (?는 선택적이라는 뜻)으로 정의했어요. 부모가 안 주면 if (onMonthChange) 분기를 통과 못 하고 그냥 캘린더 자체 동작만 함. 기존 다른 화면이 CalendarScreen을 쓰고 있어도 영향 없음 (호환성 유지). |
| --- |

# **9. STEP 6 — HomeScreen 교체**

파일 경로: src/screens/HomeScreen.tsx

홈은 캘린더가 보고 있는 달의 수입을 보여줍니다. 캘린더 onMonthChange 콜백으로 자동 갱신.

## **9.1 핵심 변경 사항**

| **항목** | **동작** |
| --- | --- |
| MOCK_SUMMARY 객체 | 삭제 |
| 로컬 formatShortKRW 함수 | 삭제 (utils/format.ts로 이동) |
| calendarYear/Month state 추가 | 캘린더 month 추적 |
| handleCalendarMonthChange | 캘린더 변경 즉시 fetchData 호출 |
| useFocusEffect | 화면 재포커스 시 현재 달 새로고침 |
| goToMySummary | params에 { year, month, _ts } 전달 |
| 라벨 동적 변경 | 오늘 달이면 "이번달 수입", 아니면 "N월 수입" |

## **9.2 핵심 코드 (전체 코드는 첨부 ZIP 참조)**

| import React, { useCallback, useState } from 'react'; import { useFocusEffect } from '@react-navigation/native'; import { getMonthlySummary } from '../api/schedulesApi'; import type { MonthlySummary } from '../types/api'; import { formatShortKRW } from '../utils/format';  export default function HomeScreen({ navigation }: any) {   const now = new Date();   const [calendarYear, setCalendarYear] = useState<number>(     now.getFullYear(),   );   const [calendarMonth, setCalendarMonth] = useState<number>(     now.getMonth() + 1,   );   const [summary, setSummary] = useState<MonthlySummary │ null>(null);    // 캘린더가 월 변경 알리면 즉시 fetch   const handleCalendarMonthChange = useCallback(     async (newYear: number, newMonth: number) => {       setCalendarYear(newYear);       setCalendarMonth(newMonth);       try {         const data = await getMonthlySummary(newYear, newMonth);         setSummary(data);       } catch {         setSummary(null);       }     },     [],   );    // 화면 포커스 시 현재 달 새로고침   useFocusEffect(     useCallback(() => {       let cancelled = false;       const load = async () => {         try {           const data = await getMonthlySummary(             calendarYear, calendarMonth,           );           if (!cancelled) setSummary(data);         } catch {           if (!cancelled) setSummary(null);         }       };       load();       return () => { cancelled = true; };     }, [calendarYear, calendarMonth]),   );    // ★ MySummary로 진입 - params 전달   const goToMySummary = () => {     navigation.navigate('MySummary', {       year: calendarYear,       month: calendarMonth,       _ts: Date.now(),  // 같은 달 재진입도 인식     });   };    // 라벨 동적 변경   const isCurrentMonth =     calendarYear === now.getFullYear() &&     calendarMonth === now.getMonth() + 1;   const incomeLabel = isCurrentMonth     ? '이번달 수입'     : `${calendarMonth}월 수입`;    return (     <View style={styles.container}>       {/* 요약 스트립 - calendarMonth 데이터 표시 */}       {/* ... 생략 ... */}       <CalendarScreen         navigation={navigation}         onMonthChange={handleCalendarMonthChange}       />     </View>   ); } |
| --- |

## **9.3 _ts: Date.now() 트릭**

| **⚠️ 같은 달로 두 번 진입하면 인식 안 됨** navigation.navigate("MySummary", { year: 2026, month: 4 })를 두 번 호출했을 때, params 값이 똑같으면 React Navigation이 "변화 없음"으로 판단합니다. MySummary 쪽 useEffect도 의존성 변화 없음으로 판단해서 안 돌아요. _ts에 Date.now()를 넣으면 매번 다른 숫자라 "params가 변했다"고 인식하게 됩니다. |
| --- |

# **10. STEP 7 — MySummaryScreen 교체**

파일 경로: src/screens/MySummaryScreen.tsx

가장 복잡한 화면입니다. 자체 state로 동작하면서, 홈에서 진입할 때만 받은 달로 시작합니다.

## **10.1 핵심 변경 사항**

| **항목** | **동작** |
| --- | --- |
| MOCK_SUMMARY 삭제 | getMonthlySummary 실연동 |
| route prop 받기 | navigation params 사용 |
| 초기 state | params 있으면 그 달, 없으면 오늘 달 |
| useRef로 lastTsRef | 재진입 감지용 |
| useFocusEffect 분기 | _ts 변화 = 새 진입 → params로 fetch / _ts 동일 = 재포커스 → state로 fetch |
| 핸들러들 | 직접 fetchData(newYear, newMonth) 호출 |
| YearMonthPicker 추가 | 텍스트 탭 시 모달 열림 |

## **10.2 핵심 패턴 — useRef로 _ts 추적**

| // 마지막으로 처리한 _ts 저장 (리렌더 안 일으킴) const lastTsRef = useRef<number │ undefined>(route?.params?._ts);  useFocusEffect(   useCallback(() => {     const newTs = route?.params?._ts;      // ★ 새 params로 진입 (홈에서 새로 옴)     if (newTs && newTs !== lastTsRef.current) {       lastTsRef.current = newTs;  // 처리 표시       const newYear = route.params.year;       const newMonth = route.params.month;       setYear(newYear);       setMonth(newMonth);       setLoading(true);       fetchData(newYear, newMonth);       return;  // ★ 재포커스 분기 안 탐     }      // ★ 그냥 재포커스 (햄버거에서 다시 들어옴)     setLoading(true);     fetchData(year, month);  // 마지막 보던 달 새로고침   }, [route?.params?._ts, fetchData]), ); |
| --- |

| **💡 useRef vs useState** useState — 값 변경 시 리렌더 발생 useRef — 값 변경해도 리렌더 안 일어남. 그냥 "기억해두는 변수". 여기선 lastTsRef는 비교용이지 화면에 표시되는 값이 아니라 useRef가 적합. lastTsRef.current로 읽고 lastTsRef.current = newTs로 씀. |
| --- |

## **10.3 분기 로직 시뮬레이션**

| **시나리오** | **newTs vs lastTsRef** | **동작** |
| --- | --- | --- |
| 홈에서 새로 진입 | 다름 (새 _ts) | params로 fetch |
| ◀▶ 버튼 누름 | 같음 | 핸들러가 직접 fetch (useFocusEffect 안 돔) |
| 햄버거 → 다른 화면 → 햄버거 내수입 | 같음 | 재포커스 → state로 fetch |
| 홈에서 다시 진입 (다른 달) | 다름 | params로 fetch |

## **10.4 핸들러는 직접 fetch**

| // ◀ 버튼 — 새 값을 미리 계산 후 즉시 fetch const handlePrevMonth = () => {   let newYear = year;   let newMonth = month;   if (month === 1) {     newYear = year - 1;     newMonth = 12;   } else {     newMonth = month - 1;   }   setYear(newYear);   setMonth(newMonth);   setLoading(true);   fetchData(newYear, newMonth);  // ★ state 대기 X, 즉시 }; |
| --- |

| **💡 핵심 - state와 fetch는 분리해서 처리** setState는 비동기지만, 새 값을 로컬 변수(newYear, newMonth)에 미리 저장해뒀으니 fetch에 즉시 사용 가능. state 변경 → 다음 렌더에 화면 갱신, fetch는 이미 진행 중 두 가지가 병렬로 일어나서 사용자 경험이 즉각적으로 느껴짐 |
| --- |

# **11. 통합 테스트 시나리오**

모든 작업이 끝나면 아래 시나리오들이 모두 정상 동작해야 합니다.

## **11.1 기본 동작 (5개)**

| **#** | **시나리오** | **기대 결과** |
| --- | --- | --- |
| 1 | 햄버거 → 내 수입 (첫 진입) | 오늘 달 데이터 표시 |
| 2 | ◀ 버튼 | 이전 달 데이터 즉시 표시 |
| 3 | ▶ 버튼 | 다음 달 데이터 즉시 표시 |
| 4 | 월 텍스트 탭 → 모달 | 년/월 선택 모달 열림 |
| 5 | "오늘로" 버튼 | 오늘 달로 즉시 이동 |

## **11.2 화면 분리 검증 (3개) — ★ 핵심**

| **#** | **시나리오** | **기대 결과** |
| --- | --- | --- |
| 6 | 내 수입에서 ◀ 두 번 → 2월 → 햄버거 → 홈 | 홈 캘린더는 4월 그대로 (영향 X) |
| 7 | 6번 후 홈에서 캘린더 ◀ → 3월 | 홈 요약 스트립 즉시 3월 데이터 |
| 8 | 7번 후 "3월 수입" 탭 | MySummary 3월 데이터 표시 |

## **11.3 일정 등록 → 즉시 반영 (1개)**

| **#** | **시나리오** | **기대 결과** |
| --- | --- | --- |
| 9 | 홈 4월 → 일정 등록 (단가 280,000) → 백 → 홈 요약 스트립 | 수입 +280,000원 즉시 반영 |

## **11.4 KST 변환 (1개)**

| **#** | **시나리오** | **기대 결과** |
| --- | --- | --- |
| 10 | 내 수입 화면 하단 "마지막 계산" | "오늘 HH:mm" 또는 "어제 HH:mm" 한국 시각으로 표시 |

# **12. 자주 발생한 이슈 4건 (실전 기록)**

초판 v10.3 매뉴얼대로 작업하다가 실제로 발생한 버그 4건을 기록합니다. 다음에 비슷한 화면 만들 때 같은 함정에 빠지지 마세요.

## **12.1 이슈 1: 초기 로드 시 데이터 0 표시**

| **항목** | **내용** |
| --- | --- |
| 증상 | MySummary 첫 진입 시 데이터가 0으로 표시. 새로고침 누르면 정상. |
| 원인 | useFocusEffect의 fetchData가 옛 state로 호출됨. setState는 비동기라 같은 사이클에서 옛 값 캡처. |
| 해결 | fetchData를 인자(fetchYear, fetchMonth) 받게 변경. 핸들러에서 새 값을 명시적으로 전달. |

## **12.2 이슈 2: 3월 데이터 자리에 4월 데이터**

| **항목** | **내용** |
| --- | --- |
| 증상 | 홈에서 4월로 진입 후 ◀ → 3월. 그런데 3월 자리에 4월 데이터. |
| 원인 | useFocusEffect 의존성에 route.params.month가 있어서 state 변경 시 useEffect가 재실행되며 옛 params(4월)로 다시 fetch. |
| 해결 | useFocusEffect는 _ts만 의존, params는 useEffect에서 useRef로 처리. |

## **12.3 이슈 3: 같은 달로 재진입 시 갱신 안 됨**

| **항목** | **내용** |
| --- | --- |
| 증상 | 홈 4월 → MySummary 4월 → ◀ 3월 → 햄버거 → 홈 4월 → 다시 "이번달 수입" 탭. 여전히 3월 표시. |
| 원인 | navigate("MySummary", { year: 4, month: 4 })를 두 번 호출했을 때 params 값이 같아서 변화 감지 안 됨. |
| 해결 | _ts: Date.now()를 params에 추가. 매 진입마다 새 값이라 변화 감지됨. |

## **12.4 이슈 4: 화면 책임 혼동 (★ 가장 큰 시행착오)**

| **항목** | **내용** |
| --- | --- |
| 증상 | MySummary가 2월일 때 홈 요약 스트립도 2월 데이터로 표시되어야 한다고 잘못 가정. |
| 원인 | 두 화면이 "같은 달을 보여줘야 한다"고 잘못된 요구사항 가정. Zustand 전역 상태로 양방향 동기화 시도. |
| 해결 | 두 화면의 책임 재정의. 홈은 캘린더의 달, MySummary는 사용자가 고른 달. 단방향 통신 (홈 → MySummary 진입 시만). |

| **⚠️ 가장 큰 교훈** 동기화 코드를 짜기 전에 "왜 동기화해야 하는가?"를 먼저 명확히 합니다. 두 화면의 책임이 다르면 분리가 정답이고, 같으면 공유(전역 상태)가 정답입니다. 책임이 모호한 상태에서 코드부터 짜면 끝없이 버그가 납니다. |
| --- |

# **13. React 비동기 함정 정리 (학습 노트)**

이번 작업에서 만난 React의 함정들. 다음 화면 만들 때 미리 알아두면 시간 절약됩니다.

## **13.1 함정 1: setState는 비동기**

| // ❌ 잘못된 패턴 setMonth(3); console.log(month);  // ← 여전히 옛 값 (예: 4) fetchData(year, month);  // ← 옛 month로 호출  // ✅ 올바른 패턴 const newMonth = 3; setMonth(newMonth); fetchData(year, newMonth);  // ← 새 값으로 호출 |
| --- |

## **13.2 함정 2: route.params는 자동 초기화 안 됨**

| **⚠️** 한 번 navigate("화면", { x: 1 })로 들어온 params는 화면이 살아있는 동안 그대로 남아있어요. 같은 값으로 다시 navigate해도 React Navigation이 변화로 인식 안 함. 해결: _ts: Date.now() 트릭으로 강제 갱신. |
| --- |

## **13.3 함정 3: useFocusEffect는 화면 진입 시점에만**

| **상황** | **useEffect** | **useFocusEffect** |
| --- | --- | --- |
| 컴포넌트 마운트 | 실행 | 실행 |
| 의존성 변경 | 실행 | 실행 안 됨 |
| 다른 화면 갔다 옴 | 실행 안 됨 | 실행 |
| 언마운트 (cleanup) | 실행 | 실행 |

두 훅의 동작이 다르므로 용도에 맞게 선택하세요. 화면 안에서 state 변경 시 fetch 필요하면 핸들러가 직접 호출하는 게 안전합니다.

## **13.4 함정 4: Drawer 화면은 메모리에 유지됨**

| **⚠️** Drawer Navigator의 화면들은 한 번 열리면 unmount 안 됨. 그래서 useState(initialValue)의 initialValue는 "첫 마운트 시 한 번만" 적용. 화면 재진입 시 새 값으로 갱신하려면 useEffect 또는 useRef 패턴 필요. |
| --- |

## **13.5 함정 5: cancelled 플래그 (메모리 누수 방지)**

| // 비동기 작업 중에 화면 떠날 가능성 있을 때 useFocusEffect(   useCallback(() => {     let cancelled = false;     const load = async () => {       const data = await fetchAPI();       if (!cancelled) {  // ← 화면 살아있을 때만         setData(data);       }     };     load();     return () => {       cancelled = true;  // ← 화면 떠날 때     };   }, []), ); |
| --- |

비유: 식당에서 음식 주문하고 가버리면 음식 나와도 그냥 버려요. 안 버리고 빈 자리에 두면 식당이 어수선해져요.

# **14. 최종 점검 체크리스트**

## **14.1 코드 변경 확인 (7개)**

| **#** | **파일** | **작업** | **완료** |
| --- | --- | --- | --- |
| 1 | src/types/api.ts | last_calculated_at: string │ null로 수정 | ☐ |
| 2 | src/api/schedulesApi.ts | getMonthlySummary 함수 추가 | ☐ |
| 3 | src/utils/format.ts | formatShortKRW, formatLastCalculated 추가 | ☐ |
| 4 | src/components/YearMonthPicker.tsx | 신규 생성 | ☐ |
| 5 | src/screens/CalendarScreen.tsx | onMonthChange prop 추가 (3곳) | ☐ |
| 6 | src/screens/HomeScreen.tsx | 전체 교체 | ☐ |
| 7 | src/screens/MySummaryScreen.tsx | 전체 교체 | ☐ |

## **14.2 동작 확인 (10개)**

| **#** | **시나리오** | **완료** |
| --- | --- | --- |
| 1 | 햄버거 → 내 수입 (첫 진입) → 오늘 달 표시 | ☐ |
| 2 | ◀▶ 월 이동 → 즉시 데이터 갱신 | ☐ |
| 3 | 월 텍스트 탭 → 모달 → 12월 선택 → 12월 표시 | ☐ |
| 4 | "오늘로" 버튼 → 오늘 달로 이동 | ☐ |
| 5 | 내 수입 2월 보던 중 햄버거 → 홈 (캘린더는 4월 그대로) → 영향 없음 | ☐ |
| 6 | 홈 캘린더 ◀ → 3월 → 요약 스트립 즉시 3월 데이터 + 라벨 "3월 수입" | ☐ |
| 7 | 홈에서 "이번달 수입" 탭 → MySummary 그 달 표시 | ☐ |
| 8 | ★ 일정 등록 → 홈 복귀 → 요약 스트립 즉시 갱신 | ☐ |
| 9 | "마지막 계산" 한국 시각으로 표시 (UTC+9) | ☐ |
| 10 | 데이터 없는 월 (예: 2025-01) → 0/—로 표시 (에러 X) | ☐ |

## **14.3 Git 커밋**

| cd C:\project\team-schedule git add . git status  git commit -m "feat(v10.3): 모바일 수입 대시보드 + 캘린더 연동 + 년/월 모달  - types/api.ts: MonthlySummary.last_calculated_at에 null 허용 - schedulesApi.ts: getMonthlySummary(year, month) 추가 - utils/format.ts: formatShortKRW, formatLastCalculated 추가 - components/YearMonthPicker.tsx 신규: 년/월 선택 모달 - CalendarScreen: onMonthChange 콜백 prop 추가 - HomeScreen: Mock 제거 + 캘린더 onMonthChange 연동 + 단방향 params - MySummaryScreen: Mock 제거 + useRef로 _ts 감지 + 자체 state  핵심 설계: 두 화면 분리 (단방향 통신) - 홈은 캘린더의 달을 따라감 - MySummary는 자유롭게 월 이동 (홈에 영향 X) - 진입 시에만 params + _ts로 시작 달 전달"  git push |
| --- |

# **15. 다음 단계 (v11 예고)**

v10.3을 끝내면 "공수·급여 자동 계산" 기능이 완전체로 완성됩니다. v11에서는 두 번째 핵심 기능인 "근태 자동 집계"로 넘어갑니다.

| **v11 작업** | **목적** |
| --- | --- |
| AttendanceController 확장 | 출퇴근 기록 + 일별/월별 집계 API |
| 모바일 출퇴근 화면 (CheckIn/Out) | 한 번 탭으로 출근/퇴근 (GPS 검증 옵션) |
| Schedule + Attendance 연결 | 일정 출근 시 schedule_users.checked_in_at 자동 기록 |
| monthly_summaries에 work_hours 추가 | 실제 근무시간 vs 공수 차이 분석 |
| 주간/월간 근태표 (PDF) | 세금 신고용 근태 증빙 |

| **💡 v11 우선순위 제안** 1순위: 출근 한 번 탭 → 위치 자동 기록 — 사용자 친화 핵심 2순위: 일정과 자동 연결 — "오늘 일정의 현장에서 출근했나?" 자동 감지 3순위: 월간 근태표 PDF — 5월 세금 신고 시즌 유료 전환 트리거 4순위: 주간 차트 — 시각화로 사용자 만족도 ↑ |
| --- |

# **변경 이력**

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| v10.2 | 2026-04-24 | 최초 작성 — 모바일 공수/단가 입력 UI 매뉴얼 |
| v10.2.1 | 2026-04-25 | 일정 수정/삭제 + ScheduleDetail v9.0 필드 표시 |
| v10.3 (초판) | 2026-04-25 | 최초 작성 — 모바일 수입 대시보드 실연동. MOCK 제거, getMonthlySummary 연동, MySummaryScreen + HomeScreen 매뉴얼 코드 제공 |
| **v10.3 (개정판)** | **2026-04-25** | **★ 실전 작업 결과 반영. (1) YearMonthPicker 컴포넌트 신규 추가 — 년/월 선택 모달. (2) CalendarScreen에 onMonthChange 콜백 prop 추가. (3) HomeScreen 캘린더 연동 — 요약 스트립이 캘린더의 달을 따라감. (4) MySummaryScreen 자체 state + useRef 기반 _ts 재진입 감지 패턴. (5) 단방향 통신 설계 — 홈 → MySummary는 진입 시에만 params 전달, 두 화면 책임 분리. (6) 시행착오 4건 기록 — 초기 로드 0 표시, 옛 데이터 덮어쓰기, 같은 달 재진입 무반응, 화면 책임 혼동. (7) React 비동기 함정 5가지 학습 노트 — setState 비동기, params 자동 초기화 X, useFocusEffect 진입 시점, Drawer 메모리 유지, cancelled 플래그.** |

**— v10.3 개정판 매뉴얼 —**

*다음: v11 — 근태 자동 집계 + 출퇴근 기록*

© 2026 Team Schedule Manager

© 2026 Team Schedule Manager  |  Page  /