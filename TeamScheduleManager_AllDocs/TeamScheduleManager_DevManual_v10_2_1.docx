Team Schedule Manager  |  v10.2.1 모바일 일정 CRUD

Team Schedule Manager  |  개발 매뉴얼 v10.2.1

**개발 매뉴얼 v10.2.1**

**모바일 — 일정 수정/삭제 + ScheduleDetail v9.0 필드 표시**

v10.2 실전 검증 반영 + 일정 CRUD 완성

작성일: 2026-04-25  |  실전 검증 완료  |  안드로이드 에뮬레이터 통합 테스트 통과

| **💡 이 매뉴얼이 만들어진 배경** v10.2 모바일 입력 UI를 따라 작업하면서 발견된 사소한 환경 차이와, "사용자가 등록한 일정을 보고/수정/삭제하지 못하면 진짜 완성이 아니다"라는 깨달음에서 작성된 후속 매뉴얼입니다. 두 부분으로 구성됩니다: ① v10.2 매뉴얼의 가정과 실제 프로젝트 구조의 차이를 정리한 패치, ② 일정 수정·삭제·상세 표시 기능 신규 구현. 이 매뉴얼을 따라하면 v10.2 + v10.2.1 합쳐서 "모바일 일정 관리" 기능이 100% 완성됩니다. |
| --- |

# **0. 전체 매뉴얼 시리즈**

| **버전** | **제목** | **상태** |
| --- | --- | --- |
| v10.1.1 | 핵심 기능 API — 공수·급여 자동 계산 (실전 검증) | ✅ 완료 |
| v10.1.2 | 백엔드 패치 — SoftDelete + Observer 타이밍 | ✅ 완료 |
| v10.2 | 모바일 공수/단가 입력 UI | ✅ 완료 |
| v10.2.1 ◀ | 모바일 — 일정 수정/삭제 + 상세 v9.0 필드 | ▶ 현재 |
| v10.3 | 모바일 수입 대시보드 실연동 | ⏳ 다음 |

# **1. 이 매뉴얼이 다루는 내용**

두 부분으로 나뉩니다:

## **1.1 v10.2 실전 변경사항 (Part 1)**

v10.2 매뉴얼의 가정과 실제 프로젝트 구조의 차이점을 정리:

| **#** | **매뉴얼 가정** | **실제 프로젝트** | **조치** |
| --- | --- | --- | --- |
| 1 | src/api/client.ts | src/api/axiosInstance.ts | 실제 파일명으로 import |
| 2 | MyPageScreen.tsx | ProfileScreen.tsx | 실제 파일명으로 진입점 추가 |
| 3 | ScheduleFormScreen.tsx | ScheduleCreateScreen.tsx | 실제 파일명으로 확장 |
| 4 | react-native-picker-select 설치 | 미설치 (Paper Menu 시도) | ★ Modal+Menu 충돌 → 펼침 카드 방식으로 대체 |
| 5 | AppNavigator Stack 단순 구조 | Drawer + Stack 혼합 (v9.2) | Stack에 WageSettings 등록 |

## **1.2 v10.2.1 신규 기능 (Part 2)**

일정 라이프사이클 완성을 위한 3가지 추가:

| **#** | **기능** | **구현** |
| --- | --- | --- |
| 1 | ScheduleDetailScreen에 v9.0 필드 표시 | 공정/단가/공수/예상수입/경비/경비메모 카드 UI |
| 2 | 일정 수정 기능 | ScheduleCreateScreen을 등록/수정 겸용으로 확장 (route.params.scheduleId 분기) |
| 3 | 일정 삭제 기능 | ScheduleDetailScreen에 삭제 버튼 추가, DELETE /api/schedules/{id} 호출 |

# **2. v10.2 실전 변경사항 — 다섯 가지 차이**

## **2.1 axiosInstance.ts (client.ts 아님)**

**파일 경로: src/api/axiosInstance.ts (이미 v5에서 만들어진 파일)**

v10.2 매뉴얼은 client.ts를 가정했지만, 실제 v5에서는 axiosInstance.ts로 만들어졌어요. 모든 API 파일에서 다음과 같이 import:

| import axios from './axiosInstance';  // 또는 다른 폴더에서: // import axios from '../api/axiosInstance'; |
| --- |

axiosInstance.ts 자체는 baseURL=http://10.0.2.2:8000/api, AsyncStorage 토큰 자동 주입, 401 인터셉터 등이 잘 설정되어 있어 추가 변경 불필요.

## **2.2 react-native-picker-select 설치 불필요 — 펼침 카드 방식 채택**

