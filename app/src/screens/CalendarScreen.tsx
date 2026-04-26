// ═══════════════════════════════════════════════════════════════
//   app/src/screens/CalendarScreen.tsx
//   v9.1 — 2026-04-24
//   - 모달에서 일정 터치 시 상세 화면 이동 (CardView 대체)
//   - 일정 아이템을 Pressable로 변경
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import axios from '../api/axiosInstance';
import { Button, Divider } from 'react-native-paper';
import dayjs from 'dayjs';

// ───────────────────────────────────────────────────────────────
// [1] 한국어 로케일
// ───────────────────────────────────────────────────────────────
LocaleConfig.locales['ko'] = {
  monthNames: [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ],
  monthNamesShort: [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ],
  dayNames: [
    '일요일',
    '월요일',
    '화요일',
    '수요일',
    '목요일',
    '금요일',
    '토요일',
  ],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

// ───────────────────────────────────────────────────────────────
// [2] 작업유형별 색상
// ───────────────────────────────────────────────────────────────
const WORK_TYPE_COLOR: Record<string, string> = {
  도배: '#2E75B6',
  타일: '#E67E22',
  필름: '#27AE60',
};

// ───────────────────────────────────────────────────────────────
// [3] 타입 정의
// ───────────────────────────────────────────────────────────────
interface UserLite {
  id: number;
  name: string;
}

interface SiteLite {
  id: number;
  apt_name?: string;
  dong?: string;
  ho?: string;
}

interface ScheduleItem {
  id: number;
  date: string;
  work_type: '도배' | '타일' | '필름';
  district?: string;
  area_m2?: number | null;
  memo?: string | null;
  users?: UserLite[];
  site?: SiteLite | null;
}

// ───────────────────────────────────────────────────────────────
// [4] 유틸 함수
// ───────────────────────────────────────────────────────────────
const shortSiteName = (site?: SiteLite | null): string => {
  if (!site) return '';
  if (site.dong && site.ho) return `${site.dong} ${site.ho}`;
  if (site.ho) return site.ho;
  return site.apt_name || '';
};

const getDateColor = (
  timestamp: number,
  state: string | undefined,
  isToday: boolean,
): string => {
  if (state === 'disabled') return '#CCCCCC';
  if (isToday) return '#2E75B6';
  const day = new Date(timestamp).getDay();
  if (day === 0) return '#E74C3C';
  if (day === 6) return '#2E75B6';
  return '#333333';
};

// ───────────────────────────────────────────────────────────────
// [5] 커스텀 Day 컴포넌트
// ───────────────────────────────────────────────────────────────
interface CustomDayProps {
  date?: {
    day: number;
    month: number;
    year: number;
    timestamp: number;
    dateString: string;
  };
  state?: string;
  marking?: {
    schedules?: ScheduleItem[];
  };
  onPress: (dateString: string, schedules: ScheduleItem[]) => void;
}

const CustomDay: React.FC<CustomDayProps> = ({
  date,
  state,
  marking,
  onPress,
}) => {
  if (!date) return <View style={styles.cell} />;

  const schedules = marking?.schedules || [];
  const displayList = schedules.slice(0, 2);
  const moreCount = schedules.length - displayList.length;
  const uniqueTypes = Array.from(new Set(schedules.map(s => s.work_type)));

  const isToday = state === 'today';
  const dateColor = getDateColor(date.timestamp, state, isToday);

  return (
    <Pressable
      onPress={() => onPress(date.dateString, schedules)}
      style={({ pressed }) => [
        styles.cell,
        isToday && styles.todayCell,
        pressed && styles.pressedCell,
      ]}
    >
      <View style={styles.cellHeader}>
        <Text style={[styles.dateText, { color: dateColor }]}>{date.day}</Text>
        <View style={styles.dotRow}>
          {uniqueTypes.slice(0, 3).map((type, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: WORK_TYPE_COLOR[type] || '#888' },
              ]}
            />
          ))}
        </View>
      </View>

      {displayList.map(s => (
        <View key={s.id} style={styles.itemRow}>
          <Text style={styles.itemName} numberOfLines={1}>
            {s.users?.[0]?.name || '미배정'}
          </Text>
          <Text style={styles.itemSite} numberOfLines={1}>
            {shortSiteName(s.site) || s.district || '-'}
          </Text>
        </View>
      ))}

      {moreCount > 0 && <Text style={styles.moreText}>+{moreCount}</Text>}
    </Pressable>
  );
};

