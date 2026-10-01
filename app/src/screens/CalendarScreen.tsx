// ═══════════════════════════════════════════════════════════════
//   app/src/screens/CalendarScreen.tsx
//   v18.32 — DESIGN-CANVAS 기준 전면 재작성 (SCHEDULE_MONTH.dc.html 1:1)
//   이전: react-native-calendars 기반 셀 안에 막대 텍스트 표시 + 바텀시트 모달
//   이후: 자체 월 그리드(원형 날짜 + 점 인디케이터) + 하단 "그 날 일정" 인라인 섹션
// ═══════════════════════════════════════════════════════════════

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from '../api/axiosInstance';
import { getMyTeams } from '../api/teamApi';
import type { Schedule, Team } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';

const TEAM_PALETTE = ['#FF9E2C', '#0B9C8A', '#8B6CF0', '#E5484D', '#2492FF', '#C026D3'];
const PCOLOR = colors.primary;
const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export interface CalendarHandle {
  goToday: () => void;
  jumpToDate: (date: string) => void;
}

export type ScheduleScope = 'all' | 'personal' | 'team';

interface Props {
  navigation: any;
  onMonthChange?: (year: number, month: number) => void;
  cellHeight?: number;
  scope?: ScheduleScope;
}

const CalendarScreen = forwardRef<CalendarHandle, Props>(
  ({ navigation, onMonthChange, scope = 'all' }, ref) => {
    const [cursor, setCursor] = useState(dayjs());
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<number | 'all'>('all');
    const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

    const teamColor = useCallback(
      (teamId: number | null) => {
        if (!teamId) return PCOLOR;
        const idx = teams.findIndex(t => t.id === teamId);
        return TEAM_PALETTE[idx >= 0 ? idx % TEAM_PALETTE.length : teams.length % TEAM_PALETTE.length];
      },
      [teams],
    );

    const teamName = useCallback(
      (teamId: number | null) => {
        if (!teamId) return '개인';
        return teams.find(t => t.id === teamId)?.name || '팀';
      },
      [teams],
    );

    const fetchSchedules = useCallback(async () => {
      try {
        const res = await axios.get('/schedules', {
          params: { year: cursor.year(), month: cursor.month() + 1, scope },
        });
        setSchedules(res.data?.data || []);
      } catch {
        setSchedules([]);
      }
    }, [cursor, scope]);

    useEffect(() => {
      getMyTeams().then(setTeams).catch(() => setTeams([]));
    }, []);

    useEffect(() => {
      fetchSchedules();
    }, [fetchSchedules]);

    useEffect(() => {
      if (!navigation) return;
      const unsubscribe = navigation.addListener('focus', fetchSchedules);
      return unsubscribe;
    }, [navigation, fetchSchedules]);

    useEffect(() => {
      onMonthChange?.(cursor.year(), cursor.month() + 1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cursor]);

    // 월이 바뀌면 선택 날짜를 그 달 1일로 리셋 (이전 달의 날짜가 선택된 채 남지 않도록)
    useEffect(() => {
      if (!selectedDate.startsWith(cursor.format('YYYY-MM'))) {
        const today = dayjs();
        setSelectedDate(
          today.format('YYYY-MM') === cursor.format('YYYY-MM')
            ? today.format('YYYY-MM-DD')
            : cursor.startOf('month').format('YYYY-MM-DD'),
        );
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cursor]);

    useImperativeHandle(ref, () => ({
      goToday: () => {
        setCursor(dayjs());
        setSelectedDate(dayjs().format('YYYY-MM-DD'));
      },
      jumpToDate: (date: string) => {
        setCursor(dayjs(date));
        setSelectedDate(date);
      },
    }), []);

    const visibleSchedules = useMemo(() => {
      if (scope !== 'team' || selectedTeamId === 'all') return schedules;
      return schedules.filter(s => s.team_id === selectedTeamId);
    }, [schedules, scope, selectedTeamId]);

    const schedulesByDate = useMemo(() => {
      const grouped: Record<string, Schedule[]> = {};
      visibleSchedules.forEach(s => {
        (grouped[s.date] ||= []).push(s);
      });
      return grouped;
    }, [visibleSchedules]);

    const cells = useMemo(() => {
      const startOfMonth = cursor.startOf('month');
      const firstDow = startOfMonth.day();
      const daysInMonth = cursor.daysInMonth();
      const list: { day: number | null; dateStr: string }[] = [];
      for (let i = 0; i < firstDow; i++) list.push({ day: null, dateStr: '' });
      for (let d = 1; d <= daysInMonth; d++) {
        list.push({ day: d, dateStr: startOfMonth.date(d).format('YYYY-MM-DD') });
      }
      while (list.length % 7 !== 0) list.push({ day: null, dateStr: '' });
      return list;
    }, [cursor]);

    const todayStr = dayjs().format('YYYY-MM-DD');
    const dayEvents = schedulesByDate[selectedDate] || [];
    const selDay = dayjs(selectedDate);

    const legendItems = useMemo(() => {
      if (scope === 'personal') return [{ name: '개인 일정', color: PCOLOR }];
      if (scope === 'team') {
        return teams.map(t => ({ name: t.name, color: teamColor(t.id) }));
      }
      return [{ name: '개인', color: PCOLOR }, ...teams.map(t => ({ name: t.name, color: teamColor(t.id) }))];
    }, [scope, teams, teamColor]);

    const goCreate = () => {
      const parent = navigation.getParent();
      (parent || navigation).navigate('ScheduleCreate', { date: selectedDate });
    };

    const goDetail = (id: number) => {
      const parent = navigation.getParent()?.getParent() || navigation.getParent();
      (parent || navigation).navigate('ScheduleDetail', { id });
    };

    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {scope === 'team' && teams.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamChipsRow}>
            <Pressable
              style={[styles.teamChip, selectedTeamId === 'all' && styles.teamChipActive]}
              onPress={() => setSelectedTeamId('all')}
            >
              <View style={[styles.teamChipDot, { backgroundColor: colors.textPrimary }]} />
              <Text style={[styles.teamChipText, selectedTeamId === 'all' && styles.teamChipTextActive]}>
                전체 팀
              </Text>
            </Pressable>
            {teams.map(t => (
              <Pressable
                key={t.id}
                style={[styles.teamChip, selectedTeamId === t.id && styles.teamChipActive]}
                onPress={() => setSelectedTeamId(t.id)}
              >
                <View style={[styles.teamChipDot, { backgroundColor: teamColor(t.id) }]} />
                <Text style={[styles.teamChipText, selectedTeamId === t.id && styles.teamChipTextActive]}>
                  {t.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.calCard}>
          <View style={styles.monthNavRow}>
            <Pressable
              style={styles.monthNavBtn}
              onPress={() => setCursor(c => c.subtract(1, 'month'))}
            >
              <Icon name="chevron-left" size={20} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.monthLabel}>{cursor.format('YYYY년 M월')}</Text>
            <Pressable
              style={styles.monthNavBtn}
              onPress={() => setCursor(c => c.add(1, 'month'))}
            >
              <Icon name="chevron-right" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.dowRow}>
            {DOW.map((d, i) => (
              <Text
                key={d}
                style={[
                  styles.dowText,
                  i === 0 && { color: colors.danger },
                  i === 6 && { color: colors.primaryDark },
                ]}
              >
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.gridWrap}>
            {cells.map((c, i) => {
              if (!c.day) return <View key={i} style={styles.cellEmpty} />;
              const dow = i % 7;
              const isToday = c.dateStr === todayStr;
              const isSel = c.dateStr === selectedDate;
              const dayEv = schedulesByDate[c.dateStr] || [];
              const dots = dayEv.slice(0, 3);
              const fg = isSel ? '#FFFFFF' : dow === 0 ? colors.danger : dow === 6 ? colors.primaryDark : colors.textPrimary;
              return (
                <Pressable
                  key={i}
                  style={styles.cellWrap}
                  onPress={() => setSelectedDate(c.dateStr)}
                >
                  <View
                    style={[
                      styles.cellCircle,
                      isSel && { backgroundColor: colors.primary },
                      !isSel && isToday && { backgroundColor: '#E8F3FF' },
                    ]}
                  >
                    <Text style={[styles.cellDayText, { color: fg, fontWeight: isSel || isToday ? '700' : '500' }]}>
                      {c.day}
                    </Text>
                  </View>
                  <View style={styles.cellDotsRow}>
                    {dots.map((s, di) => (
                      <View key={di} style={[styles.cellDot, { backgroundColor: teamColor(s.team_id) }]} />
                    ))}
                    {dayEv.length > 3 && <Text style={styles.cellMoreText}>+{dayEv.length - 3}</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {legendItems.length > 0 && (
            <View style={styles.legendRow}>
              {legendItems.map(l => (
                <View key={l.name} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                  <Text style={styles.legendText}>{l.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Pressable
          style={styles.dayHeaderRow}
          onPress={() => {
            const parent = navigation.getParent();
            (parent || navigation).navigate('ScheduleDay', { date: selectedDate });
          }}
        >
          <Text style={styles.dayTitle}>
            {selDay.format('M월 D일')} ({DOW[selDay.day()]}) ›
          </Text>
          <Text style={styles.dayCount}>일정 {dayEvents.length}개</Text>
        </Pressable>

        {dayEvents.length === 0 ? (
          <View style={styles.noEvCard}>
            <Text style={styles.noEvText}>이 날은 일정이 없어요.</Text>
            <Pressable onPress={goCreate}>
              <Text style={styles.noEvLink}>+ 일정 등록</Text>
            </Pressable>
          </View>
        ) : (
          dayEvents.map(e => (
            <Pressable
              key={e.id}
              style={({ pressed }) => [styles.evCard, pressed && { opacity: 0.85 }]}
              onPress={() => goDetail(e.id)}
            >
              <View style={[styles.evBar, { backgroundColor: teamColor(e.team_id) }]} />
              <View style={styles.evTextBox}>
                <Text style={styles.evTitle} numberOfLines={1}>
                  {e.site?.apt_name || e.work_type_relation?.name || e.work_type || '일정'}
                </Text>
                <Text style={styles.evSub} numberOfLines={1}>
                  {e.site?.address || e.memo || ''}
                </Text>
              </View>
              <View
                style={[
                  styles.evTag,
                  { backgroundColor: e.team_id ? '#E8F3FF' : '#F0EBFF' },
                ]}
              >
                <Text style={[styles.evTagText, { color: e.team_id ? colors.primaryDark : '#6B4FD8' }]}>
                  {teamName(e.team_id)}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    );
  },
);

CalendarScreen.displayName = 'CalendarScreen';
export default CalendarScreen;

const CELL_W = `${100 / 7}%` as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },

  teamChipsRow: { maxHeight: 36 },
  teamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  teamChipActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  teamChipDot: { width: 7, height: 7, borderRadius: 4 },
  teamChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  teamChipTextActive: { color: '#FFFFFF' },

  calCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.lg,
    padding: 10,
    gap: 6,
  },
  monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthNavBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  dowRow: { flexDirection: 'row' },
  dowText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  cellEmpty: { width: CELL_W, height: 46 },
  cellWrap: { width: CELL_W, height: 46, alignItems: 'center', paddingTop: 2, gap: 3 },
  cellCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cellDayText: { fontSize: 13 },
  cellDotsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 8 },
  cellDot: { width: 5, height: 5, borderRadius: 3 },
  cellMoreText: { fontSize: 9, fontWeight: '700', color: colors.textSecondary, lineHeight: 9 },

  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    paddingTop: 8,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderHairline,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, marginHorizontal: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 12, color: colors.textSecondary },

  dayHeaderRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  dayTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  dayCount: { fontSize: 13, color: colors.textSecondary },

  noEvCard: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 6,
  },
  noEvText: { fontSize: 14, color: colors.textSecondary },
  noEvLink: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },

  evCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingRight: 12,
    overflow: 'hidden',
  },
  evBar: { width: 4, alignSelf: 'stretch', borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  evTextBox: { flex: 1, minWidth: 0, gap: 3 },
  evTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  evSub: { fontSize: 12, color: colors.textSecondary },
  evTag: { height: 24, paddingHorizontal: 9, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  evTagText: { fontSize: 12, fontWeight: '700' },
});