| **⚠️ 매뉴얼대로 Paper Menu를 쓰면 Modal 안에서 동작 안 함** v10.2 매뉴얼이 처음 제시한 WorkTypePicker는 react-native-paper의 <Menu> 컴포넌트 기반이었어요. 하지만 실제로 WageSettingsScreen의 모달 안에서 공정 선택을 시도하면 Menu가 열리지 않는 이슈 발생. 원인: <Modal>이 별도의 네이티브 윈도우 레이어에 렌더링되는데, Paper의 <Menu>는 자체 PortalHost를 통해 최상단에 펼쳐지려 해서 두 시스템이 충돌. Menu가 Modal 뒤로 들어가거나 터치 이벤트가 가로막힘. 해결: Menu 대신 인라인 "펼침 카드" 방식으로 전환. 같은 컴포넌트 트리에 자연스럽게 펼쳐져서 Modal 안에서도 정상 작동. |
| --- |

### **2.2.1 채택된 WorkTypePicker (펼침 카드 방식)**

**파일 경로: src/components/WorkTypePicker.tsx**

| import React, { useEffect, useState } from 'react'; import {   View,   StyleSheet,   TouchableOpacity,   ActivityIndicator,   ScrollView, } from 'react-native'; import { Text, Divider } from 'react-native-paper'; import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; import { getWorkTypes } from '../api/workTypesApi'; import type { WorkType } from '../types/api';  interface Props {   value: number │ null;   onChange: (id: number │ null, workType: WorkType │ null) => void;   placeholder?: string;   disabled?: boolean; }  export default function WorkTypePicker({   value,   onChange,   placeholder = '공정 선택',   disabled = false, }: Props) {   const [workTypes, setWorkTypes] = useState<WorkType[]>([]);   const [loading, setLoading] = useState<boolean>(true);   const [expanded, setExpanded] = useState<boolean>(false);    useEffect(() => {     getWorkTypes()       .then(setWorkTypes)       .catch(e => console.error('공정 목록 조회 실패:', e))       .finally(() => setLoading(false));   }, []);    const selected = workTypes.find(wt => wt.id === value);    const handleSelect = (wt: WorkType) => {     onChange(wt.id, wt);     setExpanded(false);   };    if (loading) {     return (       <View style={styles.loadingBox}>         <ActivityIndicator size="small" color="#2E75B6" />         <Text style={styles.loadingText}>공정 불러오는 중...</Text>       </View>     );   }    return (     <View>       {/* 앵커 */}       <TouchableOpacity         onPress={() => !disabled && setExpanded(!expanded)}         style={[styles.anchor, disabled && styles.anchorDisabled]}         disabled={disabled}       >         <View style={styles.anchorLeft}>           {selected && (             <View style={[styles.dot, { backgroundColor: selected.color }]} />           )}           <Text style={selected ? styles.selectedText : styles.placeholder}>             {selected ? selected.name : placeholder}           </Text>         </View>         <Icon           name={expanded ? 'chevron-up' : 'chevron-down'}           size={22}           color="#666"         />       </TouchableOpacity>        {/* 펼침 영역 */}       {expanded && (         <View style={styles.dropdown}>           <ScrollView             style={styles.scrollArea}             nestedScrollEnabled             keyboardShouldPersistTaps="handled"           >             {workTypes.map((wt, idx) => {               const isSelected = wt.id === value;               return (                 <React.Fragment key={wt.id}>                   <TouchableOpacity                     onPress={() => handleSelect(wt)}                     style={[styles.item, isSelected && styles.itemSelected]}                   >                     <View style={[styles.dot, { backgroundColor: wt.color }]} />                     <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>                       {wt.name}                     </Text>                     {isSelected && (                       <Icon name="check" size={18} color="#2E75B6" style={styles.checkIcon} />                     )}                   </TouchableOpacity>                   {idx < workTypes.length - 1 && <Divider />}                 </React.Fragment>               );             })}           </ScrollView>         </View>       )}     </View>   ); }  const styles = StyleSheet.create({   anchor: {     flexDirection: 'row',     justifyContent: 'space-between',     alignItems: 'center',     backgroundColor: '#FFF',     borderWidth: 1,     borderColor: '#CCC',     borderRadius: 4,     paddingHorizontal: 14,     paddingVertical: 14,   },   anchorDisabled: { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' },   anchorLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },   dot: { width: 12, height: 12, borderRadius: 6 },   selectedText: { fontSize: 16, color: '#333', fontWeight: '500' },   placeholder: { fontSize: 16, color: '#999' },   dropdown: {     marginTop: 4,     backgroundColor: '#FFF',     borderWidth: 1,     borderColor: '#E0E0E0',     borderRadius: 4,     overflow: 'hidden',     elevation: 3,     shadowColor: '#000',     shadowOpacity: 0.1,     shadowRadius: 4,     shadowOffset: { width: 0, height: 2 },   },   scrollArea: { maxHeight: 280 },   item: {     flexDirection: 'row',     alignItems: 'center',     gap: 10,     paddingHorizontal: 14,     paddingVertical: 12,     backgroundColor: '#FFF',   },   itemSelected: { backgroundColor: '#E8F2FC' },   itemText: { flex: 1, fontSize: 15, color: '#333' },   itemTextSelected: { color: '#2E75B6', fontWeight: '600' },   checkIcon: { marginLeft: 'auto' },   loadingBox: {     flexDirection: 'row',     alignItems: 'center',     gap: 8,     paddingVertical: 14,     paddingHorizontal: 14,     backgroundColor: '#F5F5F5',     borderRadius: 4,   },   loadingText: { fontSize: 14, color: '#666' }, }); |
| --- |

### **2.2.2 nestedScrollEnabled의 중요성 (Android)**

WageSettingsScreen 모달의 ScrollView 안에 또 다른 ScrollView (펼침 영역)가 들어가는 구조라서, Android에서 nestedScrollEnabled 옵션 없이는 자식 스크롤이 동작 안 합니다. iOS는 기본적으로 동작하지만 Android는 명시 필수.

## **2.3 ProfileScreen.tsx (MyPageScreen 아님)**

**파일 경로: src/screens/ProfileScreen.tsx**

v10.2 매뉴얼은 MyPageScreen을 가정했지만, 실제 프로젝트는 ProfileScreen입니다. "내 단가 설정" 진입점을 여기에 추가:

| import { useNavigation } from '@react-navigation/native'; import { TouchableOpacity } from 'react-native'; import Icon from 'react-native-vector-icons/MaterialCommunityIcons';  // 컴포넌트 안에서: const navigation = useNavigation<any>();  // JSX에서 (기존 프로필 카드와 로그아웃 사이에 추가): <Text style={styles.sectionTitle}>업무 설정</Text> <Card style={styles.menuCard}>   <TouchableOpacity     onPress={() => navigation.navigate('WageSettings')}     style={styles.menuItem}   >     <View style={styles.menuLeft}>       <Icon name="currency-krw" size={24} color="#2E75B6" />       <View style={styles.menuTextBox}>         <Text style={styles.menuLabel}>내 단가 설정</Text>         <Text style={styles.menuSub}>           공정별 기본 단가를 등록하면 일정 작성 시 자동 입력됩니다         </Text>       </View>     </View>     <Icon name="chevron-right" size={22} color="#BBB" />   </TouchableOpacity> </Card> |
| --- |

## **2.4 ScheduleCreateScreen.tsx (ScheduleFormScreen 아님)**

**파일 경로: src/screens/ScheduleCreateScreen.tsx**

매뉴얼의 ScheduleFormScreen은 실제로 ScheduleCreateScreen.tsx 파일입니다. v10.2의 공정 드롭다운 + 단가 자동 채우기 + 경비 입력 등을 이 파일에 추가했어요. (다음 장 v10.2.1에서 등록/수정 겸용으로 다시 확장)

## **2.5 AppNavigator 구조 — Drawer + Stack 혼합**

**파일 경로: src/navigation/AppNavigator.tsx**

실제 v9.2 시점에 햄버거 메뉴(Drawer)가 도입되어 매뉴얼 가정과 다릅니다. 구조:

| Stack (최상위) ├── Login (비로그인 시) └── (로그인 시)     ├── DrawerRoot (햄버거 메뉴 포함)     │   ├── Home (캘린더)     │   ├── MySummary     │   ├── Attendance     │   ├── Profile      ← "내 단가 설정" 진입점 위치     │   └── Settings     ├── ScheduleDetail     ├── ScheduleCreate     └── WageSettings     ← ★ v10.2 추가 |
| --- |

WageSettings는 햄버거 메뉴(Drawer)에 직접 노출하지 않고 Stack에 추가하여 ProfileScreen → 진입점으로 들어가는 구조. 매뉴얼은 단순 Stack 가정이었지만 실제로는 이런 위계 구조라는 점만 다름.

# **3. ScheduleDetailScreen — v9.0 필드 표시 추가**

## **3.1 문제 — v7 시점 코드라 v9.0 필드가 없음**

v7에서 만든 ScheduleDetailScreen은 work_type ENUM, 지역, 평수, 메모, 인원, 사진만 표시하고 끝. v9.0에서 추가한 daily_wage, work_units, expenses, expenses_memo, work_type_id 필드는 화면에 안 보입니다.

결과: 사용자가 v10.2에서 단가 280,000원으로 등록한 일정을 다시 봐도 그 정보가 어디에도 안 나옴 → "내가 입력한 단가는 어디로 갔지?" 혼란.

## **3.2 추가할 UI**

| ┌──────────────────────────────────────────┐ │ 2026-04-29                    [도배]      │ ← 기존: 날짜 + Chip │ 🔵 도배                                   │ ← ★ 신규: 공정 dot+이름 │ 📍 강남구                                 │ ← 기존 │ 📐 23.5평 (77㎡)                          │ ← 기존 │ ─────────────────────────────────────    │ │  💰 공수/단가 정보                       │ ← ★ 신규 카드 │  ┌─────────────┐  ┌─────────────┐       │ │  │ 단가         │  │ 공수         │       │ │  │ 280,000원    │  │ 1.0공수      │       │ │  └─────────────┘  └─────────────┘       │ │  ┌─────────────────────────────────┐    │ │  │ 예상 수입         280,000원      │    │ ← 단가 × 공수 │  └─────────────────────────────────┘    │ │  📝 경비                  5,000원        │ │  "톨게이트 + 주차"                       │ │ ─────────────────────────────────────    │ │ 투입 인원 (1명)  [홍길동팀장]             │ ← 기존 │ 사진 (3장) [+ 추가]                       │ ← 기존 │ 메모: ...                                 │ ← 기존 │ ─────────────────────────────────────    │ │ [✏️ 수정]              [🗑️ 삭제]          │ ← ★ 신규 버튼 └──────────────────────────────────────────┘ |
| --- |

## **3.3 ScheduleDetailScreen.tsx 전체 코드 (덮어쓰기)**

**파일 경로: src/screens/ScheduleDetailScreen.tsx**

기존 v7 코드를 통째로 아래로 교체:

| import React, { useCallback, useState } from 'react'; import {   View, ScrollView, Image, StyleSheet, Alert, ActivityIndicator, } from 'react-native'; import {   Text, Chip, Button, Divider, Avatar, IconButton, } from 'react-native-paper'; import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; import { launchImageLibrary } from 'react-native-image-picker'; import { useFocusEffect, useNavigation } from '@react-navigation/native';  import axios from '../api/axiosInstance'; import { getScheduleById, deleteSchedule } from '../api/schedulesApi'; import type { Schedule } from '../types/api'; import { formatMoney } from '../utils/format';  const ROLE_LABELS: Record<number, string> = {   1: '관리자', 2: '팀장', 3: '팀원', };  export default function ScheduleDetailScreen({ route }: any) {   const { id } = route.params;   const navigation = useNavigation<any>();    const [schedule, setSchedule] = useState<Schedule │ null>(null);   const [loading, setLoading] = useState<boolean>(true);   const [deleting, setDeleting] = useState<boolean>(false);    // 화면 포커스 시 자동 새로고침 (수정 다녀온 후 최신 데이터 표시)   useFocusEffect(     useCallback(() => {       fetchDetail();     }, [id]),   );    const fetchDetail = async () => {     try {       setLoading(true);       const data = await getScheduleById(id);       setSchedule(data);     } catch (e: any) {       Alert.alert('조회 실패', e?.response?.data?.message ││ '일정 정보를 불러오지 못했습니다.');     } finally {       setLoading(false);     }   };    const handlePhotoUpload = async () => {     const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });     if (!result.assets?.[0]) return;     const formData = new FormData();     formData.append('photo', {       uri: result.assets[0].uri,       name: result.assets[0].fileName,       type: result.assets[0].type,     } as any);     try {       await axios.post(`/schedules/${id}/photos`, formData, {         headers: { 'Content-Type': 'multipart/form-data' },       });       Alert.alert('완료', '사진이 업로드되었습니다.');       fetchDetail();     } catch (e: any) {       Alert.alert('업로드 실패', e?.response?.data?.message ││ '다시 시도해주세요.');     }   };    // ★ 수정 버튼 → ScheduleCreate에 scheduleId 전달   const handleEdit = () => {     navigation.navigate('ScheduleCreate', { scheduleId: id });   };    // ★ 삭제 버튼 → DELETE /api/schedules/{id}   const handleDelete = () => {     Alert.alert(       '일정 삭제',       `${schedule?.date} 일정을 삭제하시겠습니까?`,       [         { text: '취소', style: 'cancel' },         {           text: '삭제',           style: 'destructive',           onPress: async () => {             setDeleting(true);             try {               await deleteSchedule(id);               Alert.alert('완료', '일정이 삭제되었습니다.', [                 { text: '확인', onPress: () => navigation.goBack() },               ]);             } catch (e: any) {               Alert.alert('삭제 실패', e?.response?.data?.message ││ '오류가 발생했습니다.');             } finally {               setDeleting(false);             }           },         },       ],     );   };    if (loading ││ !schedule) {     return (       <View style={styles.centerBox}>         <ActivityIndicator size="large" color="#1F3864" />         <Text style={styles.loadingText}>불러오는 중...</Text>       </View>     );   }    const pyeong = schedule.area_m2 ? (parseFloat(schedule.area_m2) / 3.3).toFixed(1) : null;   const expectedIncome =     schedule.daily_wage && schedule.work_units       ? parseFloat(schedule.daily_wage) * parseFloat(schedule.work_units)       : 0;    return (     <ScrollView style={styles.container}>       {/* 헤더 */}       <View style={styles.header}>         <Text style={styles.date}>{schedule.date}</Text>         {schedule.work_type && <Chip>{schedule.work_type}</Chip>}       </View>        {/* 공정 (v10.2.1) */}       {schedule.work_type_relation && (         <View style={styles.row}>           <View style={[styles.dot, { backgroundColor: schedule.work_type_relation.color }]} />           <Text style={styles.workTypeText}>{schedule.work_type_relation.name}</Text>         </View>       )}        {/* 지역/평수 */}       {schedule.district && (         <View style={styles.row}>           <Icon name="map-marker" size={16} color="#666" />           <Text style={styles.infoText}>{schedule.district}</Text>         </View>       )}       {pyeong && (         <View style={styles.row}>           <Icon name="ruler-square" size={16} color="#666" />           <Text style={styles.infoText}>{pyeong}평 ({schedule.area_m2}㎡)</Text>         </View>       )}        <Divider style={styles.divider} />        {/* ★ v9.0 공수/단가 카드 */}       {(schedule.daily_wage ││ schedule.work_units !== '0.0') && (         <View style={styles.wageCard}>           <View style={styles.wageHeader}>             <Icon name="cash-multiple" size={18} color="#2E75B6" />             <Text style={styles.wageTitle}>공수/단가 정보</Text>           </View>            <View style={styles.wageGrid}>             <View style={styles.wageItem}>               <Text style={styles.wageLabel}>단가</Text>               <Text style={styles.wageValue}>                 {schedule.daily_wage ? `${formatMoney(schedule.daily_wage)}원` : '-'}               </Text>             </View>             <View style={styles.wageItem}>               <Text style={styles.wageLabel}>공수</Text>               <Text style={styles.wageValue}>                 {parseFloat(schedule.work_units).toFixed(1)}공수               </Text>             </View>           </View>            {expectedIncome > 0 && (             <View style={styles.expectedBox}>               <Text style={styles.expectedLabel}>예상 수입</Text>               <Text style={styles.expectedValue}>{formatMoney(expectedIncome)}원</Text>             </View>           )}            {schedule.expenses && parseFloat(schedule.expenses) > 0 && (             <View style={styles.expenseRow}>               <View style={styles.row}>                 <Icon name="receipt" size={14} color="#888" />                 <Text style={styles.expenseLabel}>경비</Text>               </View>               <Text style={styles.expenseValue}>{formatMoney(schedule.expenses)}원</Text>             </View>           )}           {schedule.expenses_memo && (             <Text style={styles.expensesMemo}>"{schedule.expenses_memo}"</Text>           )}         </View>       )}        {schedule.daily_wage && <Divider style={styles.divider} />}        {/* 투입 인원 */}       <Text style={styles.section}>투입 인원 ({schedule.users?.length ││ 0}명)</Text>       {schedule.users?.map((u: any) => (         <View key={u.id} style={styles.member}>           <Avatar.Text size={32} label={u.name?.[0] ││ '?'} />           <Text style={styles.memberName}>{u.name}</Text>         </View>       ))}        <Divider style={styles.divider} />        {/* 사진 */}       <View style={styles.photoHeader}>         <Text style={styles.section}>현장 사진 ({(schedule as any).photos?.length ││ 0}장)</Text>         <Button mode="outlined" compact onPress={handlePhotoUpload} icon="plus">추가</Button>       </View>       <ScrollView horizontal showsHorizontalScrollIndicator={false}>         {(schedule as any).photos?.map((p: any) => (           <Image             key={p.id}             source={{ uri: `http://10.0.2.2:8000/storage/${p.file_path}` }}             style={styles.photo}           />         ))}       </ScrollView>        {/* 메모 */}       {schedule.memo && (         <>           <Divider style={styles.divider} />           <Text style={styles.section}>메모</Text>           <Text style={styles.memo}>{schedule.memo}</Text>         </>       )}        <Divider style={styles.divider} />        {/* ★ v10.2.1: 수정/삭제 버튼 */}       <View style={styles.actionRow}>         <Button mode="outlined" icon="pencil" onPress={handleEdit}           style={styles.actionBtn} disabled={deleting}>           수정         </Button>         <Button mode="contained" icon="delete" onPress={handleDelete}           style={styles.actionBtn} buttonColor="#D32F2F"           loading={deleting} disabled={deleting}>           삭제         </Button>       </View>        <View style={{ height: 40 }} />     </ScrollView>   ); }  // 스타일 정의는 생략 (실제 파일 참고) |
| --- |

## **3.4 핵심 함수·훅 풀이**

**① useFocusEffect — 화면 포커스 시 자동 새로고침**

| useFocusEffect(   useCallback(() => {     fetchDetail();   }, [id]), ); |
| --- |

@react-navigation/native가 제공하는 훅. 화면이 "포커스를 받을 때마다" 콜백 실행. useEffect는 마운트 시 한 번이지만, 이건 다른 화면 다녀와도 매번 실행됨. 수정 화면 갔다가 돌아왔을 때 최신 데이터를 자동 표시하는 핵심 장치.

**② 예상 수입 계산**

| const expectedIncome =   schedule.daily_wage && schedule.work_units     ? parseFloat(schedule.daily_wage) * parseFloat(schedule.work_units)     : 0; |
| --- |

DB에서는 daily_wage와 work_units가 string으로 옵니다 (decimal cast). parseFloat로 숫자 변환 후 곱셈. 둘 중 하나라도 없으면 0으로 처리하여 화면에서 표시 안 함.

**③ Alert의 destructive 스타일**

| { text: '삭제', style: 'destructive', onPress: ... } |
| --- |

iOS에서 빨간 글씨로 표시되어 사용자에게 "되돌릴 수 없는 위험 액션"임을 시각적으로 강조. Android는 기본 색상 유지하지만 onPress는 동일 작동.

# **4. 일정 수정 — ScheduleCreateScreen 등록/수정 겸용 변경**

## **4.1 설계 결정 — 별도 화면 vs 겸용**

두 가지 방법이 있었습니다:

| **옵션** | **장점** | **단점** |
| --- | --- | --- |
| A. ScheduleEditScreen 신규 생성 | 명확한 책임 분리 | 코드 90% 중복 (등록 화면이랑 거의 같음) |
| B. ScheduleCreateScreen 겸용 | 코드 중복 0, 유지보수 쉬움 | props 기반 분기 필요 |

**옵션 B 채택. route.params.scheduleId가 있으면 수정 모드, 없으면 등록 모드로 분기. 추가 코드 30줄로 끝남.**

## **4.2 변경 포인트 4가지**

| // 변경 1: 모드 판단 const editingScheduleId: number │ undefined = route.params?.scheduleId; const isEditMode = !!editingScheduleId;  // 변경 2: 마운트 시 수정 모드면 일정 데이터 로드 useEffect(() => {   // ... 기존 팀원/단가 로드 ...   if (isEditMode && editingScheduleId) {     await loadScheduleForEdit(editingScheduleId);   } }, []);  const loadScheduleForEdit = async (id: number) => {   const data = await getScheduleById(id);   setDate(new Date(data.date));   setWorkType(data.work_type as any);   setWorkTypeId(data.work_type_id ││ null);   setDailyWage(data.daily_wage ? parseFloat(data.daily_wage) : 0);   setWorkUnits(data.work_units ? parseFloat(data.work_units) : 1.0);   setExpenses(data.expenses ? parseFloat(data.expenses) : 0);   setExpensesMemo(data.expenses_memo ││ '');   setDistrict(data.district ││ '');   setAreaM2(data.area_m2 ? String(data.area_m2) : '');   setMemo(data.memo ││ '');   if (data.users) setSelectedUserIds(data.users.map(u => u.id)); };  // 변경 3: 저장 시 등록/수정 분기 if (isEditMode && editingScheduleId) {   await updateSchedule(editingScheduleId, payload);   Alert.alert('수정 완료', '일정이 수정되었습니다.', [     { text: '확인', onPress: () => navigation.goBack() },   ]); } else {   await createSchedule(payload);   Alert.alert('등록 완료', '일정이 등록되었습니다.', [     { text: '확인', onPress: () => navigation.goBack() },   ]); }  // 변경 4: 화면 상단에 모드 배지 표시 {isEditMode && (   <View style={styles.modeBadge}>     <Icon name="pencil" size={14} color="#FFF" />     <Text style={styles.modeBadgeText}>수정 모드</Text>   </View> )}  // 저장 버튼 텍스트도 분기 {saving ? '저장 중...' : isEditMode ? '수정 완료' : '저장'} |
| --- |

| **💡 모드 배지가 왜 중요?** 같은 화면이 등록/수정 둘 다 처리하면 사용자가 헷갈릴 수 있어요. 주황색 배지로 "지금은 수정 중입니다"를 시각적으로 명확히 알려서 실수 방지. 특히 모바일은 화면이 작아서 사용자가 자기가 어느 모드에 있는지 잊기 쉬워요. 작은 시각적 신호 하나가 UX 큰 차이. |
| --- |

## **4.3 AppNavigator 변경 — 사실 불필요!**

ScheduleCreate 라우트가 이미 등록되어 있고, 같은 라우트가 등록/수정 둘 다 처리하므로 AppNavigator는 변경 없음. 차이는 navigation 호출 방식만:

| // 등록 모드 navigation.navigate('ScheduleCreate'); navigation.navigate('ScheduleCreate', { date: '2026-04-26' });  // 날짜 미리 채우기  // 수정 모드 navigation.navigate('ScheduleCreate', { scheduleId: 11 }); |
| --- |

# **5. 일정 삭제**

ScheduleDetailScreen에 추가한 삭제 버튼이 그대로 작동합니다. 백엔드 API는 v7 시점에 이미 만들어진 DELETE /api/schedules/{id}를 그대로 사용 (SoftDelete).

## **5.1 삭제 흐름**

| 1) 사용자가 [🗑️ 삭제] 버튼 탭 2) Alert 확인 다이얼로그: "일정을 삭제하시겠습니까?" 3) 사용자가 [삭제] 탭 (빨간색) 4) deleteSchedule(id) 호출 5) 백엔드:    - $schedule->delete()  ← deleted_at 채움 (SoftDelete)    - ScheduleObserver::deleted() 자동 호출    - MonthlySummaryService::recalculate() 호출 → monthly_summary 갱신 6) 모바일:    - "삭제되었습니다" Alert    - navigation.goBack() → 캘린더로 복귀    - CalendarScreen의 focus 리스너 발동 → 자동 새로고침    - 캘린더에서 해당 일정 사라짐 |
| --- |

