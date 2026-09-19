Team Schedule Manager

**UI 버그 수정 가이드**

버그 수정 + 구조 개선 + 신규 기능 + 홈 레이아웃 개편 + 캘린더 셀 개선

작성일: 2026-04-27     버전: v1.6

# 0. 수정/추가 항목 전체 요약

총 12가지 항목 — UI 버그 3건 / 구조 개선 3건 / 신규 기능 4건 / 홈 개편 1건 / 캘린더 셀 개선 1건

| **#** | **화면** | **내용** | **구분** | **수정 파일** |
| --- | --- | --- | --- | --- |
| **1~5** | (v1.2 참고) | 버그 3건 + 공종 통합 + 세금 표현 | 버그/개선 | Login/MySummary/Calendar/ScheduleCreate/Detail |
| **6** | (v1.2 참고) | 3.3% 자동공제 분리 처리 | 개선 | MonthlySummaryService / MySummaryScreen |
| **7** | (v1.3 참고) | 원천징수 여부 토글 추가 | 신규 | 마이그레이션/Schedule.php/Controller/화면3개 |
| **8** | (v1.4 참고) | 사업자 여부 라디오 버튼 | 신규 | users 마이그레이션/User.php/ProfileScreen |
| **9** | (v1.4 참고) | 종합소득세 FCM 알림 | 신규 | NotificationService/Kernel/FCM |
| **10** | (v1.5 참고) | 사진 갤러리 다건 업로드 | 신규 | ScheduleDetailScreen |
| **11** | **홈 전체** | ★ 홈 화면 레이아웃 전면 개편 (요약 스트립 축소 + 툴바 제거 + 헤더 재구성 + 스와이프) | 신규 | HomeScreen.tsx CalendarScreen.tsx AppNavigator.tsx (헤더) |
| **12** | **캘린더 셀** | ★ 캘린더 셀 표시 방식 개선 점(●) → 컬러 바 + 공정명 / 팀 모드 분기 | 신규 | CalendarScreen.tsx (커스텀 Day 컴포넌트) |

# 1~10. 기존 수정 항목 (v1.5와 동일)

| **💡 항목 1~10의 수정 방법은 v1.5 문서와 동일합니다. v1.6은 항목 11(홈 레이아웃 개편)과 항목 12(캘린더 셀 개선)가 추가된 버전이에요.** |
| --- |

# 11. 홈 화면 레이아웃 전면 개편 (★ v1.6 신규)

## 11-1. 수정 파일 목록

| **파일** | **수정 내용** |
| --- | --- |
| **HomeScreen.tsx** | summaryStrip 교체 (44px→32px, 항목 변경) + 헤더 옵션 설정 |
| **CalendarScreen.tsx** | 툴바 블록 제거 + enableSwipeMonths 추가 |
| **AppNavigator.tsx (또는 Drawer 설정)** | 헤더 타이틀을 년/월 Pressable로 교체 + 오늘 버튼 추가 |

## 11-2. STEP 1 — HomeScreen.tsx 수정

### ① summaryStrip 교체 — 항목 변경 + 높이 축소

**[ 수정 전 — 현장수 포함, 44px ]**

// ❌ 기존: 근무일 / 이번달 수입 / 현장수

<View style={styles.summaryStrip}>  {/* height: 44 */}

  <Pressable ...><Text>근무일</Text></Pressable>

  <Pressable ...><Text>이번달 수입</Text></Pressable>

  <Pressable ...><Text>현장</Text></Pressable>  {/* ← 제거 */}

</View>

**[ 수정 후 — 공수 추가, 32px ]**

// ✅ 수정 후: 근무일 / 이번달 수입 / 이번달 공수

<View style={styles.summaryStrip}>

  <Pressable style={styles.summaryItem} onPress={goToMySummary}>

    <Text style={styles.summaryValue}>{summary?.work_days ?? 0}일</Text>

    <Text style={styles.summaryLabel}>근무일</Text>

  </Pressable>

  <View style={styles.separator} />

  <Pressable style={[styles.summaryItem, styles.summaryItemHighlight]}

    onPress={goToMySummary}>

    <Text style={styles.summaryValueHighlight}>

      ₩{formatShortKRW(summary?.total_income ?? 0)}

    </Text>

    <Text style={styles.summaryLabelHighlight}>이번달수입</Text>

  </Pressable>

  <View style={styles.separator} />

  <Pressable style={styles.summaryItem} onPress={goToMySummary}>

    <Text style={styles.summaryValue}>

      {summary?.total_work_units ?? 0}공수

    </Text>

    <Text style={styles.summaryLabel}>이번달공수</Text>

  </Pressable>

</View>

// styles 수정 — 높이 축소

summaryStrip: {

  flexDirection: 'row',

  height: 32,          // ★ 44 → 32px

  alignItems: 'center',

  backgroundColor: '#FFFFFF',

  borderBottomWidth: 1,

  borderBottomColor: '#F0F0F0',

  paddingHorizontal: 8,

},

