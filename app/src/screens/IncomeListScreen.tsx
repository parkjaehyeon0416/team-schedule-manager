/**
 * 내 수입 화면 — DESIGN-CANVAS 기준, INCOME_LIST.dc.html
 * ★ 막대그래프는 선택한 연도의 월별 수입(세무자료 API 재사용)을 그대로 씀.
 * ★ "현장별/팀별" 탭에서 그룹 카드를 누르면 디자인처럼 가짜 상세로 보내지 않고
 *   실제로 있는 현장상세/팀상세 화면으로 연결함.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import YearMonthPicker from '../components/YearMonthPicker';
import { getSchedules } from '../api/schedulesApi';
import { getTaxSummary } from '../api/taxSummaryApi';
import { getMyTeams } from '../api/teamApi';
import type { Schedule, Team } from '../types/api';
import { formatMoney } from '../utils/format';
import { colors, radius, spacing } from '../theme/designTokens';

// 일정 1건의 수입 = 일당 × 공수 (서버 월 집계와 같은 식 — 0.5공수면 절반)
const scheduleIncome = (s: Schedule) => (Number(s.daily_wage) || 0) * (Number(s.work_units) || 1);

const TONES = ['#FFF1DE', '#DFF8F4', '#EFEAFF', '#E8F3FF'];
const TONE_FG = ['#E07E00', '#0B9C8A', '#6B4FD8', '#0A6CE0'];
const TABS = ['전체', '현장별', '팀별'] as const;

export default function IncomeListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const now = new Date();
  const [year, setYear] = useState(route.params?.year ?? now.getFullYear());
  const [month, setMonth] = useState(route.params?.month ?? now.getMonth() + 1);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]>(route.params?.tab ?? '전체');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<number[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getSchedules(year, month), getTaxSummary(year), getMyTeams().catch(() => [])])
      .then(([list, summary, teamList]) => {
        setSchedules(list.filter(s => Number(s.daily_wage ?? 0) > 0).sort((a, b) => b.date.localeCompare(a.date)));
        setMonthlyTotals(summary.months.map(m => m.total_income));
        setTeams(teamList);
      })
      .finally(() => setLoading(false));
  }, [year, month]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = useMemo(() => schedules.reduce((sum, s) => sum + scheduleIncome(s), 0), [schedules]);
  const maxBar = useMemo(() => Math.max(1, ...monthlyTotals), [monthlyTotals]);

  const siteGroups = useMemo(() => {
    const map = new Map<number, { label: string; count: number; amount: number }>();
    schedules.forEach(s => {
      if (!s.site_id) return;
      const label = s.site ? (s.site.apt_name || s.site.address) : '현장 미지정';
      const cur = map.get(s.site_id) ?? { label, count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += scheduleIncome(s);
      map.set(s.site_id, cur);
    });
    return Array.from(map.entries()).map(([siteId, v]) => ({ siteId, ...v })).sort((a, b) => b.amount - a.amount);
  }, [schedules]);

  const teamGroups = useMemo(() => {
    const map = new Map<number, { label: string; count: number; amount: number }>();
    schedules.forEach(s => {
      if (!s.team_id) return;
      const team = teams.find(t => t.id === s.team_id);
      const cur = map.get(s.team_id) ?? { label: team?.name ?? '팀', count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += scheduleIncome(s);
      map.set(s.team_id, cur);
    });
    return Array.from(map.entries()).map(([teamId, v]) => ({ teamId, ...v })).sort((a, b) => b.amount - a.amount);
  }, [schedules, teams]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="내 수입" />
        <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="내 수입" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.monthBtn} onPress={() => setPickerVisible(true)}>
          <Text style={styles.monthBtnText}>{year}년 {month}월</Text>
          <Icon name="chevron-down" size={16} color={colors.primaryDark} />
        </Pressable>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>총 수입</Text>
          <Text style={styles.summaryValue}>{formatMoney(total)}원</Text>
          <View style={styles.barRow}>
            {monthlyTotals.map((v, i) => (
              <View key={i} style={[styles.bar, { height: Math.max(4, (v / maxBar) * 64) }, i === month - 1 && styles.barActive]} />
            ))}
          </View>
        </View>

        <View style={styles.tabRow}>
          {TABS.map(t => {
            const on = t === tab;
            return (
              <Pressable key={t} style={[styles.tabBtn, on && styles.tabBtnOn]} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.listCard}>
          {tab === '전체' && (
            schedules.length === 0 ? (
              <Text style={styles.emptyText}>이 달에 수입으로 집계된 일정이 없어요.</Text>
            ) : schedules.map((s, i) => {
              const bg = TONES[i % TONES.length];
              const fg = TONE_FG[i % TONE_FG.length];
              const team = teams.find(t => t.id === s.team_id);
              return (
                <Pressable key={s.id} style={[styles.row, i === schedules.length - 1 && { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('IncomeDetail', { scheduleId: s.id })}>
                  <View style={[styles.rowIcon, { backgroundColor: bg }]}><Icon name="currency-krw" size={18} color={fg} /></View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{s.memo || s.work_type_relation?.name || '일정'}</Text>
                    <Text style={styles.rowSub}>{s.date.slice(5).replace('-', '.')}{team ? ` · ${team.name}` : ''}</Text>
                  </View>
                  <Text style={styles.rowAmount}>{formatMoney(scheduleIncome(s))}원</Text>
                </Pressable>
              );
            })
          )}
          {tab === '현장별' && (
            siteGroups.length === 0 ? (
              <Text style={styles.emptyText}>현장이 연결된 일정이 없어요.</Text>
            ) : siteGroups.map((g, i) => {
              const bg = TONES[i % TONES.length];
              const fg = TONE_FG[i % TONE_FG.length];
              return (
                <Pressable key={g.siteId} style={[styles.row, i === siteGroups.length - 1 && { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('SiteDetail', { siteId: g.siteId })}>
                  <View style={[styles.rowIcon, { backgroundColor: bg }]}><Icon name="currency-krw" size={18} color={fg} /></View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{g.label}</Text>
                    <Text style={styles.rowSub}>일정 {g.count}건</Text>
                  </View>
                  <Text style={styles.rowAmount}>{formatMoney(g.amount)}원</Text>
                </Pressable>
              );
            })
          )}
          {tab === '팀별' && (
            teamGroups.length === 0 ? (
              <Text style={styles.emptyText}>팀이 연결된 일정이 없어요.</Text>
            ) : teamGroups.map((g, i) => {
              const bg = TONES[i % TONES.length];
              const fg = TONE_FG[i % TONE_FG.length];
              return (
                <Pressable key={g.teamId} style={[styles.row, i === teamGroups.length - 1 && { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('TeamDetail', { teamId: g.teamId })}>
                  <View style={[styles.rowIcon, { backgroundColor: bg }]}><Icon name="currency-krw" size={18} color={fg} /></View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{g.label}</Text>
                    <Text style={styles.rowSub}>일정 {g.count}건</Text>
                  </View>
                  <Text style={styles.rowAmount}>{formatMoney(g.amount)}원</Text>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      <YearMonthPicker
        visible={pickerVisible}
        year={year}
        month={month}
        onClose={() => setPickerVisible(false)}
        onSelect={(y, m) => { setYear(y); setMonth(m); setPickerVisible(false); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xl, gap: spacing.md },

  monthBtn: { alignSelf: 'flex-start', height: 40, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: '#EAF3FE', flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },

  summaryCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 16, gap: 10 },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  barRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 64 },
  bar: { flex: 1, borderRadius: 4, backgroundColor: '#9FD0FF', opacity: 0.8 },
  barActive: { backgroundColor: colors.primaryDark, opacity: 1 },

  tabRow: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: '#EEF5FD', borderRadius: 12 },
  tabBtn: { flex: 1, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabBtnOn: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  tabTextOn: { fontWeight: '700', color: colors.primaryDark },

  listCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, paddingVertical: 20, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary },
  rowAmount: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
});
