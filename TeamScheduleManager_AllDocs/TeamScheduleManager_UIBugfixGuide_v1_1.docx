Team Schedule Manager

**UI 버그 수정 가이드**

모바일 실기기 테스트 + 공종/공정 구조 개선

작성일: 2026-04-27     버전: v1.1

# 0. 수정 항목 전체 요약

실제 핸드폰 테스트 후 발견된 UI 문제 3가지 + 일정 등록 화면 구조 개선 1가지를 수정합니다.

| **#** | **문제 화면** | **증상/내용** | **난이도** | **수정 파일** |
| --- | --- | --- | --- | --- |
| **1** | **로그인 화면** | 비밀번호 마스킹(●●●)이 흰색으로 보여 안 보임 | ⭐ 쉬움 (5분) | LoginScreen.tsx |
| **2** | **내 수입 현황** | 섹션 카드 배경이 검정이라 텍스트가 보이지 않음 | ⭐⭐ 보통 (15분) | MySummaryScreen.tsx |
| **3** | **홈 캘린더** | 격자선 흐리고 날짜/일정 텍스트가 너무 작음 | ⭐⭐ 보통 (20분) | CalendarScreen.tsx |
| **4** | **일정 등록/상세** | 공종(ENUM)과 공정(커스텀)이 겹쳐 사용자 혼란 → 공정 하나로 통합 | ⭐⭐ 보통 (20분) | ScheduleCreateScreen ScheduleDetailScreen |

# 1. 로그인 화면 — 비밀번호 마스킹 안 보임

## 1-1. 원인 설명

secureTextEntry={true} 속성을 넣으면 비밀번호가 ●●●● 점으로 바뀌어야 해요.

이 "점"도 결국 글자이기 때문에 글자 색상(color) 설정을 그대로 따라가요.

color를 흰색으로 지정하거나 지정 안 했는데 배경도 흰색이면,

**흰 배경 위에 흰 점 → 아무것도 안 보이는 현상이 발생해요.**

## 1-2. 수정 위치

| **항목** | **내용** |
| --- | --- |
| **파일 경로** | app/src/screens/LoginScreen.tsx |
| **찾을 키워드** | secureTextEntry 또는 password 입력 TextInput 스타일 |
| **수정 위치** | StyleSheet의 input 스타일 또는 TextInput style prop 안 |

## 1-3. 수정 전 / 후 코드

**[ 수정 전 — 이런 모양이면 문제 있음 ]**

// ❌ color가 흰색이거나 없는 경우

input: {

  color: '#FFFFFF',    // 점도 흰색!

  backgroundColor: '#FFFFFF',

}

**[ 수정 후 — 이렇게 바꿔주세요 ]**

<TextInput

  placeholder="비밀번호"

  placeholderTextColor="#999999"

  secureTextEntry={true}

  style={styles.input}

/>

input: {

  height: 52,

  borderWidth: 1,

  borderColor: '#DDDDDD',

  borderRadius: 8,

  paddingHorizontal: 14,

  fontSize: 16,

  color: '#222222',          // ★ 핵심! 진한 색으로

  backgroundColor: '#FFFFFF',

},

| 💡 쉽게 기억하는 법: "점도 글자다. 글자색이 흰색이면 점도 흰색이다." — color: '#222222' 한 줄이면 해결! |
| --- |

# 2. 내 수입 현황 화면 — 섹션 배경 검정색

## 2-1. 원인 설명

View(박스)의 backgroundColor를 지정하지 않으면,

폰이 다크모드일 때 OS가 자동으로 검정 배경을 깔아버려요.

**검정 배경 + 어두운 글자 = 안 보임**

## 2-2. 수정 위치

| **항목** | **내용** |
| --- | --- |
| **파일 경로** | app/src/screens/MySummaryScreen.tsx |
| **찾을 키워드** | StyleSheet.create 안의 card, section, container 스타일 |
| **수정 위치** | backgroundColor가 없거나 잘못된 색으로 된 스타일들 |

## 2-3. 수정 전 / 후 코드

**[ 수정 전 — backgroundColor 없음 ]**

card: {

  borderRadius: 12,

  padding: 16,

  // backgroundColor 없음! → 다크모드에서 검정됨

},

**[ 수정 후 ]**

container: {

  flex: 1,

  backgroundColor: '#F4F6F9',    // ★ 연한 회색 배경

  padding: 16,

},

card: {

  backgroundColor: '#FFFFFF',    // ★ 명시적 흰색

  borderRadius: 12,

  padding: 16,

  marginBottom: 12,

  elevation: 2,

  shadowColor: '#000',

  shadowOffset: { width: 0, height: 1 },

  shadowOpacity: 0.1,

  shadowRadius: 3,

},