### ② 헤더에 년/월 탭 + 오늘 버튼 설정

navigation.setOptions()로 헤더 타이틀과 오른쪽 버튼을 동적으로 설정해요.

calendarYear, calendarMonth, summary가 바뀔 때마다 헤더가 자동 업데이트돼요.

// state 추가

const [pickerVisible, setPickerVisible] = useState(false);

// useEffect로 헤더 옵션 설정

useEffect(() => {

  navigation.setOptions({

    // 중앙: 년/월 탭하면 모달

    headerTitle: () => (

      <Pressable onPress={() => setPickerVisible(true)}

        style={{flexDirection:'row',alignItems:'center',gap:4}}>

        <Text style={{fontSize:16,fontWeight:'700',color:'#1F3864'}}>

          {calendarYear}년 {calendarMonth}월 ▾

        </Text>

      </Pressable>

    ),

    // 오른쪽: 오늘 버튼

    headerRight: () => (

      <Pressable onPress={handleGoToday}

        style={{marginRight:12,paddingHorizontal:10,paddingVertical:4,

                borderRadius:6,borderWidth:1,borderColor:'#2E75B6'}}>

        <Text style={{fontSize:13,color:'#2E75B6',fontWeight:'600'}}>오늘</Text>

      </Pressable>

    ),

  });

}, [calendarYear, calendarMonth, summary]);

// YearMonthPicker 연결 — JSX에 추가

<YearMonthPicker

  visible={pickerVisible}

  year={calendarYear}

  month={calendarMonth}

  onClose={() => setPickerVisible(false)}

  onSelect={(y, m) => {

    setPickerVisible(false);

    setCalendarYear(y);

    setCalendarMonth(m);

    calendarRef.current?.jumpToDate(`${y}-${String(m).padStart(2,'0')}-01`);

  }}

/>

| **💡 YearMonthPicker는 v10.3에서 이미 만들어둔 컴포넌트예요! 새로 만들 필요 없이 import해서 바로 써요.** 파일 경로: app/src/components/YearMonthPicker.tsx |
| --- |

## 11-3. STEP 2 — CalendarScreen.tsx 수정

### ① 툴바 블록 제거

공종 범례(● 도배 ● 타일 ● 필름)와 오늘 버튼이 있는 툴바 View를 통째로 제거해요.

// ❌ 이 블록 전체 제거

{/* 툴바 */}

<View style={styles.toolbar}>

  {/* 공종 범례 */}

  <View style={styles.legend}>

    <View style={[styles.dot, {backgroundColor: '#2E75B6'}]} />

    <Text>도배</Text>

    ...

  </View>

  {/* 오늘 버튼 */}

  <Pressable onPress={handleGoToday}>오늘</Pressable>

</View>

// StyleSheet에서도 toolbar, legend 관련 스타일 제거

### ② 스와이프 월 이동 활성화

Calendar 컴포넌트에 enableSwipeMonths 옵션 한 줄 추가하면 끝이에요.

<Calendar

  enableSwipeMonths={true}   // ★ 이 한 줄 추가

  onMonthChange={m => {

    setCurrentMonth(m.dateString);

    if (onMonthChange) onMonthChange(m.year, m.month);

  }}

  // ... 나머지 기존 옵션들

/>

| **💡 enableSwipeMonths는 react-native-calendars 기본 내장 옵션이에요.** 추가 라이브러리 설치 없이 옵션 하나만으로 스와이프 월 이동이 활성화돼요. |
| --- |

# 12. 캘린더 셀 표시 방식 개선 (★ v1.6 신규)

## 12-1. 핵심 원칙

공간을 확보해도(11번) 셀 안 표시 방식을 바꾸지 않으면 달력이 커져도 내용이 여전히 안 보여요.

**두 작업(11번 + 12번)을 같이 해야 체감이 확실히 달라져요.**

## 12-2. 사용자 유형별 표시 분기

| **항목** | **프리랜서 모드** | **팀 모드** |
| --- | --- | --- |
| **표시 내용** | 공정명 + 왼쪽 색상 바 |
| **표시 내용** |  | 팀원이름 → 현장지역 (단가/수입 절대 표시 안 함) |
| **최대 표시** | 2개 + "+N더" |
| **탭하면** | 일정 상세 모달 |

## 12-3. 커스텀 Day 컴포넌트 수정 코드

CalendarScreen.tsx의 dayComponent prop을 수정해요.

// userType은 authStore 또는 Context에서 가져옴

const { userType } = useAuthStore();

// 커스텀 Day 컴포넌트 안에서

