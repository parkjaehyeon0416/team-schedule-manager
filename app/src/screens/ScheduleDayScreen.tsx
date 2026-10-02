/**
 * 하루 일정 화면 — DESIGN-CANVAS 기준, SCHEDULE_DAY.dc.html
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';
import axios from '../api/axiosInstance';
import AppHeader from '../components/AppHeader';
import type { Schedule } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';
import { scheduleLocationLabel } from '../utils/scheduleLocation';

const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];
const BAR_PALETTE = ['#FF9E2C', '#0B9C8A', '#8B6CF0', '#2CC4B2', '#168BFF', '#C026D3'];
const TABS = ['전체', '개인', '팀'] as const;

export default function ScheduleDayScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [cursor, setCursor] = useState(dayjs(route.params?.date ?? undefined));
  const [tab, setTab] = useState<(typeof TABS)[number]>('전체');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    axios.get('/schedules', { params: { year: cursor.year(), month: cursor.month() + 1, scope: 'all' } })
      .then(res => setSchedules(res.data?.data || []))
      .catch(() => setSchedules([]))
      .finally(() => setLoading(false));
  }, [cursor]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const weekDays = useMemo(() => {
    const startOfWeek = cursor.startOf('week');
    return Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'));
  }, [cursor]);

  const dayList = useMemo(() => {
    const dateStr = cursor.format('YYYY-MM-DD');
    return schedules
      .filter(s => s.date === dateStr)
      .filter(s => tab === '전체' || (tab === '개인' ? !s.team_id : !!s.team_id))
      .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));
  }, [schedules, cursor, tab]);

  return (
    <View style={styles.screen}>
      <AppHeader
        leftType="back"
        title={`${cursor.format('M월 D일')} (${WEEKDAY_LABEL[cursor.day()]})`}
        rightContent={
          <Pressable onPress={() => navigation.navigate('ScheduleCreate', { date: cursor.format('YYYY-MM-DD') })} style={styles.headerRightBtn}>
            <Text style={styles.headerRightIcon}>+</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.weekStrip}>
          {weekDays.map(d => {
            const selected = d.isSame(cursor, 'day');
            return (
              <Pressable key={d.format('YYYY-MM-DD')} style={[styles.weekDay, selected && styles.weekDaySelected]} onPress={() => setCursor(d)}>
                <Text style={[styles.weekDayLabel, selected && styles.weekDayLabelSelected]}>{WEEKDAY_LABEL[d.day()]}</Text>
                <Text style={[styles.weekDayNum, selected && styles.weekDayLabelSelected]}>{d.date()}</Text>
              </Pressable>
            );
          })}
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

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>하루 일정</Text>
          <Text style={styles.sectionCount}>일정 {dayList.length}개</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : dayList.length === 0 ? (
          <View style={styles.emptyBox}><Text style={styles.emptyText}>이 날은 등록된 일정이 없어요.</Text></View>
        ) : (
          dayList.map((s, i) => {
            const isPersonal = !s.team_id;
            const bar = BAR_PALETTE[i % BAR_PALETTE.length];
            const title = s.title || s.work_type_relation?.name || s.memo || '일정';
            const siteLabel = scheduleLocationLabel(s);
            return (
              <Pressable key={s.id} style={styles.itemRow} onPress={() => navigation.navigate('ScheduleDetail', { id: s.id })}>
                <Text style={styles.itemTime}>{s.start_time?.slice(0, 5) ?? '-'}</Text>
                <View style={styles.itemCard}>
                  <View style={[styles.itemBar, { backgroundColor: bar }]} />
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{title}</Text>
                    <Text style={styles.itemSub} numberOfLines={1}>
                      {s.start_time?.slice(0, 5) ?? ''}{s.end_time ? ` - ${s.end_time.slice(0, 5)}` : ''}{siteLabel ? ` · ${siteLabel}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.itemTag, { backgroundColor: isPersonal ? '#F0EBFF' : '#E8F3FF' }]}>
                    <Text style={[styles.itemTagText, { color: isPersonal ? '#6B4FD8' : colors.primaryDark }]}>{isPersonal ? '개인' : '팀'}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  headerRightBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerRightIcon: { fontSize: 22, color: colors.textPrimary },
  content: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xl, gap: spacing.md },

  weekStrip: { flexDirection: 'row', gap: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 6 },
  weekDay: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 12 },
  weekDaySelected: { backgroundColor: colors.primary },
  weekDayLabel: { fontSize: 11, color: colors.textSecondary },
  weekDayNum: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  weekDayLabelSelected: { color: '#FFFFFF' },

  tabRow: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: '#EEF5FD', borderRadius: 12 },
  tabBtn: { flex: 1, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabBtnOn: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  tabTextOn: { fontWeight: '700', color: colors.primaryDark },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  sectionCount: { fontSize: 13, color: colors.textSecondary },

  emptyBox: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textSecondary },

  itemRow: { flexDirection: 'row', gap: 12 },
  itemTime: { width: 44, fontSize: 12, fontWeight: '600', color: colors.textSecondary, paddingTop: 14 },
  itemCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.md, padding: 12, overflow: 'hidden' },
  itemBar: { width: 4, alignSelf: 'stretch', borderRadius: 3 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  itemSub: { fontSize: 12, color: colors.textSecondary },
  itemTag: { height: 24, paddingHorizontal: 8, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  itemTagText: { fontSize: 11, fontWeight: '700' },
});
