// ═══════════════════════════════════════════════════════════════
//   app/src/screens/CalendarScreen.tsx
//   v11.6 — 2026-04-27
// ═══════════════════════════════════════════════════════════════

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  BackHandler,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from '../api/axiosInstance';
import { Button, Divider } from 'react-native-paper';
import dayjs from 'dayjs';

// ───────────────────────────────────────────────────────────────
// [1] 한국어 로케일
// ───────────────────────────────────────────────────────────────
LocaleConfig.locales['ko'] = {
  monthNames: [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월',
  ],
  monthNamesShort: [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월',
  ],
  dayNames: [
    '일요일', '월요일', '화요일', '수요일',
    '목요일', '금요일', '토요일',
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

const buildCellLabel = (s: ScheduleItem): string => {
  const place = s.district || s.site?.apt_name || '미정';
  const pyeong = s.area_m2
    ? ` ${(s.area_m2 / 3.3058).toFixed(0)}평`
    : '';
  return `${place}${pyeong}`;
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
  return '#222222';
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
  marking?: { schedules?: ScheduleItem[] };
  onPress: (dateString: string, schedules: ScheduleItem[]) => void;
  cellHeight: number;
}

const CustomDay: React.FC<CustomDayProps> = ({
  date, state, marking, onPress, cellHeight,
}) => {
  if (!date) return <View style={[styles.cell, { minHeight: cellHeight }]} />;

  const schedules = marking?.schedules || [];
  const displayList = schedules.slice(0, 2);
  const moreCount = schedules.length - displayList.length;
  const isToday = state === 'today';
  const dateColor = getDateColor(date.timestamp, state, isToday);

  return (
    <Pressable
      onPress={() => onPress(date.dateString, schedules)}
      style={({ pressed }) => [
        styles.cell,
        { minHeight: cellHeight },
        isToday && styles.todayCell,
        pressed && styles.pressedCell,
      ]}
    >
      <View pointerEvents="none" style={styles.cellInner}>
        <Text style={[styles.dateText, { color: dateColor }]}>
          {date.day}
        </Text>
        {displayList.map(s => (
          <View key={s.id} style={styles.scheduleBar}>
            <View
              style={[
                styles.scheduleBarColor,
                { backgroundColor: WORK_TYPE_COLOR[s.work_type] || '#888' },
              ]}
            />
            <Text style={styles.scheduleBarText} numberOfLines={1}>
              {buildCellLabel(s)}
            </Text>
          </View>
        ))}
        {moreCount > 0 && (
          <Text style={styles.moreText}>+{moreCount}건</Text>
        )}
      </View>
    </Pressable>
  );
};

// ═══════════════════════════════════════════════════════════════
// [6] 외부 호출 인터페이스
// ═══════════════════════════════════════════════════════════════
export interface CalendarHandle {
  goToday: () => void;
  jumpToDate: (date: string) => void;
}

interface Props {
  navigation: any;
  onMonthChange?: (year: number, month: number) => void;
  cellHeight?: number;
}

const CalendarScreen = forwardRef<CalendarHandle, Props>(
  ({ navigation, onMonthChange, cellHeight = 90 }, ref) => {
    const [currentMonth, setCurrentMonth] = useState(
      dayjs().format('YYYY-MM-DD'),
    );
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSchedules, setSelectedSchedules] = useState<ScheduleItem[]>([]);
    const [modalVisible, setModalVisible] = useState(false);

    const insets = useSafeAreaInsets();

    const fetchSchedules = useCallback(async () => {
      try {
        const res = await axios.get('/schedules');
        const list: ScheduleItem[] = res.data?.data || [];
        setSchedules(list);
      } catch (e: any) {
        console.error('스케줄 조회 실패:', e);
      }
    }, []);

    useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

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

    useEffect(() => {
      if (!modalVisible) return;
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => { setModalVisible(false); return true; },
      );
      return () => subscription.remove();
    }, [modalVisible]);

    useImperativeHandle(ref, () => ({
      goToday: () => {
        const today = dayjs().format('YYYY-MM-DD');
        setCurrentMonth(today);
        if (onMonthChange) {
          const m = dayjs(today);
          onMonthChange(m.year(), m.month() + 1);
        }
      },
      jumpToDate: (date: string) => {
        setCurrentMonth(date);
        if (onMonthChange) {
          const m = dayjs(date);
          onMonthChange(m.year(), m.month() + 1);
        }
      },
    }), [onMonthChange]);

    const markedDates = useMemo(() => {
      const grouped: Record<string, { schedules: ScheduleItem[] }> = {};
      schedules.forEach(s => {
        if (!grouped[s.date]) grouped[s.date] = { schedules: [] };
        grouped[s.date].schedules.push(s);
      });
      return grouped;
    }, [schedules]);

    const handleDayPress = (dateString: string, daySchedules: ScheduleItem[]) => {
      setSelectedDate(dateString);
      setSelectedSchedules(daySchedules);
      setModalVisible(true);
    };

    const goToCreate = () => {
      setModalVisible(false);
      const parent = navigation.getParent();
      if (parent) { parent.navigate('ScheduleCreate', { date: selectedDate }); }
      else { navigation.navigate('ScheduleCreate', { date: selectedDate }); }
    };

    const goToDetail = (scheduleId: number) => {
      setModalVisible(false);
      const parent = navigation.getParent()?.getParent() || navigation.getParent();
      if (parent) { parent.navigate('ScheduleDetail', { id: scheduleId }); }
      else { navigation.navigate('ScheduleDetail', { id: scheduleId }); }
    };

    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <Calendar
          current={currentMonth}
          onMonthChange={m => {
            setCurrentMonth(m.dateString);
            if (onMonthChange) { onMonthChange(m.year, m.month); }
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
              cellHeight={cellHeight}
            />
          )}
          theme={{
            calendarBackground: '#FFFFFF',
            textMonthFontSize: 18,
            textMonthFontWeight: '700',
            monthTextColor: '#1F3864',
            arrowColor: '#2E75B6',
            dayTextColor: '#222222',
            textDayFontSize: 14,
            textDayFontWeight: '600',
            textSectionTitleColor: '#555555',
            textDisabledColor: '#CCCCCC',
            'stylesheet.calendar.header': {
              dayTextAtIndex0: { color: '#E74C3C', fontWeight: '600' },
              dayTextAtIndex6: { color: '#2E75B6', fontWeight: '600' },
            },
          }}
        />

        {modalVisible && (
          <>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setModalVisible(false)}
            />
            <View style={[styles.modalCard, { paddingBottom: 16 + insets.bottom }]}>
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
                          {(s.users || []).map(u => u.name).join(', ') || '미배정'}
                        </Text>
                        {s.area_m2 && (
                          <Text style={styles.scheduleArea}>
                            {s.area_m2}㎡ ({(s.area_m2 / 3.3058).toFixed(1)}평)
                          </Text>
                        )}
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>

              <Divider style={{ marginVertical: 8 }} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button mode="outlined" style={{ flex: 1 }} onPress={() => setModalVisible(false)}>
                  닫기
                </Button>
                <Button mode="contained" style={{ flex: 1 }} onPress={goToCreate}>
                  + 일정 추가
                </Button>
              </View>
            </View>
          </>
        )}
      </View>
    );
  },
);

