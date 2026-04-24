/**
 * 홈 화면 — v9.2 재구성
 *
 * 변경 사항:
 *  - Bottom Tab Navigator 제거 → 내 수입/근태는 햄버거 메뉴에서 접근
 *  - 요약 스트립 이모지 제거 → 공간 효율 ↑
 *  - 달력 영역 최대 확장 → 빈 날짜 조망 최적화
 *
 * 네비게이션:
 *  - 요약 스트립 터치 시 → navigation.navigate('MySummary' / 'Attendance')
 *    (Drawer.Screen 이름과 일치)
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import CalendarScreen from './CalendarScreen';

// ═══════════════════════════════════════════════
// Mock 요약 데이터 (v10에서 API 연동 시 교체)
// ═══════════════════════════════════════════════
const MOCK_SUMMARY = {
  work_days: 18,
  total_income: 3_600_000,
  site_count: 12,
};

const formatShortKRW = (value: number): string => {
  if (value >= 10_000_000) {
    return `${(value / 10_000_000).toFixed(1)}천만`;
  }
  if (value >= 10_000) {
    return `${Math.floor(value / 10_000)}만`;
  }
  return value.toLocaleString('ko-KR');
};

export default function HomeScreen({ navigation }: any) {
  const summary = MOCK_SUMMARY;

  // ─── v9.2: Drawer.Screen 이름으로 이동 ───
  const goToMySummary = () => {
    navigation.navigate('MySummary');
  };

  const goToAttendance = () => {
    navigation.navigate('Attendance');
  };

  return (
    <View style={styles.container}>
      {/* ═══ 이번달 요약 스트립 (이모지 제거, 컴팩트) ═══ */}
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
          <Text style={styles.summaryValue}>{summary.work_days}일</Text>
          <Text style={styles.summaryLabel}>근무일</Text>
        </Pressable>

        <View style={styles.separator} />

        {/* 수입 — 가운데, 강조 */}
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
            ₩{formatShortKRW(summary.total_income)}
          </Text>
          <Text style={[styles.summaryLabel, styles.summaryLabelHighlight]}>
            이번달 수입
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
          <Text style={styles.summaryValue}>{summary.site_count}개</Text>
          <Text style={styles.summaryLabel}>현장</Text>
        </Pressable>
      </View>

      {/* ═══ 큰 달력 (화면 대부분 차지) ═══ */}
      <View style={styles.calendarArea}>
        <CalendarScreen navigation={navigation} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // ─── 요약 스트립 (컴팩트 버전) ───
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
  summaryItemHighlight: {
    backgroundColor: '#FFF8E1',
    flex: 1.3,
  },
  summaryItemPressed: {
    opacity: 0.6,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F3864',
    marginBottom: 2,
  },
  summaryValueHighlight: {
    color: '#D48806',
    fontSize: 17,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#888',
  },
  summaryLabelHighlight: {
    color: '#666',
    fontWeight: '600',
  },
  separator: {
    width: 1,
    height: 28,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  calendarArea: {
    flex: 1,
  },
});
