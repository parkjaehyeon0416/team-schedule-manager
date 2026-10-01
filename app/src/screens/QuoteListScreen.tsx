/**
 * 견적서 관리(목록) 화면 — DESIGN-CANVAS 기준, ESTIMATE_LIST.dc.html
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import { getQuotes } from '../api/quoteApi';
import type { Quote } from '../types/api';
import { formatMoney } from '../utils/format';
import { colors, radius, spacing } from '../theme/designTokens';

const TABS: { key: 'all' | Quote['status']; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'draft', label: '작성중' },
  { key: 'sent', label: '발송' },
  { key: 'approved', label: '완료' },
];

const CHIP: Record<Quote['status'], { bg: string; fg: string; label: string }> = {
  draft: { bg: '#FFF2E2', fg: '#B95E00', label: '작성중' },
  sent: { bg: '#E8F3FF', fg: '#0A6CE0', label: '발송' },
  approved: { bg: '#E2F8F4', fg: '#0B8574', label: '완료' },
  rejected: { bg: '#FFF2F2', fg: '#E5484D', label: '반려' },
};

export default function QuoteListScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all');
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setQuotes(await getQuotes());
    } catch {
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const list = useMemo(
    () => (tab === 'all' ? quotes : quotes.filter(q => q.status === tab)),
    [quotes, tab],
  );

  return (
    <View style={styles.screen}>
      <AppHeader
        leftType="back"
        title="견적서 관리"
        rightContent={
          <Pressable onPress={() => navigation.navigate('QuoteCreate')} style={styles.headerRightBtn}>
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

        <FlatList
          data={list}
          keyExtractor={q => String(q.id)}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>해당 상태의 견적서가 없어요.</Text>
                <Pressable onPress={() => navigation.navigate('QuoteCreate')}>
                  <Text style={styles.emptyLink}>+ 견적서 작성</Text>
                </Pressable>
              </View>
            )
          }
          renderItem={({ item }) => {
            const chip = CHIP[item.status];
            return (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                onPress={() => navigation.navigate('QuoteDetail', { quoteId: item.id })}
              >
                <View style={[styles.icon, { backgroundColor: chip.bg }]}>
                  <Icon name="file-document-outline" size={20} color={chip.fg} />
                </View>
                <View style={styles.rowTextBox}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{item.client_name ? `${item.client_name} 고객` : '견적서'}{item.address ? ` · ${item.address}` : ''}</Text>
                  <Text style={styles.rowAmount}>{formatMoney(item.total_amount)}원</Text>
                  <Text style={styles.rowSub}>{item.client_name ?? '고객명 미입력'} · {item.desired_date ?? '일정 미정'}</Text>
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

  tabRow: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: '#EEF5FD', borderRadius: 12 },
  tabBtn: { flex: 1, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabBtnOn: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  tabTextOn: { fontWeight: '700', color: colors.primaryDark },

  emptyBox: { padding: 32, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: radius.lg, marginTop: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  emptyLink: { marginTop: 10, fontWeight: '700', color: colors.primaryDark },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg,
  },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTextBox: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  rowAmount: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary },
  statusTag: { height: 24, paddingHorizontal: 9, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  statusTagText: { fontSize: 12, fontWeight: '700' },
  headerRightBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