| **확인할 스타일 이름** | **추가할 코드** |
| --- | --- |
| **container** | backgroundColor: '#F4F6F9' |
| **card** | backgroundColor: '#FFFFFF' |
| **section** | backgroundColor: '#FFFFFF' |
| **summaryBox** | backgroundColor: '#FFFFFF' |

| 💡 원칙: React Native에서는 모든 View에 backgroundColor를 명시적으로 적어주는 습관을 들이세요. 안 적으면 다크모드에서 깨져요. |
| --- |

# 3. 홈 캘린더 화면 — 격자선 흐리고 글자 작음

## 3-1. 원인 설명

react-native-calendars 라이브러리의 기본 테마는 격자선이 매우 연하고 글자도 작아요.

컴퓨터 에뮬레이터에서는 그냥저냥 보이지만 실제 폰에서는 선이 거의 안 보여요.

## 3-2. 수정 위치

| **항목** | **내용** |
| --- | --- |
| **파일 경로** | app/src/screens/CalendarScreen.tsx |
| **찾을 키워드** | <Calendar ... /> 컴포넌트 |
| **수정 위치** | <Calendar> 태그 안에 theme 속성 추가 |

## 3-3. 수정 코드

**[ 수정 후 — theme 속성 추가 ]**

<Calendar

  markedDates={markedDates}

  onDayPress={handleDayPress}

  theme={{

    // 글자 크기

    textDayFontSize: 15,

    textMonthFontSize: 16,

    textDayHeaderFontSize: 13,

    // 날짜 글자 색

    dayTextColor: '#222222',

    textSectionTitleColor: '#555555',

    // 오늘 날짜

    todayTextColor: '#2E75B6',

    todayBackgroundColor: '#E8F1FB',

    // 선택된 날짜

    selectedDayBackgroundColor: '#2E75B6',

    selectedDayTextColor: '#FFFFFF',

    // 비활성 날짜 (다른 달)

    textDisabledColor: '#BBBBBB',

    // 격자선

    'stylesheet.calendar.main': {

      week: {

        marginTop: 0,

        marginBottom: 0,

        flexDirection: 'row',

        justifyContent: 'space-around',

        borderTopWidth: 1,

        borderTopColor: '#DDDDDD',

      },

    },

  }}

/>

| ⚠️ 'stylesheet.calendar.main' 부분은 따옴표가 포함된 특수한 키 이름이에요. 이 부분만 먼저 빼고 글자 크기/색상부터 적용해본 뒤, 잘 되면 격자선 부분을 추가하는 순서로 진행하세요. |
| --- |

# 4. 일정 등록/상세 화면 — 공종·공정 통합 (★ v1.1 신규)

## 4-1. 왜 수정하는가

현재 일정 등록 화면에 비슷한 역할의 선택 항목이 두 개 존재해요:

| **필드명** | **DB 컬럼** | **내용** |
| --- | --- | --- |
| **공종** | schedules.work_type | ENUM 고정 3가지 — 도배 / 타일 / 필름 |
| **공정** | schedules.work_type_id | work_types 테이블 참조 — 커스텀 등록 가능 |

사용자 입장에서는 "왜 두 번 선택해야 하지?" 라는 혼란이 생겨요.

세부 작업 내용(합지/실크 등)은 메모 필드에 직접 적으면 충분하고,

**카테고리를 너무 세분화하면 오히려 입력이 귀찮아져서 사용자가 안 써요.**

| ✅ 결정: work_type ENUM은 UI에서 제거하고, work_type_id(커스텀 공정) 하나로 통합합니다. DB 컬럼은 그대로 두고 화면에서만 숨기면 돼요. — DB 마이그레이션 불필요 |
| --- |

## 4-2. 수정 파일 1 — ScheduleCreateScreen.tsx (일정 등록 폼)

| **항목** | **내용** |
| --- | --- |
| **파일 경로** | app/src/screens/ScheduleCreateScreen.tsx |
| **할 일** | work_type ENUM 선택 UI 제거, work_type_id 선택 UI만 남기기 |
| **찾을 키워드** | work_type / WorkType / 공종 / 도배 타일 필름 |

**[ 수정 전 — 두 개가 동시에 존재 ]**

// ❌ 수정 전: 공종(ENUM) + 공정(커스텀) 두 개 선택

// 공종 선택 (ENUM 고정값)

<View style={styles.section}>

  <Text>공종</Text>

  {['도배','타일','필름'].map(type => (

    <Pressable key={type} onPress={() => setWorkType(type)}>

      <Text>{type}</Text>

    </Pressable>

  ))}

</View>

// 공정 선택 (work_types 테이블)

<View style={styles.section}>

  <Text>공정</Text>

  {/* work_types 목록 ... */}

</View>

**[ 수정 후 — 공정 하나만 남기기 ]**

