Team Schedule Manager  |  개발 매뉴얼 v7.3

**Team Schedule Manager**

**개발 매뉴얼 v7.3**

**캘린더 연·월 선택 기능 추가 (웹 + 모바일)**

작성일: 2026년 04월 23일  |  기반: v7.2 (2026-04-22)  |  패치 매뉴얼

**★ v7.3 변경사항 (2026-04-23)**

- [웹] frontend/src/pages/Schedule.tsx — FullCalendar 헤더 가운데 제목을 버튼으로 교체 (customButtons) + Ant Design DatePicker 모달로 연·월 선택

- [모바일] app/src/screens/CalendarScreen.tsx — renderHeader prop으로 커스텀 헤더 적용 + 연·월 Picker 휠 모달 추가

- [모바일] @react-native-picker/picker 라이브러리 신규 설치

- [테스트] 5장 체크리스트 신규 추가

# **1. 왜 이 기능이 필요한가?**

| 💡 현장 팀장님은 실제로 2~3달 뒤 일정을 미리 잡는 일이 많습니다. 3월에 5월 일정을 잡으려고 화살표(▶)를 두 번 누르는 정도는 괜찮지만, 5~6개월 뒤 공사 일정이라면 화살표를 5~6번 연속으로 눌러야 합니다. 모바일에서는 특히 불편합니다. |
| --- |

이 매뉴얼은 '현재 표시 중인 연·월 텍스트'를 터치하면 연·월 선택 창이 열리는 기능을 웹과 모바일 양쪽에 추가하는 작업을 다룹니다.

## **1.1 기대 동작 (UI 흐름)**

- 사용자가 달력 상단에 있는 '2026년 3월' 같은 텍스트를 터치한다

- 연·월 선택 모달(팝업)이 뜬다

- 원하는 연도와 월을 선택한다

- 달력이 해당 월로 즉시 점프한다

## **1.2 작업 범위**

| **구분** | **파일 경로** | **라이브러리** | **작업 내용** |
| --- | --- | --- | --- |
| 웹 관리자 | frontend/src/pages/Schedule.tsx | FullCalendar v6 + Ant Design | customButtons + DatePicker 모달 |
| 모바일 앱 | app/src/screens/CalendarScreen.tsx | react-native-calendars | renderHeader + Picker 휠 모달 |
| 모바일 신규 | app/package.json | @react-native-picker/picker | npm install로 추가 |

# **2. 웹 관리자 수정 — FullCalendar**

## **2.1 FullCalendar 헤더 구조 이해**

FullCalendar는 달력 상단에 headerToolbar라는 영역이 있습니다. 기본값은 이렇게 생겼어요:

| headerToolbar={{   left:   'prev,next today',   // 왼쪽 영역 (◀, ▶, 오늘)   center: 'title',             // 가운데 영역 ('2026년 3월')   right:  'dayGridMonth,dayGridWeek,dayGridDay'  // 오른쪽 영역 (뷰 전환) }} |
| --- |

| 💡 title 이라는 키워드가 '현재 표시 중인 연·월 텍스트'를 자동으로 그려주는 FullCalendar 내장 기능입니다. 이걸 누를 수 있게 하려면 title 대신 우리가 만든 버튼으로 교체해야 합니다. |
| --- |

## **2.2 customButtons란?**

customButtons는 FullCalendar에서 제공하는 '사용자 정의 버튼 만들기' 기능입니다. 여기에 버튼 이름, 표시 텍스트, 클릭 시 실행할 함수를 등록하면 headerToolbar에서 마치 내장 버튼처럼 사용할 수 있습니다.

| customButtons={{   myBtn: {     text: '내가 만든 버튼',       // 버튼에 표시될 글자     click: () => alert('클릭!')  // 버튼 눌렀을 때 실행할 함수   } }} |
| --- |

## **2.3 datesSet 이벤트란?**

datesSet은 달력이 표시하는 날짜 범위가 바뀔 때마다 자동으로 호출되는 함수입니다. 예를 들어 사용자가 ◀ 화살표를 눌러 2월로 이동하면, datesSet이 실행되면서 현재 화면에 그려지는 첫 날짜·마지막 날짜 정보를 넘겨줍니다.

우리는 이걸 이용해서 '사용자가 화살표로 월을 이동해도 버튼에 표시되는 연·월 글자가 자동으로 따라서 바뀌도록' 만들 겁니다.

## **2.4 calendarRef와 getApi(), gotoDate() 함수**

모달에서 연·월을 선택했을 때, 달력에게 "이 달로 점프해" 라고 명령을 내려야 합니다. 이때 쓰는 것이 calendarRef 입니다.

| **함수** | **역할** | **사용 예시** |
| --- | --- | --- |
| useRef() | React 컴포넌트 인스턴스를 '손잡이'처럼 붙잡아둠 | const ref = useRef<FullCalendar>(null) |
| getApi() | FullCalendar 내부 조작용 API 객체를 꺼내줌 | ref.current.getApi() |
| gotoDate(date) | 달력을 해당 날짜가 포함된 월로 이동 | api.gotoDate(new Date(2026, 4, 1)) |

| **⚠️ gotoDate()에 넣는 Date 객체는 자바스크립트 표준 Date입니다. 월(month)은 0부터 시작해요! 1월=0, 5월=4, 12월=11. dayjs를 쓰면 이 혼란을 피할 수 있어서 이 매뉴얼에서는 dayjs(...).toDate()로 변환해서 사용합니다.** |
| --- |

## **2.5 Schedule.tsx 전체 교체 코드**

파일 경로: frontend/src/pages/Schedule.tsx

| // frontend/src/pages/Schedule.tsx import { useRef, useState } from 'react' import { Typography, DatePicker, Modal, Button } from 'antd' import { CalendarOutlined } from '@ant-design/icons' import FullCalendar from '@fullcalendar/react' import dayGridPlugin from '@fullcalendar/daygrid' import interactionPlugin from '@fullcalendar/interaction' import koLocale from '@fullcalendar/core/locales/ko' import dayjs, { Dayjs } from 'dayjs'  export default function Schedule() {   // ─── [1] FullCalendar 인스턴스 손잡이 ───   //    이 손잡이로 나중에 "이 달로 이동해" 명령을 내립니다.   const calendarRef = useRef<FullCalendar>(null)    // ─── [2] 모달 열림 여부 ───   const [pickerOpen, setPickerOpen] = useState(false)    // ─── [3] 중앙 버튼에 표시할 연·월 텍스트 ───   //    달력이 표시 중인 월이 바뀔 때마다 갱신됩니다.   const [titleText, setTitleText] = useState(     dayjs().format('YYYY년 M월')   )    // ─── [4] DatePicker에서 선택 시 호출되는 함수 ───   //    date는 Ant Design이 넘겨주는 Dayjs 객체입니다.   const handlePickMonth = (date: Dayjs │ null) => {     if (!date) return      // getApi() — FullCalendar 내부 조작용 객체     // gotoDate() — 해당 날짜가 속한 월로 달력 이동     calendarRef.current?.getApi().gotoDate(date.toDate())      // 버튼 글자도 같이 갱신     setTitleText(date.format('YYYY년 M월'))     setPickerOpen(false)   }    return (     <div>       <Typography.Title level={4}>         <CalendarOutlined style={{ marginRight: 8 }} />         스케줄 관리       </Typography.Title>        <FullCalendar         ref={calendarRef}         plugins={[dayGridPlugin, interactionPlugin]}         initialView='dayGridMonth'         locale={koLocale}          // ─── [5] 헤더 구성 ───         //    가운데(center)에 기본 'title' 대신 우리가 만든 버튼을 배치         headerToolbar={{           left:   'prev',           center: 'pickMonthBtn',           right:  'next today',         }}          // ─── [6] 사용자 정의 버튼 등록 ───         customButtons={{           pickMonthBtn: {             text: titleText,             click: () => setPickerOpen(true),           },         }}          // ─── [7] 달력이 표시하는 달이 바뀌면 호출됨 ───         //    arg.view.currentStart — 현재 표시 중인 달의 첫 날짜         datesSet={(arg) => {           setTitleText(             dayjs(arg.view.currentStart).format('YYYY년 M월')           )         }}          events={[           { title: '강남구 OO아파트', date: '2026-04-20', color: '#1E88E5' },           { title: '서초구 XX빌라',  date: '2026-04-22', color: '#43A047' },         ]}         dateClick={(info) => alert(`${info.dateStr} 클릭!`)}         height='auto'       />        {/* ─── [8] 연·월 선택 모달 ─── */}       <Modal         title='년·월 선택'         open={pickerOpen}         onCancel={() => setPickerOpen(false)}         footer={null}         width={360}       >         <DatePicker           picker='month'                // 연+월 전용 선택 모드           style={{ width: '100%' }}           onChange={handlePickMonth}           placeholder='년/월을 선택하세요'           format='YYYY년 M월'           defaultValue={dayjs(titleText, 'YYYY년 M월')}         />         <div style={{ marginTop: 12, textAlign: 'right' }}>           <Button onClick={() => setPickerOpen(false)}>닫기</Button>         </div>       </Modal>     </div>   ) } |
| --- |

## **2.6 주요 포인트 해설**

| **번호** | **코드 위치** | **설명** |
| --- | --- | --- |
| [1] | useRef<FullCalendar>(null) | FullCalendar 인스턴스를 손잡이처럼 붙잡는 변수. 이게 없으면 나중에 '점프' 명령을 내릴 수가 없습니다. |
| [2] | pickerOpen state | 모달의 열림/닫힘을 제어하는 React 상태값입니다. |
| [3] | titleText state | 버튼 위에 표시되는 '2026년 4월' 같은 텍스트입니다. |
| [4] | handlePickMonth | DatePicker에서 값이 바뀌면 호출되는 콜백. 달력에 gotoDate 명령을 내립니다. |
| [5] | headerToolbar | 기본 'title' 대신 'pickMonthBtn'을 center에 배치해 제목 자체를 버튼화. |
| [6] | customButtons | 버튼의 표시 글자(text)와 클릭 동작(click)을 정의하는 곳입니다. |
| [7] | datesSet | 사용자가 ◀ ▶ 화살표나 '오늘' 버튼을 눌러 달력이 바뀌면 호출됩니다. 버튼 글자를 자동 동기화. |
| [8] | <Modal> | Ant Design의 팝업 창 컴포넌트. picker="month"가 이 기능의 핵심입니다. |

## **2.7 테스트 방법**

| # 터미널 1 — 백엔드 cd C:\project\team-schedule\backend php artisan serve  # 터미널 2 — 프론트 cd C:\project\team-schedule\frontend npm run dev  # 브라우저에서 http://localhost:3000/schedule 접속 |
| --- |

| **확인 항목** | **기대 결과** |
| --- | --- |
| 달력 상단 가운데 연·월 텍스트가 보이는지 | '2026년 4월' 형태로 표시 |
| 텍스트가 버튼처럼 눌리는지 | 마우스를 올리면 커서가 바뀌고 클릭 가능 |
| 클릭 시 모달이 뜨는지 | '년·월 선택' 제목 + DatePicker 나타남 |
| DatePicker에서 월 선택 시 달력이 이동하는지 | 선택한 월이 즉시 달력에 표시됨 |
| 화살표(◀ ▶)로 이동해도 제목이 동기화되는지 | 버튼 글자가 이동한 월에 맞게 자동 변경 |
| '오늘' 버튼을 누르면 이번 달로 오는지 | 오늘 날짜가 속한 월로 이동 + 버튼 글자 동기화 |

# **3. 모바일 앱 수정 — react-native-calendars**

## **3.1 라이브러리 설치**

모바일에서는 iOS/Android 네이티브 '휠 선택기' UI를 쓰기 위해 @react-native-picker/picker 를 설치합니다.

| cd C:\project\team-schedule\app npm install @react-native-picker/picker npm list @react-native-picker/picker |
| --- |

| 💡 @react-native-picker/picker는 RN 공식 커뮤니티 패키지입니다. iOS에서는 회전 휠(스크롤 원통), Android에서는 드롭다운으로 자동으로 렌더링됩니다. 무료이고 유지보수도 매우 활발합니다. |
| --- |

| **⚠️ 네이티브 라이브러리는 설치만으로는 부족합니다. 반드시 npx react-native run-android 로 재빌드해야 합니다. Metro 리로드(R)만 하면 ****'****Unable to resolve module****'**** 오류가 납니다.** |
| --- |

## **3.2 renderHeader prop이란?**

react-native-calendars의 <Calendar> 컴포넌트는 기본적으로 '2026년 4월' 같은 월 제목을 자동으로 그려줍니다. 하지만 renderHeader 라는 prop에 함수를 전달하면 내가 원하는 모양으로 헤더를 직접 그릴 수 있습니다.

| <Calendar   renderHeader={(date) => (     <Pressable onPress={() => 연월선택모달()}>       <Text>{date.format('YYYY년 M월')} ▾</Text>     </Pressable>   )} /> |
| --- |

| 💡 Pressable은 TouchableOpacity와 비슷한 '누를 수 있는 영역' 컴포넌트인데, 더 새로운 React Native 공식 API입니다. 눌림 효과가 부드럽고 접근성도 좋습니다. |
| --- |

## **3.3 CalendarScreen.tsx 전체 교체 코드**

파일 경로: app/src/screens/CalendarScreen.tsx

기존 v7.2 코드 구조는 유지한 채로 헤더와 모달 부분만 추가/수정했습니다.

| import React, { useState, useEffect, useRef } from 'react'; import {   View, Text, TouchableOpacity, StyleSheet,   Modal, Pressable, } from 'react-native'; import { Calendar, LocaleConfig } from 'react-native-calendars'; import { Picker } from '@react-native-picker/picker';   // ★ v7.3 신규 import axios from '../api/axiosInstance'; import dayjs from 'dayjs';  // ═══════════════════════════════════════════════════════════ // ── 한국어 Locale 설정 (v7.2 그대로 유지) ── // ═══════════════════════════════════════════════════════════ LocaleConfig.locales['ko'] = {   monthNames: ['1월','2월','3월','4월','5월','6월',                '7월','8월','9월','10월','11월','12월'],   monthNamesShort: ['1월','2월','3월','4월','5월','6월',                     '7월','8월','9월','10월','11월','12월'],   dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],   dayNamesShort: ['일','월','화','수','목','금','토'],   today: '오늘', }; LocaleConfig.defaultLocale = 'ko';  const typeColor: Record<string, string> = {   '도배': '#2E75B6',   '타일': '#E67E22',   '필름': '#27AE60', };  // ═══════════════════════════════════════════════════════════ // ── 휠 Picker에 넣을 연도 목록 (★ v7.3 신규) ── //    올해 기준 ±5년 정도면 충분합니다. // ═══════════════════════════════════════════════════════════ const YEARS = (() => {   const thisYear = dayjs().year();   const arr: number[] = [];   for (let y = thisYear - 2; y <= thisYear + 5; y++) arr.push(y);   return arr; })(); const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);  export default function CalendarScreen() {   const [schedules, setSchedules] = useState<any[]>([]);   const [currentMonth, setCurrentMonth] = useState(     dayjs().format('YYYY-MM-DD')   );   const calendarRef = useRef<any>(null);    // ─── v7.3 신규 state ───   const [pickerVisible, setPickerVisible] = useState(false);   const [tempYear,  setTempYear]  = useState(dayjs().year());   const [tempMonth, setTempMonth] = useState(dayjs().month() + 1);    useEffect(() => {     fetchSchedules();   }, [currentMonth]);    const fetchSchedules = async () => {     const year  = dayjs(currentMonth).year();     const month = dayjs(currentMonth).month() + 1;     try {       const res = await axios.get(         `/schedules?year=${year}&month=${month}`       );       setSchedules(res.data.data ││ []);     } catch (e) {       console.error('일정 조회 실패:', e);     }   };    // ═════════════════════════════════════════════════════════   // ── 헤더 탭 → 모달 열기 (★ v7.3 신규) ──   // ═════════════════════════════════════════════════════════   const openPicker = () => {     // 현재 표시 중인 달을 초기값으로     setTempYear(dayjs(currentMonth).year());     setTempMonth(dayjs(currentMonth).month() + 1);     setPickerVisible(true);   };    // 확인 버튼 → 달력 이동 (★ v7.3 신규)   const applyPick = () => {     const newDate = dayjs(       `${tempYear}-${String(tempMonth).padStart(2, '0')}-01`     ).format('YYYY-MM-DD');     setCurrentMonth(newDate);   // state 변경 → Calendar 자동 이동     setPickerVisible(false);   };    // ═════════════════════════════════════════════════════════   // ── 커스텀 Day 컴포넌트 (v7.2 그대로) ──   // ═════════════════════════════════════════════════════════   const CustomDay = ({ date, state }: any) => {     const daySchedules = schedules.filter(s => s.date === date.dateString);     const isToday = date.dateString === dayjs().format('YYYY-MM-DD');     const dots = Array.from(new Set(       daySchedules.map(s => typeColor[s.work_type] ││ '#888')     )).slice(0, 3);      return (       <View style={styles.dayCell}>         <View style={styles.dayHeader}>           <Text style={[             styles.dayNumber,             state === 'disabled' && styles.disabledDay,             isToday && styles.todayNumber,           ]}>             {date.day}           </Text>           <View style={styles.dots}>             {dots.map((color, i) => (               <View key={i} style={[styles.dot, { backgroundColor: color }]} />             ))}           </View>         </View>         {daySchedules.slice(0, 2).map((s: any) => (           <View key={s.id} style={styles.scheduleRow}>             <Text style={styles.workerName} numberOfLines={1}>               {s.users?.[0]?.name ││ '?'}             </Text>             <Text style={styles.siteName} numberOfLines={1}>               {s.site?.apt_name ││ s.district ││ ''}             </Text>           </View>         ))}         {daySchedules.length > 2 && (           <Text style={styles.moreText}>외 {daySchedules.length - 2}건</Text>         )}       </View>     );   };    // ═════════════════════════════════════════════════════════   // ── 툴바 (v7.2 그대로) ──   // ═════════════════════════════════════════════════════════   const Toolbar = () => (     <View style={styles.toolbar}>       <View style={styles.legend}>         {Object.entries(typeColor).map(([type, color]) => (           <View key={type} style={styles.legendItem}>             <View style={[styles.legendDot, { backgroundColor: color }]} />             <Text style={styles.legendText}>{type}</Text>           </View>         ))}       </View>       <TouchableOpacity         style={styles.todayBtn}         onPress={() => setCurrentMonth(dayjs().format('YYYY-MM-DD'))}>         <Text style={styles.todayBtnText}>오늘</Text>       </TouchableOpacity>     </View>   );    return (     <View style={styles.container}>       <Toolbar />       <Calendar         ref={calendarRef}         current={currentMonth}         dayComponent={CustomDay}         enableSwipeMonths={true}         onMonthChange={(m: any) => setCurrentMonth(m.dateString)}          // ─── ★ v7.3 신규: 커스텀 헤더 ───         renderHeader={(date: any) => (           <Pressable onPress={openPicker} style={styles.headerBtn}>             <Text style={styles.headerTitle}>               {dayjs(date).format('YYYY년 M월')} ▾             </Text>           </Pressable>         )}          renderArrow={(dir: 'left'│'right') => (           <View style={styles.arrow}>             <Text style={styles.arrowText}>               {dir === 'left' ? '◀' : '▶'}             </Text>           </View>         )}       />        {/* ═════════════════════════════════════════════════════ */}       {/* ── ★ v7.3 신규: 연·월 선택 모달 ──                    */}       {/* ═════════════════════════════════════════════════════ */}       <Modal         visible={pickerVisible}         transparent         animationType='slide'         onRequestClose={() => setPickerVisible(false)}       >         <Pressable           style={styles.modalBackdrop}           onPress={() => setPickerVisible(false)}         >           <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>             <Text style={styles.modalTitle}>년·월 선택</Text>              <View style={{ flexDirection: 'row' }}>               {/* 연도 휠 */}               <View style={{ flex: 1 }}>                 <Picker                   selectedValue={tempYear}                   onValueChange={(v) => setTempYear(v)}                 >                   {YEARS.map(y => (                     <Picker.Item key={y} label={`${y}년`} value={y} />                   ))}                 </Picker>               </View>                {/* 월 휠 */}               <View style={{ flex: 1 }}>                 <Picker                   selectedValue={tempMonth}                   onValueChange={(v) => setTempMonth(v)}                 >                   {MONTHS.map(m => (                     <Picker.Item key={m} label={`${m}월`} value={m} />                   ))}                 </Picker>               </View>             </View>              <View style={styles.modalButtons}>               <TouchableOpacity                 style={[styles.modalBtn, styles.modalBtnCancel]}                 onPress={() => setPickerVisible(false)}               >                 <Text style={styles.modalBtnText}>취소</Text>               </TouchableOpacity>               <TouchableOpacity                 style={[styles.modalBtn, styles.modalBtnOk]}                 onPress={applyPick}               >                 <Text style={[styles.modalBtnText, { color: '#fff' }]}>확인</Text>               </TouchableOpacity>             </View>           </Pressable>         </Pressable>       </Modal>     </View>   ); } |
| --- |

## **3.4 스타일(StyleSheet) 추가**

기존 StyleSheet 아래에 아래 스타일을 추가합니다:

| const styles = StyleSheet.create({   // ─── 기존 v7.2 스타일 생략 ───    // ─── ★ v7.3 신규 스타일 ───   headerBtn: {     paddingVertical: 8,     paddingHorizontal: 12,     borderRadius: 6,     backgroundColor: '#F0F4F8',   },   headerTitle: {     fontSize: 17,     fontWeight: '600',     color: '#222',   },   modalBackdrop: {     flex: 1,     backgroundColor: 'rgba(0,0,0,0.4)',     justifyContent: 'flex-end',   },   modalContent: {     backgroundColor: '#fff',     paddingHorizontal: 16,     paddingTop: 16,     paddingBottom: 24,     borderTopLeftRadius: 16,     borderTopRightRadius: 16,   },   modalTitle: {     fontSize: 16,     fontWeight: '700',     marginBottom: 12,     textAlign: 'center',   },   modalButtons: {     flexDirection: 'row',     marginTop: 12,     gap: 8,   },   modalBtn: {     flex: 1,     paddingVertical: 12,     borderRadius: 8,     alignItems: 'center',   },   modalBtnCancel: {     backgroundColor: '#ECECEC',   },   modalBtnOk: {     backgroundColor: '#2E75B6',   },   modalBtnText: {     fontSize: 15,     fontWeight: '600',   }, }); |
| --- |

## **3.5 주요 함수·컴포넌트 해설**

| **이름** | **종류** | **역할** |
| --- | --- | --- |
| <Modal> | RN 내장 컴포넌트 | 전체 화면 위에 덮이는 팝업 창. transparent=true로 배경이 반투명하게 됨. |
| <Pressable> | RN 내장 컴포넌트 | 탭 가능한 영역. 배경 Pressable을 누르면 모달 닫힘 (모달 안쪽 Pressable은 stopPropagation). |
| <Picker> | @react-native-picker/picker | iOS: 휠 회전 선택기 / Android: 드롭다운. 플랫폼 자동 분기. |
| Picker.Item | Picker 하위 컴포넌트 | 선택 가능한 한 개 항목. label은 화면 표시, value는 내부 값. |
| renderHeader | <Calendar>의 prop | 기본 헤더를 내가 만든 JSX로 교체하는 함수. |
| onRequestClose | <Modal>의 prop | Android 뒤로가기 버튼이 눌렸을 때 호출됨. 모달 닫는 처리 필수. |
| String.padStart(2, '0') | JS 표준 함수 | 숫자 5를 '05'로 두자리 맞춤. 날짜 문자열 조합에 사용. |
| e.stopPropagation() | 이벤트 제어 | 이벤트가 부모 요소로 퍼지는 걸 막음. 모달 내부 탭이 배경 탭으로 인식되지 않게. |

# **4. 빌드 및 실행**

## **4.1 웹 실행**

| # 터미널 1 cd C:\project\team-schedule\backend php artisan serve  # 터미널 2 cd C:\project\team-schedule\frontend npm run dev # → http://localhost:3000/schedule |
| --- |

## **4.2 모바일 실행 (네이티브 재빌드 필수!)**

| **⚠️ 3.1절에서 설치한 @react-native-picker/picker는 네이티브 라이브러리입니다. 반드시 run-android로 재빌드해야 적용됩니다.** |
| --- |

| # 터미널 1 — 백엔드 cd C:\project\team-schedule\backend php artisan serve  # 터미널 2 — 앱 (에뮬레이터 먼저 켜기) cd C:\project\team-schedule\app npx react-native run-android |
| --- |

# **5. 테스트 체크리스트**

## **5.1 웹 관리자**

| **✔** | **확인 항목** | **기대 결과** |
| --- | --- | --- |
| [ ] | 달력 상단 가운데 연·월 버튼 표시 | '2026년 4월' 버튼 형태 |
| [ ] | 버튼 호버 시 커서 변화 | 손가락 모양 커서 |
| [ ] | 버튼 클릭 시 모달 오픈 | '년·월 선택' 모달 팝업 |
| [ ] | DatePicker에서 월 선택 | 달력이 선택한 월로 즉시 이동 |
| [ ] | ◀ ▶ 화살표로 이동 | 버튼 글자가 이동한 월에 맞게 갱신 |
| [ ] | 오늘 버튼 동작 | 오늘 날짜가 있는 월로 이동 + 글자 동기화 |
| [ ] | 6개월 뒤 이동 테스트 | 화살표 안 쓰고 모달에서 한번에 이동 가능 |

## **5.2 모바일 앱**

| **✔** | **확인 항목** | **기대 결과** |
| --- | --- | --- |
| [ ] | @react-native-picker/picker 설치 확인 | npm list에 버전 표시됨 |
| [ ] | run-android 재빌드 성공 | 빌드 오류 없음 |
| [ ] | 달력 상단에 연·월 버튼 표시 | '2026년 4월 ▾' 형태 |
| [ ] | 버튼 탭 시 모달 슬라이드 업 | 화면 아래에서 위로 올라옴 |
| [ ] | 휠 Picker 2개 표시 | 왼쪽 연도, 오른쪽 월 |
| [ ] | 휠 돌려서 값 변경 가능 | 스크롤/탭 동작 정상 |
| [ ] | 확인 버튼 → 달력 이동 | 선택한 년·월로 점프 |
| [ ] | 취소 버튼 → 모달 닫힘 | 달력은 변경 없음 |
| [ ] | 배경 탭 → 모달 닫힘 | 달력은 변경 없음 |
| [ ] | Android 뒤로가기 → 모달 닫힘 | onRequestClose 동작 |
| [ ] | 스와이프로 월 이동 | 헤더 글자도 동기화됨 |

# **6. 알려진 이슈 및 해결 팁**

## **6.1 모바일: ****"****Unable to resolve module @react-native-picker/picker****"**

원인: 네이티브 라이브러리 설치 후 재빌드를 안 함.

해결:

| cd C:\project\team-schedule\app # Metro 리로드만으로는 안 됨 — Gradle 재빌드 필수 npx react-native run-android |
| --- |

## **6.2 웹: 모달 열었을 때 DatePicker가 한국어로 안 나옴**

원인: main.tsx에서 Ant Design ConfigProvider의 locale이 ko_KR로 설정되지 않음.

해결 (v4.3에서 이미 설정되어 있다면 무시):

| // frontend/src/main.tsx import { ConfigProvider } from 'antd' import koKR from 'antd/locale/ko_KR'  <ConfigProvider locale={koKR}>   <App /> </ConfigProvider> |
| --- |

## **6.3 웹: 버튼 글자가 ****'****2026년 4월****'**** → ****'****2026년 5월****'****로 안 바뀜**

원인: datesSet 이벤트 핸들러를 등록 안 함.

해결: Schedule.tsx의 datesSet={(arg) => ...} 부분이 빠졌는지 확인.

## **6.4 모바일: iOS에서 휠이 안 보이고 Android처럼 뜸**

원인: iOS에서 Picker를 flex 레이아웃 안에 넣을 때 높이가 부족하면 기본 모달처럼 렌더됨.

해결: Picker를 감싼 View에 최소 높이 설정:

| <View style={{ flex: 1, height: 200 }}>   <Picker ...>...</Picker> </View> |
| --- |

# **7. Git 커밋**

| cd C:\project\team-schedule git add . git commit -m "feat(v7.3): 캘린더 헤더 터치로 연·월 점프 기능 추가 (웹+모바일)" git push origin main |
| --- |

# **8. 다음 단계 — v8 예고**

| **v8에서 할 일** | **목적** |
| --- | --- |
| 카페24 이지업 서버 배포 | 실제 서비스 공개 |
| Nginx 리버스 프록시 설정 | Laravel + React 배포 구조 |
| MySQL 백업 자동화 (cron) | 일일 백업 + 7일 보관 |
| 로그 모니터링 | 에러 발생 시 알림 |
| Laravel 프로덕션 모드 설정 | APP_DEBUG=false, 최적화 캐시 |

**— v7.3 캘린더 연·월 점프 기능 추가 완료 —**

# **변경 이력**

| **버전** | **날짜** | **작성자** | **변경 내용** |
| --- | --- | --- | --- |
| v7.0 | 2026-04-20 | — | 최초 작성 — 스케줄 CRUD API, 캘린더 뷰 초안 |
| v7.1 | 2026-04-20 | — | 컨트롤러 Api 폴더 통일 / Schedule.php 전체 교체 / 마이그레이션 중복 오류 처리 |
| v7.2 | 2026-04-22 | — | Schedule 모델 관계 / ScheduleController 재작성 / CalendarScreen 커스텀 Day + 툴바 / ScheduleDetail 등록 |
| v7.3 | 2026-04-23 | — | [웹 Schedule.tsx] FullCalendar headerToolbar의 center를 customButtons로 교체 + Ant Design DatePicker(picker="month") 모달 추가 + datesSet으로 제목 자동 동기화 / [모바일 CalendarScreen.tsx] renderHeader prop으로 커스텀 헤더 적용 + @react-native-picker/picker 기반 연·월 휠 Picker 모달 신규 추가 / [신규 라이브러리] @react-native-picker/picker 설치 / [5장] 웹·모바일 테스트 체크리스트 추가 / [6장] 알려진 이슈 4건 추가 |

© 2026 Team Schedule Manager

-  -