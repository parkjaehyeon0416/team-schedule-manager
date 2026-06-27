/**
 * 홈 화면 — v11.6
 */

import React, {
  useCallback,
  useState,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CalendarScreen, { CalendarHandle } from './CalendarScreen';
import YearMonthPicker from '../components/YearMonthPicker';
import AppHeader from '../components/AppHeader';
import { getMonthlySummary } from '../api/schedulesApi';
import type { MonthlySummary } from '../types/api';
import { formatShortKRW } from '../utils/format';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const RESERVED_HEIGHT = 232 + insets.top + insets.bottom;
  const CALENDAR_CELL_HEIGHT = Math.max(
    70,
    Math.floor((SCREEN_HEIGHT - RESERVED_HEIGHT) / 6),
  );

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState<number>(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(now.getMonth() + 1);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const calendarRef = useRef<CalendarHandle>(null);

  const handleCalendarMonthChange = useCallback(
    async (newYear: number, newMonth: number) => {
      setCalendarYear(newYear);
      setCalendarMonth(newMonth);
      try {
        const data = await getMonthlySummary(newYear, newMonth);
        setSummary(data);
      } catch {
        setSummary(null);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        try {
          const data = await getMonthlySummary(calendarYear, calendarMonth);
          if (!cancelled) setSummary(data);
        } catch {
          if (!cancelled) setSummary(null);
        }
      };
      load();
      return () => { cancelled = true; };
    }, [calendarYear, calendarMonth]),
  );

  const handleGoToday = useCallback(() => {
    calendarRef.current?.goToday();
  }, []);

  const handleGoHome = () => {
    calendarRef.current?.goToday();
  };

  const handleOpenDrawer = () => {
    navigation.openDrawer?.();
  };

  const handleOpenPicker = () => {
    setPickerVisible(true);
  };

  const handlePickerSelect = (y: number, m: number) => {
    setPickerVisible(false);
    calendarRef.current?.jumpToDate(
      `${y}-${String(m).padStart(2, '0')}-01`,
    );
  };

  const workDays = summary?.work_days ?? 0;
  const totalIncome = parseFloat(summary?.total_income || '0');
  const totalWorkUnits = parseFloat(summary?.total_work_units || '0');

  const goToMySummary = () => {
    navigation.navigate('MySummary', {
      year: calendarYear,
      month: calendarMonth,
      _ts: Date.now(),
    });
  };

  const isCurrentMonth =
    calendarYear === now.getFullYear() && calendarMonth === now.getMonth() + 1;
  const incomeLabel = isCurrentMonth ? '수입' : `${calendarMonth}월수입`;

  return (
    <View style={styles.container}>
      <AppHeader
        leftType="menu"
        onMenuPress={handleOpenDrawer}
        onHomePress={handleGoHome}
        centerContent={
          <Pressable
            onPress={handleOpenPicker}
            style={({ pressed }) => [
              styles.monthTabBtn,
              pressed && { opacity: 0.6 },
            ]}
            android_ripple={{ color: '#E8F0FE' }}
          >
            <Text style={styles.monthTabText}>
              {calendarYear}년 {String(calendarMonth).padStart(2, '0')}월
            </Text>
            <Text style={styles.monthTabArrow}>  ▾</Text>
          </Pressable>
        }
        rightContent={
          <Pressable
            onPress={handleGoToday}
            style={({ pressed }) => [
              styles.todayBtn,
              pressed && styles.todayBtnPressed,
            ]}
          >
            <Text style={styles.todayBtnText}>오늘</Text>
          </Pressable>
        }
      />

      {/* 요약 스트립 */}
      <View style={styles.summaryStrip}>
        <Pressable
          style={({ pressed }) => [
            styles.summaryItem,
            pressed && styles.summaryItemPressed,
          ]}
          onPress={goToMySummary}
          android_ripple={{ color: '#E8F0FE' }}
        >
          <Text style={styles.summaryValue}>{workDays}일</Text>
          <Text style={styles.summaryLabel}>근무</Text>
        </Pressable>

        <View style={styles.separator} />

        <Pressable
          style={({ pressed }) => [
            styles.summaryItem,
            styles.summaryItemHighlight,
            pressed && styles.summaryItemPressed,
          ]}
          onPress={goToMySummary}
          android_ripple={{ color: '#FFE7B8' }}
        >
          <Text style={[styles.summaryValue, styles.summaryValueHighlight]}>
            ₩{formatShortKRW(totalIncome)}
          </Text>
          <Text style={[styles.summaryLabel, styles.summaryLabelHighlight]}>
            {incomeLabel}
          </Text>
        </Pressable>

        <View style={styles.separator} />

        <Pressable
          style={({ pressed }) => [
            styles.summaryItem,
            pressed && styles.summaryItemPressed,
          ]}
          onPress={goToMySummary}
          android_ripple={{ color: '#E8F0FE' }}
        >
          <Text style={styles.summaryValue}>{totalWorkUnits.toFixed(1)}</Text>
          <Text style={styles.summaryLabel}>공수</Text>
        </Pressable>
      </View>

      <View style={[styles.calendarArea, { paddingBottom: insets.bottom }]}>
        <CalendarScreen
          ref={calendarRef}
          navigation={navigation}
          onMonthChange={handleCalendarMonthChange}
          cellHeight={CALENDAR_CELL_HEIGHT}
        />
      </View>

      <YearMonthPicker
        visible={pickerVisible}
        year={calendarYear}
        month={calendarMonth}
        onClose={() => setPickerVisible(false)}
        onSelect={handlePickerSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  monthTabBtn: {
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    height: 44, paddingHorizontal: 8,
  },
  monthTabText: {
    fontSize: 17, fontWeight: '700', color: '#1F3864',
  },
  monthTabArrow: { fontSize: 12, color: '#1F3864' },
  todayBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 6, backgroundColor: '#2E75B6',
  },
  todayBtnPressed: { backgroundColor: '#1F5A8E' },
  todayBtnText: {
    fontSize: 13, color: '#FFFFFF', fontWeight: '700',
  },

  summaryStrip: {
    flexDirection: 'row', alignItems: 'center',
    height: 56, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
    paddingHorizontal: 8, paddingVertical: 4,
  },
  summaryItem: {
    flex: 1, flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    height: '100%', borderRadius: 8, paddingVertical: 4,
  },
  summaryItemHighlight: { backgroundColor: '#FFF8E1', flex: 1.4 },
  summaryItemPressed: { opacity: 0.6 },
  summaryValue: {
    fontSize: 18, fontWeight: '700', color: '#1F3864', lineHeight: 22,
  },
  summaryValueHighlight: { color: '#D48806', fontSize: 19 },
  summaryLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  summaryLabelHighlight: { color: '#666', fontWeight: '600' },
  separator: {
    width: 1, height: 32,
    backgroundColor: '#E0E0E0', marginHorizontal: 6,
  },
  calendarArea: { flex: 1 },
});