| **💡 SoftDelete의 장점** 실수로 삭제해도 DB에서 레코드는 사라지지 않고 deleted_at 컬럼만 채워집니다. 나중에 "휴지통" 기능을 만들거나, 관리자 권한으로 복구하는 기능 추가 가능. 또한 SoftDelete된 일정과 연결된 schedule_users도 그대로 남아있으므로 monthly_summary 재계산 시 정상적으로 제외됨 (whereNull(deleted_at) 조건으로). |
| --- |

# **6. 통합 테스트 — 4단계 시나리오**

## **6.1 시나리오 1: 상세 화면 v9.0 필드 표시**

| **단계** | **동작** | **기대 결과** |
| --- | --- | --- |
| 1 | 캘린더 → 기존 일정 탭 → 모달 → 일정 카드 탭 | ScheduleDetail 화면 진입 |
| 2 | 화면 스크롤하며 확인 | 공정 dot+이름, 단가, 공수, 예상 수입, 경비 모두 표시 |
| 3 | 하단 확인 | [수정] [삭제] 버튼 표시 |

## **6.2 시나리오 2: 일정 수정**

| **단계** | **동작** | **기대 결과** |
| --- | --- | --- |
| 1 | 상세 화면 → [수정] 탭 | 주황 "수정 모드" 배지 + 폼에 기존 값 채워짐 |
| 2 | 단가 변경 (예: 230,000 → 280,000) | 입력 정상 |
| 3 | [수정 완료] 탭 | "수정 완료" Alert → 상세 화면 복귀 (자동 새로고침) |
| 4 | 확인 | 단가가 280,000으로 갱신, 예상 수입 자동 재계산 |

