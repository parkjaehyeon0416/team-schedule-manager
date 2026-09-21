// ═══════════════════════════════════════════════════════════════
// 📄 AttendanceScreen.tsx — 근태 현황 (팀장 전용)
//
//   ★ 설계 방향(2026-09-21): 개인이 직접 체크인하는 출퇴근 기능이 아님.
//   팀원 본인의 근무일/공수는 이미 MySummaryScreen(내 수입 현황)에 나오므로
//   중복임 — 이 화면은 "팀장이 팀원 전체의 그 달 출근 현황(=일정 배정일)을
//   한눈에 파악"하는 용도로, manager 이상만 볼 수 있음.
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';

import { getAttendance } from '../api/attendanceApi';
import type { AttendanceMember } from '../api/attendanceApi';
import { useAuthStore } from '../store/authStore';
import AppHeader from '../components/AppHeader';

const ROLE_LABELS: Record<number, string> = {
  1: '최고 관리자',
  2: '팀장',
  3: '팀원',
};

export default function AttendanceScreen() {
  const user = useAuthStore(s => s.user);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<AttendanceMember[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 팀장(role_id<=2) + 팀 소속일 때만 조회 — member는 애초에 API도 막혀있음
  const canView = !!user?.team_id && (user?.role_id ?? 99) <= 2;

  const load = useCallback(async (y: number, m: number) => {
    if (!canView) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getAttendance(y, m);
      setMembers(data.members);
    } catch (e: any) {
      setError(e?.response?.data?.message || '근태 현황을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  useFocusEffect(
    useCallback(() => {
      load(year, month);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, month, load]),
  );

  const handlePrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else { setMonth(m => m - 1); }
  };
  const handleNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else { setMonth(m => m + 1); }
  };

  if (!user?.team_id) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="menu" title="근태 현황" />
        <View style={styles.centerBox}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>소속된 팀이 없습니다</Text>
          <Text style={styles.emptySub}>팀에 소속되면 팀원 근태 현황을 볼 수 있어요.</Text>
        </View>
      </View>
    );
  }

  if (!canView) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="menu" title="근태 현황" />
        <View style={styles.centerBox}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyTitle}>팀장만 볼 수 있는 화면이에요</Text>
          <Text style={styles.emptySub}>
            내 근무일과 공수는 '내 수입' 화면에서 확인할 수 있어요.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader leftType="menu" title="근태 현황" />

      <View style={styles.monthRow}>
        <Pressable onPress={handlePrevMonth} hitSlop={12}>
          <Text style={styles.monthArrow}>‹</Text>
        </Pressable>
        <Text style={styles.monthText}>{year}년 {String(month).padStart(2, '0')}월</Text>
        <Pressable onPress={handleNextMonth} hitSlop={12}>
          <Text style={styles.monthArrow}>›</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2E75B6" />
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptySub}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {members.map(m => (
            <View key={m.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{m.name.charAt(0)}</Text>
                </View>
                <View style={styles.nameBox}>
                  <Text style={styles.name}>{m.name}</Text>
                  <Text style={styles.role}>{ROLE_LABELS[m.role_id] ?? '사용자'}</Text>
                </View>
                <View style={styles.workDaysBadge}>
                  <Text style={styles.workDaysText}>{m.work_days}일 근무</Text>
                </View>
              </View>

              {m.dates.length > 0 && (
                <View style={styles.datesRow}>
                  {m.dates.map(d => (
                    <View key={d} style={styles.dateChip}>
                      <Text style={styles.dateChipText}>
                        {dayjs(d).format('D')}일
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 6,
  },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  emptySub: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 4 },

  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  monthArrow: { fontSize: 22, color: '#1F3864', fontWeight: '700' },
  monthText: { fontSize: 16, fontWeight: '700', color: '#1F3864' },

  container: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#F7F8FA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1F3864',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontWeight: '700' },
  nameBox: { flex: 1 },
  name: { fontSize: 14.5, fontWeight: '700', color: '#222' },
  role: { fontSize: 11.5, color: '#888', marginTop: 1 },
  workDaysBadge: {
    backgroundColor: '#E8F0FE',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  workDaysText: { fontSize: 12.5, fontWeight: '700', color: '#1F3864' },

  datesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  dateChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  dateChipText: { fontSize: 11, color: '#555' },
});
