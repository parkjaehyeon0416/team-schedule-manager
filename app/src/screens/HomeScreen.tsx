/**
 * 홈 화면 — v9.2 + v10.3
 *
 * 핵심 원칙:
 *  - 홈은 "캘린더가 보고 있는 달"을 따라간다
 *  - 요약 스트립의 데이터는 캘린더의 달 기준
 *  - "이번달 수입" 탭 시 그 달을 MySummary에 params로 전달
 *  - MySummary 화면 변경에 영향 받지 않음
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import CalendarScreen from './CalendarScreen';
import { getMonthlySummary } from '../api/schedulesApi';
import type { MonthlySummary } from '../types/api';
import { formatShortKRW } from '../utils/format';

export default function HomeScreen({ navigation }: any) {
  // ─── 캘린더가 보고 있는 달을 따라가는 state ──
  const now = new Date();
  const [calendarYear, setCalendarYear] = useState<number>(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(
    now.getMonth() + 1,
  );

  // ─── 월별 집계 데이터 ──────────────────────
  const [summary, setSummary] = useState<MonthlySummary | null>(null);

  // ─── 캘린더가 월 변경 알리면 즉시 fetch ────
  const handleCalendarMonthChange = useCallback(
    async (newYear: number, newMonth: number) => {
      setCalendarYear(newYear);
      setCalendarMonth(newMonth);
      // 캘린더 변경 즉시 새 데이터 fetch
      try {
        const data = await getMonthlySummary(newYear, newMonth);
        setSummary(data);
      } catch {
        setSummary(null);
      }
    },
    [],
  );

  // ─── 화면 포커스 시 현재 캘린더 달로 새로고침 ──
  // (다른 화면 갔다가 돌아왔을 때 데이터 갱신)
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
      return () => {
        cancelled = true;
      };
    }, [calendarYear, calendarMonth]),
  );

  // ─── 안전한 숫자 변환 ──────────────────────
  const workDays = summary?.work_days ?? 0;
  const totalIncome = parseFloat(summary?.total_income || '0');
  const siteCount = summary?.site_count ?? 0;

  // ─── 네비게이션 ─────────────────────────────
  // ★ 캘린더가 보고 있는 달을 MySummary에 전달
  const goToMySummary = () => {
    navigation.navigate('MySummary', {
      year: calendarYear,
      month: calendarMonth,
      _ts: Date.now(), // 같은 달 재진입도 인식되게
    });
  };

  const goToAttendance = () => {
    navigation.navigate('Attendance');
  };

  // ─── 라벨 동적 변경 ─────────────────────────
  const isCurrentMonth =
    calendarYear === now.getFullYear() && calendarMonth === now.getMonth() + 1;
  const incomeLabel = isCurrentMonth
    ? '이번달 수입'
    : `${calendarMonth}월 수입`;

  return (
    <View style={styles.container}>
      <View style={styles.summaryStrip}>
        {/* 근무일 */}
        <Pressable
          style={({ pressed }) => [
            styles.summaryItem,
            pressed && styles.summaryItemPressed,
          ]}
          onPress={goToAttendance}
          android_ripple={{ color: '#E8F0FE' }}
        >
          <Text style={styles.summaryValue}>{workDays}일</Text>
          <Text style={styles.summaryLabel}>근무일</Text>
        </Pressable>

        <View style={styles.separator} />

        {/* 수입 — 캘린더 달 기준 */}
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

        {/* 현장 수 */}
        <Pressable
          style={({ pressed }) => [
            styles.summaryItem,
            pressed && styles.summaryItemPressed,
          ]}
          onPress={goToMySummary}
          android_ripple={{ color: '#E8F0FE' }}
        >
          <Text style={styles.summaryValue}>{siteCount}개</Text>
          <Text style={styles.summaryLabel}>현장</Text>
        </Pressable>
      </View>

      {/* 큰 달력 */}
      <View style={styles.calendarArea}>
        <CalendarScreen
          navigation={navigation}
          onMonthChange={handleCalendarMonthChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  summaryItemHighlight: { backgroundColor: '#FFF8E1', flex: 1.3 },
  summaryItemPressed: { opacity: 0.6 },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F3864',
    marginBottom: 2,
  },
  summaryValueHighlight: { color: '#D48806', fontSize: 17 },
  summaryLabel: { fontSize: 10, color: '#888' },
  summaryLabelHighlight: { color: '#666', fontWeight: '600' },
  separator: {
    width: 1,
    height: 28,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  calendarArea: { flex: 1 },
});