// ✅ 수정 후: 공정(커스텀) 하나만

// 공종 선택 섹션 전체 삭제 ← 이 블록을 통째로 제거

// 공정 선택만 남김

<View style={styles.section}>

  <Text style={styles.label}>공정</Text>

  {/* work_types 목록 그대로 유지 */}

</View>

// API 전송 시 work_type 필드도 제거

const payload = {

  date,

  work_type_id,     // 공정 ID만 보냄

  // work_type: ..., ← 이 줄 제거

  district,

  area_m2,

  memo,

  // ...

};

| 💡 work_type 상태값(useState)도 같이 제거해주세요. const [workType, setWorkType] = useState('') 같은 줄을 찾아서 삭제하면 돼요. |
| --- |

## 4-3. 수정 파일 2 — ScheduleDetailScreen.tsx (일정 상세 화면)

| **항목** | **내용** |
| --- | --- |
| **파일 경로** | app/src/screens/ScheduleDetailScreen.tsx |
| **할 일** | 헤더의 work_type Chip 제거, work_type_relation(공정)만 표시 |
| **찾을 키워드** | schedule.work_type / <Chip> / work_type_relation |

**[ 수정 전 — Chip(공종)과 공정 dot가 함께 표시됨 ]**

// ❌ 수정 전: work_type Chip + work_type_relation 둘 다 표시

// 헤더 영역

<View style={styles.header}>

  <Text style={styles.date}>{schedule.date}</Text>

  {schedule.work_type && <Chip>{schedule.work_type}</Chip>}  {/* ← 제거 */}

</View>

// 공정 dot (별도 줄)

{schedule.work_type_relation && (

  <View style={styles.row}>

    <View style={[styles.dot, {backgroundColor: schedule.work_type_relation.color}]} />

    <Text>{schedule.work_type_relation.name}</Text>

  </View>

)}

**[ 수정 후 — 공정 하나만 표시 ]**

// ✅ 수정 후: work_type Chip 제거, work_type_relation만

// 헤더 영역

<View style={styles.header}>

  <Text style={styles.date}>{schedule.date}</Text>

  {/* <Chip> 제거 */}

</View>

// 공정 dot는 그대로 유지

{schedule.work_type_relation && (

  <View style={styles.row}>

    <View style={[styles.dot, {backgroundColor: schedule.work_type_relation.color}]} />

    <Text>{schedule.work_type_relation.name}</Text>

  </View>

)}

| ⚠️ 주의: work_type_relation이 null인 경우(공정을 선택 안 한 기존 데이터)에는 아무것도 안 표시될 수 있어요. 이런 경우 기본값으로 "공정 미지정" 텍스트를 보여주는 처리를 추가하면 안전해요. |
| --- |

| ✅ DB는 건드리지 않아요. schedules 테이블의 work_type 컬럼은 그대로 남겨두고 화면에서만 숨기면 끝이에요. 나중에 전체 마이그레이션이 필요하다고 판단되면 그때 별도로 처리하면 돼요. |
| --- |

# 5. 집에서 작업할 순서

| **순서** | **파일** | **할 일** | **예상 시간** |
| --- | --- | --- | --- |
| **1** | **LoginScreen.tsx** | input 스타일에 color: '#222222' 추가 | 5분 |
| **2** | **MySummaryScreen.tsx** | card, container 스타일에 backgroundColor 명시 | 15분 |
| **3** | **CalendarScreen.tsx** | Calendar 컴포넌트에 theme 속성 추가 | 20분 |
| **4** | **ScheduleCreateScreen.tsx** | work_type ENUM 선택 UI + useState + payload 제거 | 15분 |
| **5** | **ScheduleDetailScreen.tsx** | 헤더의 work_type Chip 제거, 공정 dot만 유지 | 10분 |

| 💡 각 파일 수정 후에는 에뮬레이터 또는 실제 폰에서 확인하고 다음으로 넘어가세요. 한꺼번에 다 바꾸면 뭐가 문제인지 찾기 어려워요. |
| --- |

# 변경 이력

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| **v1.0** | 2026-04-27 | 최초 작성 — 실기기 테스트 후 발견된 UI 버그 3건. (1) 로그인 마스킹 색상. (2) 수입현황 검정 배경. (3) 캘린더 격자선/글자. |
| **v1.1** | 2026-04-27 | ★ 4번 항목 추가 — 일정 등록/상세 화면의 공종(work_type ENUM)·공정(work_type_id) 중복 구조 개선. work_type ENUM을 UI에서 제거하고 커스텀 공정(work_type_id) 하나로 통합. DB 컬럼은 유지, 화면에서만 숨김 처리. 수정 파일: ScheduleCreateScreen.tsx, ScheduleDetailScreen.tsx. |

© 2026 Team Schedule Manager