CalendarScreen.displayName = 'CalendarScreen';
export default CalendarScreen;

// ═══════════════════════════════════════════════════════════════
// [7] 스타일
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  arrowBtn: {
    width: 36, height: 36, justifyContent: 'center',
    alignItems: 'center', borderRadius: 18, backgroundColor: '#F0F7FF',
  },
  arrowText: { fontSize: 16, fontWeight: '700', color: '#2E75B6' },
  cell: {
    width: '100%', paddingHorizontal: 3, paddingVertical: 4,
    borderWidth: 0.5, borderColor: '#BBBBBB',
    backgroundColor: '#FFFFFF', overflow: 'hidden',
  },
  cellInner: { flex: 1 },
  todayCell: { backgroundColor: '#FFF9E6' },
  pressedCell: { backgroundColor: '#F0F7FF' },
  dateText: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
  scheduleBar: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 2, paddingRight: 1,
  },
  scheduleBarColor: {
    width: 3, height: 14, borderRadius: 1.5, marginRight: 3,
  },
  scheduleBarText: { fontSize: 10, color: '#222', fontWeight: '500', flex: 1 },
  moreText: {
    fontSize: 9, color: '#2E75B6', textAlign: 'right',
    marginTop: 1, fontWeight: '600',
  },
  modalBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999, elevation: 999,
  },
  modalCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingHorizontal: 16, paddingTop: 16,
    zIndex: 1000, elevation: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15, shadowRadius: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  modalHint: { fontSize: 11, color: '#999', marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#888', paddingVertical: 24 },
  scheduleItem: {
    flexDirection: 'row', gap: 12, paddingVertical: 12,
    paddingHorizontal: 8, alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: '#EEE', borderRadius: 6,
  },
  scheduleItemPressed: { backgroundColor: '#F0F7FF' },
  workTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  workTypeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  scheduleSite: { fontSize: 14, fontWeight: '500', color: '#333' },
  scheduleUsers: { fontSize: 12, color: '#666', marginTop: 2 },
  scheduleArea: { fontSize: 11, color: '#888', marginTop: 2 },
  chevron: { fontSize: 24, color: '#CCC', fontWeight: '300' },
});