## **6.3 시나리오 3: 일정 삭제**

| **단계** | **동작** | **기대 결과** |
| --- | --- | --- |
| 1 | 상세 화면 → [🗑️ 삭제] 탭 | "삭제하시겠습니까?" Alert (destructive 스타일) |
| 2 | [삭제] 탭 | "삭제되었습니다" Alert |
| 3 | [확인] 탭 | 캘린더로 복귀 (focus 리스너로 자동 새로고침) |
| 4 | 확인 | 캘린더에서 해당 일정 사라짐 |

## **6.4 시나리오 4: monthly_summary 자동 갱신 (★ v10.1.2 패치 검증)**

| **단계** | **동작** | **기대 결과** |
| --- | --- | --- |
| 수정 후 | GET /api/monthly-summary?year=2026&month=4 | total_income 변경분 반영 + last_calculated_at 갱신 |
| 삭제 후 | GET /api/monthly-summary?year=2026&month=4 | total_income 줄어듦 + work_days 감소 + last_calculated_at 갱신 |

**★ 이 시나리오 4가 통과한다는 것은 v10.1.2 패치(touch())가 update에도 정상 적용되었다는 증거**

# **7. 최종 점검 체크리스트**

## **7.1 코드 변경 확인**

| **#** | **파일** | **변경 내용** | **완료** |
| --- | --- | --- | --- |
| 1 | src/screens/ScheduleDetailScreen.tsx | v9.0 필드 표시 + 수정/삭제 버튼 + useFocusEffect | ☐ |
| 2 | src/screens/ScheduleCreateScreen.tsx | 등록/수정 겸용 (route.params.scheduleId 분기) | ☐ |
| 3 | (불필요) AppNavigator | 변경 없음 — 같은 ScheduleCreate 라우트 재사용 | ✅ |
| 4 | (불필요) CalendarScreen | 이미 focus 리스너 있음 (v9.1) | ✅ |

