/**
 * 홈 대시보드 화면 — v18.31 (DESIGN-CANVAS 기준, HOME.dc.html 1:1)
 * 하단 탭 '홈' — 이번 달 수입 카드 + 메뉴 그리드 + 오늘의 일정 + 견적 현황 + 팀 활동
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { getMonthlySummary, getSchedules } from '../api/schedulesApi';
import { getQuotes } from '../api/quoteApi';
import { getTeamActivities } from '../api/teamApi';
import type { TeamActivity } from '../api/teamApi';
import { getLatestEvent, getLatestNotice } from '../api/noticesApi';
import type { NoticeSummary } from '../api/noticesApi';
import type { MonthlySummary, Schedule } from '../types/api';
import { formatMoney } from '../utils/format';
import { colors, radius, spacing, typography } from '../theme/designTokens';
import { scheduleAddress, scheduleLocationLabel } from '../utils/scheduleLocation';
import { ICONS } from '../assets/icons';
import type { IconKey } from '../assets/icons';
import dayjs from 'dayjs';

// ★ v18.36 — 디자인의 3D 아이콘(이미지)으로 교체. 마지막 공지·이벤트는 디자인처럼 선 아이콘 유지
const MENU_ITEMS: { key: string; label: string; image?: IconKey; icon?: string; route: string }[] = [
  { key: 'schedule', label: '일정', image: 'schedule', route: 'Schedule' },
  { key: 'income', label: '내수입', image: 'income', route: 'IncomeList' },
  { key: 'team', label: '팀관리', image: 'team', route: 'Team' },
  { key: 'quote', label: '견적서', image: 'quote', route: 'QuoteList' },
  { key: 'card', label: '내 명함', image: 'card', route: 'BusinessCard' },
  { key: 'tax', label: '세무 자료', image: 'tax', route: 'TaxSummary' },
  { key: 'site', label: '현장 목록', image: 'site', route: 'SiteList' },
  { key: 'notice', label: '공지·이벤트', icon: 'bullhorn-outline', route: 'NoticeList' },
];

// 팀 활동 아바타 색 (디자인 HOME의 주황/민트 번갈아)
const ACTIVITY_COLORS = [
  { bg: '#FFE3C2', fg: '#B95E00' },
  { bg: '#D9F6F1', fg: '#0B8574' },
];

// "10분 전", "1시간 전", "3일 전", 일주일 넘으면 "9.28"
function timeAgo(iso: string): string {
  const diffMin = dayjs().diff(dayjs(iso), 'minute');
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return dayjs(iso).format('M.D');
}

export default function HomeDashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [prevSummary, setPrevSummary] = useState<MonthlySummary | null>(null);
  const [latestNotice, setLatestNotice] = useState<NoticeSummary | null>(null);
  const [latestEvent, setLatestEvent] = useState<NoticeSummary | null>(null);
  const [teamActivities, setTeamActivities] = useState<TeamActivity[]>([]);
  const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([]);
  const [quoteCounts, setQuoteCounts] = useState<{ draft: number; sent: number; done: number } | null>(null);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const load = useCallback(async () => {
    try {
      setSummary(await getMonthlySummary(now.getFullYear(), now.getMonth() + 1));
    } catch {
      setSummary(null);
    }
    try {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setPrevSummary(await getMonthlySummary(prev.getFullYear(), prev.getMonth() + 1));
    } catch {
      setPrevSummary(null);
    }
    try {
      const list = await getSchedules(now.getFullYear(), now.getMonth() + 1);
      setTodaySchedules(list.filter(s => s.date === today));
    } catch {
      setTodaySchedules([]);
    }
    try {
      const quotes = await getQuotes();
      setQuoteCounts({
        draft: quotes.filter(q => q.status === 'draft').length,
        sent: quotes.filter(q => q.status === 'sent').length,
        done: quotes.filter(q => q.status === 'approved' || q.status === 'rejected').length,
      });
    } catch {
      setQuoteCounts({ draft: 0, sent: 0, done: 0 });
    }
    try {
      setLatestNotice(await getLatestNotice());
    } catch {
      setLatestNotice(null);
    }
    try {
      setLatestEvent(await getLatestEvent());
    } catch {
      setLatestEvent(null);
    }
    try {
      setTeamActivities(await getTeamActivities());
    } catch {
      setTeamActivities([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totalIncome = parseFloat(summary?.total_income || '0');
  const prevIncome = parseFloat(prevSummary?.total_income || '0');
  // 지난달 수입이 0이면 비율이 의미 없어서(0으로 나눔) 배지를 숨김
  const deltaPercent = prevIncome > 0 ? Math.round(((totalIncome - prevIncome) / prevIncome) * 100) : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xs }]}
    >
      <View style={styles.headerRow}>
        <View style={styles.brandRow}>
          <Image source={ICONS.logo} style={styles.brandLogo} />
          <Text style={styles.brandText}>
            현장<Text style={{ color: colors.primaryDark }}>메이트</Text>
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => navigation.navigate('IncomeList', { year: now.getFullYear(), month: now.getMonth() + 1 })}
      >
        {({ pressed }) => (
          <LinearGradient
            colors={[colors.primaryLight, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.heroCard, pressed && { opacity: 0.92 }]}
          >
            <Text style={styles.heroLabel}>이번 달 수입</Text>
            <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(totalIncome) || '0'}
              <Text style={styles.heroWon}>원</Text>
            </Text>
            {deltaPercent !== null && (
              <View style={styles.heroDeltaRow}>
                <View style={styles.heroDeltaPill}>
                  {deltaPercent !== 0 && (
                    <Icon name={deltaPercent > 0 ? 'arrow-up' : 'arrow-down'} size={13} color="#FFFFFF" />
                  )}
                  <Text style={styles.heroDeltaText}>{Math.abs(deltaPercent)}%</Text>
                </View>
                <Text style={styles.heroDeltaLabel}>지난달 대비</Text>
              </View>
            )}
            <View style={styles.heroBars}>
              {[14, 22, 18, 30, 40].map((h, i) => (
                <View key={i} style={[styles.heroBar, { height: h, opacity: 0.35 + i * 0.12 }]} />
              ))}
            </View>
          </LinearGradient>
        )}
      </Pressable>

      <View style={styles.menuCard}>
        <View style={styles.menuGrid}>
          {MENU_ITEMS.map(item => (
            <Pressable
              key={item.key}
              style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.6 }]}
              onPress={() => navigation.navigate(item.route)}
            >
              <View style={styles.menuIcon}>
                {item.image ? (
                  <Image source={ICONS[item.image]} style={styles.menuImage} />
                ) : (
                  <Icon name={item.icon!} size={24} color={colors.textSecondary} />
                )}
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {latestNotice && (
        <Pressable
          style={({ pressed }) => [styles.noticeStrip, pressed && { opacity: 0.8 }]}
          onPress={() => navigation.navigate('NoticeList')}
        >
          <Image source={ICONS.megaphone} style={styles.noticeStripIcon} />
          <View style={styles.noticeBadge}>
            <Text style={styles.noticeBadgeText}>공지</Text>
          </View>
          <Text style={styles.noticeStripText} numberOfLines={1}>{latestNotice.title}</Text>
          <Icon name="chevron-right" size={16} color={colors.muted} />
        </Pressable>
      )}

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>오늘의 일정</Text>
        <Pressable onPress={() => navigation.navigate('Schedule')} style={styles.sectionMoreRow}>
          <Text style={styles.sectionMore}>전체</Text>
          <Icon name="chevron-right" size={14} color={colors.textSecondary} />
        </Pressable>
      </View>

      {todaySchedules.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>오늘 등록된 일정이 없습니다.</Text>
        </View>
      ) : (
        <View style={styles.listCard}>
          {todaySchedules.map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 && <View style={styles.hairline} />}
              <Pressable
                style={({ pressed }) => [styles.scheduleRow, pressed && { opacity: 0.8 }]}
                onPress={() => navigation.navigate('ScheduleDetail', { id: s.id })}
              >
                <View style={styles.scheduleIcon}>
                  <Icon name="hammer-screwdriver" size={19} color={colors.accentDark} />
                </View>
                <View style={styles.scheduleTextBox}>
                  <Text style={styles.scheduleTitle} numberOfLines={1}>
                    {scheduleLocationLabel(s) || s.work_type_relation?.name || s.work_type || '일정'}
                  </Text>
                  <Text style={styles.scheduleSub} numberOfLines={1}>
                    {scheduleAddress(s) || s.memo || ''}
                  </Text>
                </View>
                <View style={[styles.scheduleTag, { backgroundColor: s.team_id ? '#E8F3FF' : '#F0EBFF' }]}>
                  <Text style={[styles.scheduleTagText, { color: s.team_id ? colors.primaryDark : '#6B4FD8' }]}>
                    {s.team_id ? '팀' : '개인'}
                  </Text>
                </View>
                <Icon name="chevron-right" size={16} color={colors.muted} />
              </Pressable>
            </React.Fragment>
          ))}
        </View>
      )}

      {/* ★ v18.36 — 디자인의 홈 이벤트 배너. 진행중 이벤트가 있을 때만 */}
      {latestEvent && (
        <Pressable
          style={({ pressed }) => [styles.eventCard, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('EventDetail', { id: latestEvent.id })}
        >
          <View style={styles.eventTextBox}>
            <Text style={styles.eventLabel}>
              EVENT{latestEvent.ends_at ? ` · ~${dayjs(latestEvent.ends_at).format('M.DD')}` : ''}
            </Text>
            <Text style={styles.eventTitle} numberOfLines={2}>{latestEvent.title}</Text>
          </View>
          <Image source={ICONS.gift} style={styles.eventImage} />
        </Pressable>
      )}

      {quoteCounts && (
        <>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>견적 현황</Text>
            <Pressable onPress={() => navigation.navigate('QuoteList')} style={styles.sectionMoreRow}>
              <Text style={styles.sectionMore}>전체</Text>
              <Icon name="chevron-right" size={14} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.statRow}>
            <Pressable style={styles.statCard} onPress={() => navigation.navigate('QuoteList')}>
              <Text style={styles.statLabel}>작성중</Text>
              <Text style={[styles.statValue, { color: colors.accentDark }]}>
                {quoteCounts.draft}
                <Text style={styles.statUnit}>건</Text>
              </Text>
            </Pressable>
            <Pressable style={styles.statCard} onPress={() => navigation.navigate('QuoteList')}>
              <Text style={styles.statLabel}>발송</Text>
              <Text style={[styles.statValue, { color: colors.primaryDark }]}>
                {quoteCounts.sent}
                <Text style={styles.statUnit}>건</Text>
              </Text>
            </Pressable>
            <Pressable style={styles.statCard} onPress={() => navigation.navigate('QuoteList')}>
              <Text style={styles.statLabel}>완료</Text>
              <Text style={[styles.statValue, { color: colors.secondary }]}>
                {quoteCounts.done}
                <Text style={styles.statUnit}>건</Text>
              </Text>
            </Pressable>
          </View>
        </>
      )}

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>팀 활동</Text>
        <Pressable onPress={() => navigation.navigate('Team')} style={styles.sectionMoreRow}>
          <Text style={styles.sectionMore}>팀 관리</Text>
          <Icon name="chevron-right" size={14} color={colors.textSecondary} />
        </Pressable>
      </View>
      {/* ★ v18.38 — 실제 팀 활동(일정 추가·팀원 참여) 표시 */}
      {teamActivities.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>최근 팀 활동 내역이 없습니다.</Text>
        </View>
      ) : (
        <View style={styles.listCard}>
          {teamActivities.map((a, i) => {
            const palette = ACTIVITY_COLORS[i % ACTIVITY_COLORS.length];
            return (
              <React.Fragment key={`${a.type}-${a.schedule_id ?? a.team_id}-${a.created_at}`}>
                {i > 0 && <View style={styles.hairline} />}
                <Pressable
                  style={({ pressed }) => [styles.activityRow, pressed && { opacity: 0.8 }]}
                  onPress={() =>
                    a.type === 'schedule' && a.schedule_id
                      ? navigation.navigate('ScheduleDetail', { id: a.schedule_id })
                      : navigation.navigate('TeamDetail', { teamId: a.team_id })
                  }
                >
                  <View style={[styles.activityAvatar, { backgroundColor: palette.bg }]}>
                    <Text style={[styles.activityAvatarText, { color: palette.fg }]}>{a.actor_name.charAt(0)}</Text>
                  </View>
                  <View style={styles.scheduleTextBox}>
                    <Text style={styles.scheduleTitle} numberOfLines={1}>
                      {a.actor_name}님이 {a.type === 'schedule' ? '일정을 추가했어요' : '팀에 참여했어요'}
                    </Text>
                    <Text style={styles.scheduleSub} numberOfLines={1}>{a.team_name} · {timeAgo(a.created_at)}</Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={colors.muted} />
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    marginBottom: spacing.xs,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  brandText: { fontSize: 21, fontWeight: '800', letterSpacing: -0.4, color: colors.textPrimary },

  heroCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    padding: spacing.lg,
    paddingVertical: 18,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
    elevation: 6,
  },
  heroLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  heroAmount: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  heroWon: { fontSize: 18, fontWeight: '700' },
  heroDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 },
  heroDeltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  heroDeltaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  heroDeltaLabel: { color: '#FFFFFF', fontSize: 13 },
  heroBars: {
    position: 'absolute',
    right: 20,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  heroBar: { width: 9, borderRadius: 3, backgroundColor: '#FFFFFF' },

  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    paddingVertical: spacing.md,
    paddingHorizontal: 4,
    marginBottom: spacing.md,
  },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  menuItem: { width: '25%', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  menuIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E3EEFA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#102A56',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  menuImage: { width: 41, height: 41, resizeMode: 'contain' },
  brandLogo: { width: 32, height: 32, resizeMode: 'contain' },
  noticeStripIcon: { width: 24, height: 24, resizeMode: 'contain' },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFF4E5',
    marginBottom: spacing.md,
  },
  eventTextBox: { flex: 1, gap: 4 },
  eventLabel: { fontSize: 12, fontWeight: '700', color: '#B95E00' },
  eventTitle: { fontSize: 15, fontWeight: '800', lineHeight: 21, color: colors.textPrimary },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  activityAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  activityAvatarText: { fontSize: 13, fontWeight: '700' },
  eventImage: { width: 64, height: 64, resizeMode: 'contain' },
  menuLabel: { fontSize: 12, color: colors.textPrimary },

  noticeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  noticeBadge: { height: 24, paddingHorizontal: 9, borderRadius: 7, backgroundColor: '#E8F3FF', justifyContent: 'center' },
  noticeBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  noticeStripText: { flex: 1, minWidth: 0, fontSize: 13, color: colors.textPrimary },

  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionMoreRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  sectionTitle: { ...typography.h2, color: colors.textPrimary },
  sectionMore: { fontSize: 13, color: colors.textSecondary },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderCard,
    marginBottom: spacing.md,
  },
  emptyText: { color: colors.textSecondary, fontSize: 13 },

  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    marginBottom: spacing.md,
  },
  hairline: { height: 1, backgroundColor: colors.borderHairline },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 12 },
  scheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleTextBox: { flex: 1, minWidth: 0, gap: 2 },
  scheduleTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  scheduleSub: { fontSize: 12, color: colors.textSecondary },
  scheduleTag: { height: 24, paddingHorizontal: 9, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  scheduleTagText: { fontSize: 12, fontWeight: '700' },

  statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
  },
  statLabel: { fontSize: 12, color: colors.textSecondary },
  statValue: { fontSize: 20, fontWeight: '800' },
  statUnit: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
});
