/**
 * 알림 화면 — DESIGN-CANVAS 기준, NOTIFICATIONS.dc.html
 * 2026-10-02: 알림 피드 백엔드(app_notifications 테이블 + API) 신규 추가로 실제 데이터 연동함.
 * 적재 트리거는 "팀 일정 추가" / "팀원 참여" / "견적서 발송" 3가지 — 세무 자료 알림(월별 자동
 * 생성)은 스케줄러(cron)가 아직 없어 제외(SERVER_SETUP_NCP.md 미완료 항목과 동일한 제약).
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notificationsApi';
import type { AppNotification } from '../api/notificationsApi';
import { colors, radius, spacing, typography } from '../theme/designTokens';

const TABS: { label: string; category?: AppNotification['category'] }[] = [
  { label: '전체' },
  { label: '일정', category: 'schedule' },
  { label: '팀', category: 'team' },
  { label: '견적', category: 'quote' },
];

const CATEGORY_STYLE: Record<string, { bg: string; fg: string; icon: string }> = {
  schedule: { bg: '#E8F3FF', fg: colors.primaryDark, icon: 'calendar-month-outline' },
  team: { bg: '#FFF1DE', fg: '#E07E00', icon: 'account-group-outline' },
  quote: { bg: '#DFF8F4', fg: '#0B9C8A', icon: 'file-document-outline' },
  tax: { bg: '#EFEAFF', fg: '#6B4FD8', icon: 'chart-box-outline' },
};

function timeAgo(dateStr: string): string {
  const d = dayjs(dateStr);
  const mins = dayjs().diff(d, 'minute');
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = dayjs().diff(d, 'hour');
  if (hours < 24) return `${hours}시간 전`;
  if (dayjs().diff(d, 'day') === 1) return '어제';
  return d.format('M.D');
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback((category?: AppNotification['category']) => {
    getNotifications(category)
      .then(feed => {
        setItems(feed.items);
        setUnreadCount(feed.unread_count);
      })
      .catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { load(TABS[tab].category); }, [load, tab]));

  const handlePress = async (n: AppNotification) => {
    if (!n.is_read) {
      markNotificationRead(n.id).catch(() => {});
      setItems(prev => prev.map(i => (i.id === n.id ? { ...i, is_read: true } : i)));
      setUnreadCount(c => Math.max(0, c - 1));
    }
    if (n.link_type === 'schedule' && n.link_id) navigation.navigate('ScheduleDetail', { id: n.link_id });
    else if (n.link_type === 'team' && n.link_id) navigation.navigate('TeamDetail', { teamId: n.link_id });
    else if (n.link_type === 'quote' && n.link_id) navigation.navigate('QuoteDetail', { quoteId: n.link_id });
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems(prev => prev.map(i => ({ ...i, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>알림</Text>
        <Pressable onPress={() => navigation.navigate('NotificationSettings')} hitSlop={8}>
          <Icon name="cog-outline" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t, i) => (
          <Pressable
            key={t.label}
            style={[styles.tabChip, tab === i && styles.tabChipActive]}
            onPress={() => setTab(i)}
          >
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {items.length > 0 && (
        <View style={styles.countRow}>
          <Text style={styles.countText}>새 알림 {unreadCount}개</Text>
          <Pressable onPress={handleMarkAll}><Text style={styles.markAllText}>모두 읽음</Text></Pressable>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={n => String(n.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Icon name="bell-off-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyText}>새로운 알림이 없어요.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const style = CATEGORY_STYLE[item.category] ?? CATEGORY_STYLE.schedule;
          return (
            <Pressable style={[styles.row, item.is_read ? styles.rowRead : styles.rowUnread]} onPress={() => handlePress(item)}>
              <View style={[styles.rowIcon, { backgroundColor: style.bg }]}>
                <Icon name={style.icon} size={20} color={style.fg} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={styles.rowTopLine}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowTime}>{timeAgo(item.created_at)}</Text>
                </View>
                <Text style={styles.rowBody}>{item.body}</Text>
              </View>
              {!item.is_read && <View style={styles.unreadDot} />}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { ...typography.h2, color: colors.textPrimary },

  tabRow: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: spacing.lg,
    padding: 3,
    borderRadius: radius.sm,
    backgroundColor: '#EEF5FD',
  },
  tabChip: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 9 },
  tabChipActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: '#CFE3FA' },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  tabTextActive: { color: colors.primaryDark, fontWeight: '700' },

  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  countText: { fontSize: 13, color: colors.textSecondary },
  markAllText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark, paddingVertical: 6 },

  listContent: { padding: spacing.lg, gap: 10, flexGrow: 1 },
  row: {
    flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderCard,
  },
  rowUnread: { backgroundColor: '#F3F9FF' },
  rowRead: { backgroundColor: colors.surface },
  rowIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowTopLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  rowTime: { fontSize: 12, color: colors.textSecondary },
  rowBody: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, marginTop: 4 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: 80 },
  emptyText: { color: colors.textSecondary, fontSize: 13 },
});