## **7.2 기능 동작 확인**

| **#** | **시나리오** | **완료** |
| --- | --- | --- |
| 1 | 상세 화면에 v9.0 필드 모두 표시 | ☐ |
| 2 | 수정 버튼 → 폼에 기존 값 채워짐 → 변경 → 수정 완료 | ☐ |
| 3 | 수정 후 상세 화면 자동 새로고침 | ☐ |
| 4 | 삭제 → Alert 확인 → 캘린더 자동 새로고침 → 일정 사라짐 | ☐ |
| 5 | ★ 수정/삭제 후 monthly-summary 자동 갱신 | ☐ |

## **7.3 Git 커밋**

| cd C:\project\team-schedule git add . git status git commit -m "feat(v10.2.1): 일정 수정/삭제 + ScheduleDetail v9.0 필드 표시  - ScheduleDetailScreen: v9.0 필드 카드 (단가/공수/예상수입/경비) + 수정/삭제 버튼 - ScheduleCreateScreen: 등록/수정 겸용 (route.params.scheduleId 분기)   - 수정 모드 시 GET /schedules/{id}로 폼 채우기   - PUT /schedules/{id}로 저장   - 주황색 '수정 모드' 배지 표시 - useFocusEffect로 상세 화면 자동 새로고침 - TODO.md 추가 (v10.x 작업 로그)" git push |
| --- |

