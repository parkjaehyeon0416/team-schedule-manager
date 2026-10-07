/**
 * 근태 현황 — DESIGN-CANVAS 기준, ATTENDANCE.dc.html (★ v18.48 재디자인, 팀장·부팀장 전용)
 * 개인이 출퇴근을 체크하는 기능이 아니라, 팀 일정에 배정된 날을 근무일로 모아 보는 화면(2026-09-21 설계).
 * 팀 선택 칩(팀장·부팀장인 팀이 여러 개일 때), 월 이동, 팀원별 근무일 수 — 누르면 출근한 날짜.
 * 팀 상세 "근태 현황" 타일에서 진입(route.params.teamId).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { getAttendance } from '../api/attendanceApi';
import type { AttendanceMember } from '../api/attendanceApi';
import { getMyTeams } from '../api/teamApi';
import type { Team } from '../types/api';
import AppHeader from '../components/AppHeader';
import { Avatar, RoleTag, InfoNote } from '../components/TeamUi';
import { colors, spacing } from '../theme/designTokens';
import { isPlanLocked } from '../utils/planLock';

export default function AttendanceScreen() {
  const route = useRoute<any>();
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [teamId, setTeamId] = useState<number | null>(route.params?.teamId ?? null);
  const [members, setMembers] = useState<AttendanceMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  // 팀장·부팀장인 팀만(활성 팀과 무관)
  const myTeams = (teams ?? []).filter(t => t.is_leader || t.is_sub_leader);

  useEffect(() => {
    getMyTeams()
      .then(list => {
        setTeams(list);
        const mine = list.filter(t => t.is_leader || t.is_sub_leader);
        setTeamId(cur => (cur && mine.some(t => t.id === cur) ? cur : (mine.find(t => t.is_active) ?? mine[0])?.id ?? null));
      })
      .catch(() => setTeams([]));
  }, []);

  const load = useCallback(async () => {
    if (!teamId) return;
    setMembers(null);
    setError(null);
    try {
      const [y, m] = month.split('-').map(Number);
      const data = await getAttendance(y, m, teamId);
      setMembers(data.members);
      setOpen(data.members.length ? data.members[0].id : null);
    } catch (e: any) {
      setError(isPlanLocked(e) ? '팀 요금제에서 쓸 수 있는 기능이에요.' : e?.response?.data?.message || '근태 현황을 불러오지 못했어요.');
    }
  }, [teamId, month]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shift = (n: number) => setMonth(m => dayjs(`${m}-01`).add(n, 'month').format('YYYY-MM'));
  const totalDays = (members ?? []).reduce((a, m) => a + m.work_days, 0);

  if (teams && myTeams.length === 0) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="근태 현황" />
        <View style={styles.center}>
          <Icon name="lock-outline" size={36} color={colors.muted} />
          <Text style={styles.emptyTitle}>팀장 · 부팀장만 볼 수 있는 화면이에요</Text>
          <Text style={styles.muted}>내 근무일과 공수는 '내 수입' 화면에서 확인할 수 있어요.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="근태 현황" />
      <ScrollView contentContainerStyle={styles.content}>
        {myTeams.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {myTeams.map(t => {
              const on = t.id === teamId;
              return (
                <Pressable key={t.id} onPress={() => setTeamId(t.id)} style={[styles.teamChip, on && styles.teamChipOn]} accessibilityState={{ selected: on }}>
                  <Text style={[styles.teamChipText, on && { color: '#FFFFFF' }]}>{t.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.monthBox}>
          <Pressable onPress={() => shift(-1)} accessibilityLabel="이전 달" style={styles.monthBtn}>
            <Icon name="chevron-left" size={22} color={colors.textPrimary} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.monthText}>{dayjs(`${month}-01`).format('YYYY년 M월')}</Text>
            <Text style={styles.summary}>{members ? `팀원 ${members.length}명 · 근무 ${totalDays}일` : ' '}</Text>
          </View>
          <Pressable onPress={() => shift(1)} accessibilityLabel="다음 달" style={styles.monthBtn}>
            <Icon name="chevron-right" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        {error ? (
          <Text style={[styles.muted, { textAlign: 'center', padding: 30 }]}>{error}</Text>
        ) : !members ? (
          <ActivityIndicator color={colors.primary} style={{ padding: 30 }} />
        ) : (
          members.map(m => {
            const on = open === m.id;
            return (
              <View key={m.id} style={styles.card}>
                <Pressable style={styles.cardHead} onPress={() => setOpen(on ? null : m.id)} accessibilityState={{ expanded: on }}>
                  <Avatar id={m.id} name={m.name} color={m.avatar_color} image={m.avatar_image_path} />
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{m.name}</Text>
                    <RoleTag role={m.role ?? (m.role_id <= 2 ? '팀장' : '팀원')} />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.days}>{m.work_days}일</Text>
                    <Text style={styles.summary}>{on ? '접기' : '날짜 보기'}</Text>
                  </View>
                </Pressable>
                {on && m.dates.length > 0 && (
                  <View style={styles.dates}>
                    {m.dates.map(d => (
                      <View key={d} style={styles.dateChip}><Text style={styles.dateText}>{dayjs(d).format('D')}일</Text></View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}

        <InfoNote>근태 현황은 팀장 · 부팀장만 볼 수 있어요. 팀 일정에 참여한 날이 근무일로 잡혀요.</InfoNote>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  content: { paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: spacing.xl, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  muted: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  teamChip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  teamChipOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  teamChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  monthBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 4, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6F0FA', borderRadius: 14 },
  monthBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  monthText: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  summary: { fontSize: 11, color: colors.textSecondary },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6F0FA', borderRadius: 16, padding: 14, gap: 10, shadowColor: '#102A56', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  days: { fontSize: 18, fontWeight: '700', color: colors.primaryDark },
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderHairline },
  dateChip: { height: 28, minWidth: 40, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#E8F3FF', alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
});
