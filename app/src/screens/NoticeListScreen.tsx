/**
 * 공지 · 이벤트 목록 — DESIGN-CANVAS 기준, NOTICE_LIST.dc.html
 * 홈 메뉴 "공지·이벤트"와 홈 공지 띠에서 진입.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import { getNotices } from '../api/noticesApi';
import type { NoticeSummary } from '../api/noticesApi';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import { eventStatus, formatEventPeriod, formatNoticeDate, isNewNotice } from '../utils/notice';
import { colors, radius, spacing } from '../theme/designTokens';
import { ICONS } from '../assets/icons';

const TABS = [
  { label: '전체', key: null },
  { label: '공지', key: 'notice' },
  { label: '이벤트', key: 'event' },
] as const;

export default function NoticeListScreen() {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState(0);
  const [items, setItems] = useState<NoticeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getNotices()
        .then(setItems)
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, []),
  );

  const key = TABS[tab].key;
  const events = items.filter(n => n.type === 'event' && (!key || key === 'event'));
  const notices = items.filter(n => n.type === 'notice' && (!key || key === 'notice'));

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="공지 · 이벤트" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tabRow}>
          {TABS.map((t, i) => (
            <Pressable key={t.label} style={[styles.tabBtn, tab === i && styles.tabBtnOn]} onPress={() => setTab(i)}>
              <Text style={[styles.tabText, tab === i && styles.tabTextOn]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : events.length === 0 && notices.length === 0 ? (
          <View style={styles.emptyBox}>
            <Icon name="bullhorn-outline" size={40} color={colors.muted} />
            <Text style={styles.emptyText}>등록된 {key === 'event' ? '이벤트가' : key === 'notice' ? '공지가' : '공지·이벤트가'} 없어요.</Text>
          </View>
        ) : (
          <>
            {events.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>이벤트</Text>
                {events.map(e => {
                  const status = eventStatus(e.starts_at, e.ends_at);
                  const on = status !== '종료';
                  return (
                    <Pressable
                      key={e.id}
                      style={[styles.eventCard, !on && { opacity: 0.55 }]}
                      onPress={() => navigation.navigate('EventDetail', { id: e.id })}
                    >
                      {e.banner_path ? (
                        <Image source={{ uri: `${SERVER_BASE_URL}/storage/${e.banner_path}` }} style={styles.eventThumb} />
                      ) : (
                        <View style={[styles.eventThumb, styles.eventThumbFallback]}>
                          <Image source={ICONS.gift} style={styles.eventThumbIcon} />
                        </View>
                      )}
                      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                        <View style={styles.badgeRow}>
                          <View style={[styles.statusBadge, { backgroundColor: on ? '#FFF2E2' : '#EEF2F7' }]}>
                            <Text style={[styles.statusText, { color: on ? '#B95E00' : colors.textSecondary }]}>{status}</Text>
                          </View>
                          {isNewNotice(e.published_at) && <Text style={styles.newMark}>N</Text>}
                        </View>
                        <Text style={styles.eventTitle} numberOfLines={2}>{e.title}</Text>
                        <Text style={styles.metaText}>{formatEventPeriod(e.starts_at, e.ends_at)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {notices.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>공지사항</Text>
                <View style={styles.noticeCard}>
                  {notices.map((n, i) => (
                    <Pressable
                      key={n.id}
                      style={[styles.noticeRow, i === notices.length - 1 && { borderBottomWidth: 0 }]}
                      onPress={() => navigation.navigate('NoticeDetail', { id: n.id })}
                    >
                      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                        <View style={styles.badgeRow}>
                          {n.is_pinned && (
                            <View style={[styles.statusBadge, { backgroundColor: '#FFF2E2' }]}>
                              <Text style={[styles.statusText, { color: '#B95E00' }]}>중요</Text>
                            </View>
                          )}
                          <Text style={styles.metaText}>{formatNoticeDate(n.published_at)}</Text>
                          {isNewNotice(n.published_at) && <Text style={styles.newMark}>N</Text>}
                        </View>
                        <Text style={styles.noticeTitle}>{n.title}</Text>
                      </View>
                      <Icon name="chevron-right" size={16} color="#8FA3BF" />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xl, gap: 14 },

  tabRow: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: '#EEF5FD', borderRadius: 12 },
  tabBtn: { flex: 1, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  tabBtnOn: { backgroundColor: '#FFFFFF', borderColor: '#CFE3FA' },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  tabTextOn: { fontWeight: '700', color: colors.primaryDark },

  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },

  eventCard: {
    flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderCard, borderRadius: 14,
  },
  eventThumb: { width: 76, height: 64, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  eventThumbFallback: { backgroundColor: '#FFF4E5' },
  eventThumbIcon: { width: 46, height: 46, resizeMode: 'contain' },
  eventTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },

  badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  statusBadge: { height: 22, paddingHorizontal: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  statusText: { fontSize: 11, fontWeight: '700' },
  newMark: { fontSize: 11, fontWeight: '800', color: colors.accent },
  metaText: { fontSize: 12, color: colors.textSecondary },

  noticeCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16 },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  noticeTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, lineHeight: 20 },

  emptyBox: { alignItems: 'center', gap: spacing.sm, paddingVertical: 60 },
  emptyText: { fontSize: 14, color: colors.textSecondary },
});