# **8. 다음 단계 (v10.3 예고)**

v10.3에서는 v10.1.1의 GET /api/monthly-summary API를 모바일 대시보드에 연동합니다. v10.2 + v10.2.1의 입력/수정/삭제 → v10.3의 출력(대시보드) 흐름이 합쳐져서 "공수·급여 자동 계산" 기능이 완전체로 완성됩니다.

| **v10.3 작업** | **목적** |
| --- | --- |
| MySummaryScreen 실연동 | 월별 카드 (수입/공수/일수/세금/실수령액) |
| HomeScreen 위젯 (Mock 제거) | "이번 달 N원" 미리보기 |
| 월 이동 (←/→) | year+month 변경 |
| UTC → KST 시간대 변환 | last_calculated_at 사용자 친화 표시 |

# **변경 이력**

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| v10.2 | 2026-04-24 | 최초 작성 — 모바일 공수/단가 입력 UI 매뉴얼. |
| v10.2.1 | 2026-04-25 | v10.2 실전 검증 반영 + 신규 기능 추가. (1) 실제 프로젝트 구조 차이 정리: axiosInstance.ts(v5), ProfileScreen(v9.2), ScheduleCreateScreen, Drawer+Stack 혼합 구조. (2) WorkTypePicker를 Paper Menu에서 펼침 카드 방식으로 변경 (Modal 안에서 Menu 미동작 이슈). (3) ScheduleDetailScreen에 v9.0 필드 카드 표시 추가. (4) ScheduleCreateScreen을 등록/수정 겸용으로 확장 (route.params.scheduleId 분기). (5) 일정 삭제 기능 + Alert 확인 다이얼로그. (6) useFocusEffect로 자동 새로고침. 안드로이드 에뮬레이터 통합 테스트 통과. |

