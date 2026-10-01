/**
 * 현장 목록 화면 — DESIGN-CANVAS 기준, SITE_LIST.dc.html
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import AppHeader from '../components/AppHeader';
import { getSites } from '../api/siteApi';
import { getMyTeams } from '../api/teamApi';
import type { Site, Team } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';

const TABS = [
  { key: 'all', label: '전체' },
  { key: 'in_progress', label: '진행중' },
  { key: 'done', label: '완료' },
] as const;

const STATUS_CHIP: Record<string, { label: string; bg: string; fg: string }> = {
  scheduled: { label: '예정', bg: '#EEF2F7', fg: colors.textSecondary },
  in_progress: { label: '진행중', bg: '#E8F3FF', fg: colors.primaryDark },
  done: { label: '완료', bg: '#E2F8F4', fg: colors.secondary },
};

export default function SiteListScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getSites(), getMyTeams().catch(() => [])])
      .then(([s, t]) => { setSites(s); setTeams(t); })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sites.filter(s => {
      if (tab !== 'all' && (s.status ?? 'scheduled') !== tab) return false;
      if (!q) return true;
      return [s.apt_name, s.address, s.dong, s.ho].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [sites, query, tab]);

  return (
    <View style={styles.screen}>
      <AppHeader
        leftType="back"
        title="현장 목록"
        rightContent={
          <Pressable onPress={() => navigation.navigate('SiteCreate')} style={styles.headerRightBtn}>
            <Icon name="plus" size={22} color={colors.textPrimary} />
          </Pressable>
        }
      />
      <View style={styles.content}>
        <View style={styles.tabRow}>
          {TABS.map(t => {
            const on = t.key === tab;
            return (
              <Pressable key={t.key} style={[styles.tabBtn, on && styles.tabBtnOn]} onPress={() => setTab(t.key)}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.searchWrap}>
          <Icon name="magnify" size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="현장명으로 검색"
            placeholderTextColor={colors.muted}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={s => String(s.id)}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>해당하는 현장이 없어요.</Text>
                <Pressable onPress={() => navigation.navigate('SiteCreate')}>
                  <Text style={styles.emptyLink}>+ 현장 등록</Text>
                </Pressable>
              </View>
            )
          }
          renderItem={({ item }) => {
            const title = item.apt_name || item.address;
            const team = teams.find(t => t.id === item.team_id);
            const period = item.start_date
              ? `${dayjs(item.start_date).format('YYYY.MM.DD')}${item.end_date ? ` - ${dayjs(item.end_date).format('MM.DD')}` : ''}`
              : null;
            const sub2 = [item.address, team?.name].filter(Boolean).join(' · ');
            const chip = STATUS_CHIP[item.status ?? 'scheduled'];
            return (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                onPress={() => navigation.navigate('SiteDetail', { siteId: item.id })}
              >
                <View style={styles.thumb}>
                  <Icon name="home-city-outline" size={24} color="#7F95B2" />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
                  {!!period && <Text style={styles.rowSub} numberOfLines={1}>{period}</Text>}
                  {!!sub2 && <Text style={styles.rowSub} numberOfLines={1}>{sub2}</Text>}
                </View>
                <View style={[styles.statusTag, { backgroundColor: chip.bg }]}>
                  <Text style={[styles.statusTagText, { color: chip.fg }]}>{chip.label}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, paddingTop: spacing.xs, gap: spacing.sm },
  headerRightBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  tabRow: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: '#EEF5FD', borderRadius: 12 },
  tabBtn: { flex: 1, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabBtnOn: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  tabTextOn: { fontWeight: '700', color: colors.primaryDark },

  searchWrap: { height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },

  emptyBox: { padding: 32, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: radius.lg, marginTop: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  emptyLink: { marginTop: 10, fontWeight: '700', color: colors.primaryDark },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.md },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#E9F1FA', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary },
  statusTag: { height: 24, paddingHorizontal: 9, borderRadius: 7, alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center' },
  statusTagText: { fontSize: 12, fontWeight: '700' },
});
