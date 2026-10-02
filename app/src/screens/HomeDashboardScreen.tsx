/**
 * 홈 대시보드 화면 — v18.31 (DESIGN-CANVAS 기준, HOME.dc.html 1:1)
 * 하단 탭 '홈' — 이번 달 수입 카드 + 메뉴 그리드 + 오늘의 일정 + 견적 현황 + 팀 활동
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { getMonthlySummary, getSchedules } from '../api/schedulesApi';
import { getQuotes } from '../api/quoteApi';
import { getNotifications } from '../api/notificationsApi';
import type { MonthlySummary, Schedule } from '../types/api';
import { formatShortKRW } from '../utils/format';
import { colors, radius, spacing, typography } from '../theme/designTokens';

const MENU_ITEMS: { key: string; label: string; icon: string; bg: string; fg: string; route: string }[] = [
  { key: 'schedule', label: '일정', icon: 'calendar-month-outline', bg: '#E8F3FF', fg: colors.primaryDark, route: 'Schedule' },
  { key: 'income', label: '내수입', icon: 'currency-krw', bg: colors.warningBg, fg: colors.accentDark, route: 'IncomeList' },
  { key: 'team', label: '팀관리', icon: 'account-group-outline', bg: '#E8F3FF', fg: colors.primaryDark, route: 'Team' },
  { key: 'quote', label: '견적서', icon: 'file-document-edit-outline', bg: colors.successBg, fg: colors.secondary, route: 'QuoteList' },
  { key: 'card', label: '내 명함', icon: 'card-account-details-outline', bg: '#E8F3FF', fg: colors.primaryDark, route: 'BusinessCard' },
  { key: 'tax', label: '세무 자료', icon: 'receipt', bg: colors.warningBg, fg: colors.accentDark, route: 'TaxSummary' },
  { key: 'site', label: '현장 목록', icon: 'map-marker-outline', bg: colors.successBg, fg: colors.secondary, route: 'SiteList' },
  { key: 'more', label: '더보기', icon: 'dots-horizontal', bg: '#EEF2F7', fg: colors.textSecondary, route: 'Profile' },
];

export default function HomeDashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [prevSummary, setPrevSummary] = useState<MonthlySummary | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
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
      setUnreadCount((await getNotifications()).unread_count);
    } catch {
      setUnreadCount(0);
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
          <Icon name="home-city-outline" size={26} color={colors.primary} />
          <Text style={styles.brandText}>
            Work<Text style={{ color: colors.primaryDark }}>Mate</Text>
          </Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Notifications')} hitSlop={8} style={styles.bellBtn}>
          <Icon name="bell-outline" size={23} color={colors.textPrimary} />
          {unreadCount > 0 && <View style={styles.bellDot} />}
        </Pressable>
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
            <Text style={styles.heroAmount}>
              {formatShortKRW(totalIncome)}
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
              <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                <Icon name={item.icon} size={22} color={item.fg} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

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
                    {s.site?.apt_name || s.work_type_relation?.name || s.work_type || '일정'}
                  </Text>
                  <Text style={styles.scheduleSub} numberOfLines={1}>
                    {s.site?.address || s.memo || ''}
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
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>최근 팀 활동 내역이 없습니다.</Text>
      </View>
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
  bellBtn: { padding: 4 },
  bellDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.background,
  },

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
  menuIcon: { width: 52, height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 12, color: colors.textPrimary },

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