const renderScheduleItems = (daySchedules: Schedule[]) => {

  const maxShow = 2;

  const shown = daySchedules.slice(0, maxShow);

  const extra = daySchedules.length - maxShow;

  return (

    <>

      {shown.map((s, i) => (

        <View key={i} style={styles.scheduleBar}>

          {/* 프리랜서: 공정명 + 색상 바 */}

          {userType === 'freelancer' && (

            <>

              <View style={[styles.colorBar,

                {backgroundColor: s.work_type_color ?? '#2E75B6'}]} />

              <Text style={styles.barText} numberOfLines={1}>

                {s.work_type_name ?? '일정'}

              </Text>

            </>

          )}

          {/* 팀 모드: 팀원이름 → 지역 (단가/수입 절대 표시 안 함) */}

          {userType !== 'freelancer' && (

            <Text style={styles.teamText} numberOfLines={1}>

              {s.user_name} {s.district}

            </Text>

          )}

        </View>

      ))}

      {/* +N더 표시 */}

      {extra > 0 && (

        <Text style={styles.extraText}>+{extra}개</Text>

      )}

    </>

  );

};

// styles 추가

scheduleBar: {

  flexDirection: 'row',

  alignItems: 'center',

  height: 16,

  marginTop: 1,

  overflow: 'hidden',

},

colorBar: {

  width: 3,

  height: '100%',

  borderRadius: 1.5,

  marginRight: 3,

},

barText: {

  fontSize: 10,

  color: '#333',

  flex: 1,

},

teamText: {

  fontSize: 10,

  color: '#444',

  flex: 1,

},

extraText: {

  fontSize: 9,

  color: '#999',

  marginTop: 1,

},

| **⚠️ 팀 모드에서 단가, 공수, 수입, 경비는 어떤 경우에도 셀에 표시하지 마세요.** 이는 기획서 v2.5에서 확정된 시스템 고정 정책이에요. |
| --- |

## 12-4. 셀 높이 조정

일정 텍스트가 들어갈 공간을 확보하려면 Calendar의 dayHeight 옵션을 키워야 해요.

<Calendar

  enableSwipeMonths={true}

  dayComponent={CustomDay}   // 커스텀 컴포넌트

  theme={{

    // ... 기존 theme 옵션 (항목 3번 참고)

    // 셀 높이는 theme이 아닌 컴포넌트 style로 조정

  }}

/>

// CustomDay 컴포넌트의 최상위 View

<View style={{

  width: '100%',

  minHeight: 56,   // ★ 기존보다 넉넉하게 (일정 2개 들어갈 공간)

  alignItems: 'center',

  paddingTop: 4,

  paddingBottom: 2,

}}>

  <Text style={styles.dayNumber}>{date.day}</Text>

  {renderScheduleItems(daySchedules)}

</View>

# 13. 집에서 작업할 순서 (전체)

1~10번: v1.5 문서 참고 / 11~12번: 아래 순서대로

| **순서** | **파일** | **할 일** | **시간** |
| --- | --- | --- | --- |
| **1~10** | (v1.5 참고) | 버그 수정 + 구조 개선 + 신규 기능 5가지 | 약 3.5시간 |
| **11-1** | **CalendarScreen.tsx** | 툴바 블록 전체 제거 + enableSwipeMonths 추가 | 10분 |
| **11-2** | **HomeScreen.tsx** | summaryStrip 교체 (근무일/수입/공수, 32px) | 20분 |
| **11-3** | **HomeScreen.tsx** | 헤더 옵션 설정 (년/월 탭 + 오늘 버튼) | 20분 |
| **11-4** | **HomeScreen.tsx** | YearMonthPicker 연결 | 15분 |
| **11-5** | **에뮬레이터** | 스와이프 월 이동 + 오늘 버튼 + 모달 동작 확인 | 10분 |
| **12-1** | **CalendarScreen.tsx** | 커스텀 Day 컴포넌트에 renderScheduleItems 추가 | 30분 |
| **12-2** | **CalendarScreen.tsx** | 셀 minHeight 조정 + styles 추가 | 10분 |
| **12-3** | **에뮬레이터** | 프리랜서/팀 모드별 셀 표시 확인 | 10분 |

| **✅ 11번(레이아웃)을 먼저 완성하고 확인한 뒤 12번(셀 표시)을 진행하세요. 두 작업이 독립적이라 순서대로 하면 문제 추적이 쉬워요.** |
| --- |

# 변경 이력

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| **v1.0~v1.5** | 2026-04-27 | 버그 3건 / 공종 통합 / 세금 표현 / 원천징수 / 사업자여부 / FCM 알림 / 사진 다건 업로드 |
| **v1.6** | 2026-04-27 | ★ 항목 11·12 추가. (11) 홈 화면 레이아웃 전면 개편 — summaryStrip 44px→32px(현장수→공수 교체), 툴바 완전 제거, 헤더에 년/월 Pressable(탭→YearMonthPicker 모달)+오늘 버튼, enableSwipeMonths 스와이프 월 이동. (12) 캘린더 셀 표시 개선 — 점(●)→컬러 바+공정명(프리랜서)/팀원이름→지역(팀 모드), 단가/수입 팀원 비공개 정책 적용, minHeight 56px 셀 확장, +N더 표시. |

© 2026 Team Schedule Manager