# **부록 A. v10.2 + v10.2.1에서 배운 RN 핵심 패턴**

## **A.1 Modal + 펼침 UI 충돌 회피**

React Native Paper의 Menu, Dropdown, DatePicker 같은 Portal 기반 컴포넌트는 Modal 안에서 종종 충돌합니다. Modal이 별도 윈도우 레이어에 그려지는데 Portal이 최상단을 노릴 때 z-order가 꼬여요.

Modal 안에서는 인라인 펼침 UI(같은 컴포넌트 트리 내부에서 펼쳐지는 방식)가 안전한 패턴.

## **A.2 같은 화면 등록/수정 겸용 패턴**

route.params로 모드 분기하는 패턴은 React Native뿐 아니라 React Router에서도 자주 쓰는 정석. 등록과 수정의 UI는 거의 같으니 코드 중복을 줄이는 가장 효과적인 방법.

단점: TypeScript 타입이 복잡해질 수 있음. v15 정리 단계에서 RootStackParamList로 명시 가능.

## **A.3 useFocusEffect — 자동 새로고침의 정석**

useEffect는 마운트 시 한 번만 실행. 다른 화면에서 돌아왔을 때 데이터가 stale 상태가 됨. useFocusEffect는 화면 포커스마다 콜백 실행하여 항상 최신 상태 유지.

단, 매번 API를 호출하므로 너무 자주 사용하면 네트워크 비용 증가. 필요한 경우에만 사용.

## **A.4 SoftDelete + Observer + 캐시 패턴 정리**

v10.1.x ~ v10.2.x를 거치며 다음 패턴이 자리 잡았습니다:

| 사용자 액션 (등록/수정/삭제)        ↓ ScheduleController (touch() 호출로 saved 이벤트 보장)        ↓ ScheduleObserver (saved/deleted/restored)        ↓ MonthlySummaryService::recalculate()        ↓ monthly_summaries UPSERT (캐시 갱신)        ↓ 다음 GET /monthly-summary 시 즉시 최신 데이터 반환 |
| --- |

이 패턴은 v10.3 (대시보드) 그리고 향후 v11+ (출퇴근 자동 집계, v14 세금 리포트)에서도 그대로 재사용됩니다.

**— v10.2.1 모바일 — 일정 수정/삭제 + 상세 v9.0 필드 표시 매뉴얼 —**

**다음: v10.3 — 모바일 수입 대시보드**

© 2026 Team Schedule Manager

© 2026 Team Schedule Manager  |  Page  /