// ═══════════════════════════════════════════════════════════════
// [6] 메인 화면
// ═══════════════════════════════════════════════════════════════
interface Props {
  navigation: any;
  onMonthChange?: (year: number, month: number) => void; // ★ v10.3 추가
}

export default function CalendarScreen({ navigation, onMonthChange }: Props) {
  const [currentMonth, setCurrentMonth] = useState(
    dayjs().format('YYYY-MM-DD'),
  );
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSchedules, setSelectedSchedules] = useState<ScheduleItem[]>(
    [],
  );
  const [modalVisible, setModalVisible] = useState(false);

  // ─── 일정 목록 조회 ───
  const fetchSchedules = useCallback(async () => {
    try {
      const res = await axios.get('/schedules');
      const list: ScheduleItem[] = res.data?.data || [];
      setSchedules(list);
    } catch (e: any) {
      console.error('스케줄 조회 실패:', e);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // ★ v10.3: 첫 마운트 시 부모에게 현재 달 알림
  useEffect(() => {
    if (onMonthChange) {
      const m = dayjs(currentMonth);
      onMonthChange(m.year(), m.month() + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!navigation) return;
    const unsubscribe = navigation.addListener('focus', () => {
      fetchSchedules();
    });
    return unsubscribe;
  }, [navigation, fetchSchedules]);

  // ─── 날짜별로 일정 그룹화 ───
  const markedDates = useMemo(() => {
    const grouped: Record<string, { schedules: ScheduleItem[] }> = {};
    schedules.forEach(s => {
      if (!grouped[s.date]) grouped[s.date] = { schedules: [] };
      grouped[s.date].schedules.push(s);
    });
    return grouped;
  }, [schedules]);

  // ─── 날짜 클릭 시 모달 열기 ───
  const handleDayPress = (dateString: string, daySchedules: ScheduleItem[]) => {
    setSelectedDate(dateString);
    setSelectedSchedules(daySchedules);
    setModalVisible(true);
  };

  const goToToday = () => {
    setCurrentMonth(dayjs().format('YYYY-MM-DD'));
  };

  // ─── 일정 등록 화면으로 이동 ───
  const goToCreate = () => {
    setModalVisible(false);
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('ScheduleCreate', { date: selectedDate });
    } else {
      navigation.navigate('ScheduleCreate', { date: selectedDate });
    }
  };

  // ─── ★ v9.1 신규: 일정 탭 시 상세 화면으로 이동 ───
  //   모달 먼저 닫고(자연스러운 전환) 부모 Stack Navigator에서 ScheduleDetail로 이동
  const goToDetail = (scheduleId: number) => {
    setModalVisible(false);
    // Drawer > Tab > CalendarScreen 구조이므로 Stack(최상위)를 얻으려면 getParent 2번
    const parent =
      navigation.getParent()?.getParent() || navigation.getParent();
    if (parent) {
      parent.navigate('ScheduleDetail', { id: scheduleId });
    } else {
      navigation.navigate('ScheduleDetail', { id: scheduleId });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* ─── 상단 툴바: 범례 + 오늘 버튼 ─── */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2E75B6' }]} />
            <Text style={styles.legendText}>도배</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#E67E22' }]} />
            <Text style={styles.legendText}>타일</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#27AE60' }]} />
            <Text style={styles.legendText}>필름</Text>
          </View>
        </View>
        <Button
          mode="outlined"
          compact
          onPress={goToToday}
          icon="calendar-today"
        >
          오늘
        </Button>
      </View>

      <Calendar
        current={currentMonth}
        onMonthChange={m => {
          setCurrentMonth(m.dateString);
          // ★ v10.3: 부모에게 알림 (HomeScreen이 요약 스트립 갱신용)
          if (onMonthChange) {
            onMonthChange(m.year, m.month);
          }
        }}
        markedDates={markedDates}
        enableSwipeMonths={true}
        renderArrow={(direction: 'left' | 'right') => (
          <View style={styles.arrowBtn}>
            <Text style={styles.arrowText}>
              {direction === 'left' ? '◀' : '▶'}
            </Text>
          </View>
        )}
        dayComponent={(props: any) => (
          <CustomDay
            date={props.date}
            state={props.state}
            marking={props.marking}
            onPress={handleDayPress}
          />
        )}
        theme={{
          textMonthFontSize: 18,
          textMonthFontWeight: '700',
          monthTextColor: '#333',
          arrowColor: '#2E75B6',
          'stylesheet.calendar.header': {
            dayTextAtIndex0: { color: '#E74C3C' },
            dayTextAtIndex6: { color: '#2E75B6' },
          },
        }}
      />

      {/* ─── 상세 모달 ─── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedDate} 일정 ({selectedSchedules.length}건)
            </Text>
            <Text style={styles.modalHint}>
              일정을 터치하면 상세 정보를 볼 수 있습니다.
            </Text>
            <Divider style={{ marginVertical: 8 }} />

            <ScrollView style={{ maxHeight: 300 }}>
              {selectedSchedules.length === 0 ? (
                <Text style={styles.emptyText}>등록된 일정이 없습니다.</Text>
              ) : (
                selectedSchedules.map(s => (
                  // ★ v9.1: View → Pressable 로 변경 (터치 가능)
                  <Pressable
                    key={s.id}
                    onPress={() => goToDetail(s.id)}
                    style={({ pressed }) => [
                      styles.scheduleItem,
                      pressed && styles.scheduleItemPressed,
                    ]}
                    android_ripple={{ color: '#E8F0FE' }}
                  >
                    <View
                      style={[
                        styles.workTypeBadge,
                        { backgroundColor: WORK_TYPE_COLOR[s.work_type] },
                      ]}
                    >
                      <Text style={styles.workTypeText}>{s.work_type}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scheduleSite}>
                        {shortSiteName(s.site) || s.district || '-'}
                      </Text>
                      <Text style={styles.scheduleUsers}>
                        {(s.users || []).map(u => u.name).join(', ') ||
                          '미배정'}
                      </Text>
                      {s.area_m2 && (
                        <Text style={styles.scheduleArea}>
                          {s.area_m2}㎡ ({(s.area_m2 / 3.3058).toFixed(1)}평)
                        </Text>
                      )}
                    </View>
                    {/* ★ v9.1: 우측 > 아이콘 — 탭 가능하다는 시각적 힌트 */}
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>

            <Divider style={{ marginVertical: 8 }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                mode="outlined"
                style={{ flex: 1 }}
                onPress={() => setModalVisible(false)}
              >
                닫기
              </Button>
              <Button mode="contained" style={{ flex: 1 }} onPress={goToCreate}>
                + 일정 추가
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// [7] 스타일
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEE',
  },
  toolbarLegend: { flexDirection: 'row', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#555' },
  arrowBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#F0F7FF',
  },
  arrowText: { fontSize: 16, fontWeight: '700', color: '#2E75B6' },
  cell: {
    width: '100%',
    minHeight: 90,
    paddingHorizontal: 3,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: '#EEEEEE',
  },
  todayCell: { backgroundColor: '#FFF9E6' },
  pressedCell: { backgroundColor: '#F0F7FF' },
  cellHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  dateText: { fontSize: 12, fontWeight: '600' },
  dotRow: { flexDirection: 'row', gap: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  itemRow: { marginBottom: 2 },
  itemName: { fontSize: 9, color: '#333', fontWeight: '500' },
  itemSite: { fontSize: 8, color: '#888' },
  moreText: {
    fontSize: 9,
    color: '#2E75B6',
    textAlign: 'right',
    marginTop: 1,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  // ★ v9.1: 사용자 힌트 안내
  modalHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  emptyText: { textAlign: 'center', color: '#888', paddingVertical: 24 },
  scheduleItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEE',
    // ★ v9.1: 터치 영역 확대 + 모서리 둥글게
    borderRadius: 6,
  },
  // ★ v9.1: 터치 피드백 (iOS용)
  scheduleItemPressed: {
    backgroundColor: '#F0F7FF',
  },
  workTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  workTypeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  scheduleSite: { fontSize: 14, fontWeight: '500', color: '#333' },
  scheduleUsers: { fontSize: 12, color: '#666', marginTop: 2 },
  scheduleArea: { fontSize: 11, color: '#888', marginTop: 2 },
  // ★ v9.1: > 아이콘 (탭 가능 힌트)
  chevron: {
    fontSize: 24,
    color: '#CCC',
    fontWeight: '300',
  },
});
