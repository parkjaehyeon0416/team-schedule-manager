/**
 * 세무 자료 화면 — DESIGN-CANVAS 기준, TAX_HOME.dc.html
 * "현장별 수입 내역"은 IncomeListScreen(현장별 탭)으로 연결됨.
 * "세금계산서/지급명세서 자료(엑셀)"는 TaxExportScreen에서 CSV로 실제 생성됨(2026-10-02, PDF는 제외).
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Modal, FlatList } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import { getTaxSummary } from '../api/taxSummaryApi';
import type { TaxSummary } from '../types/api';
import { formatMoney } from '../utils/format';
import { colors, radius, spacing } from '../theme/designTokens';

export default function TaxHomeScreen() {
  const navigation = useNavigation<any>();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TaxSummary | null>(null);

  const load = useCallback((y: number) => {
    setLoading(true);
    getTaxSummary(y).then(setSummary).catch(() => setSummary(null)).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(year); }, [load, year]));

  const maxBarIncome = useMemo(() => Math.max(1, ...(summary?.months.map(m => m.total_income) ?? [1])), [summary]);
  const recentMonths = useMemo(() => (summary?.months ?? []).filter(m => m.total_income > 0).slice(-3).reverse(), [summary]);
  const yearOptions = useMemo(() => Array.from({ length: 6 }, (_, i) => now.getFullYear() - i), [now]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="세무 자료" />
        <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  const menuItems = [
    { key: 'month', icon: 'calendar-month-outline', bg: '#E8F3FF', fg: colors.primaryDark, title: '월별 수입 내역', sub: '12개월 · 월 상세 보기', onPress: () => navigation.navigate('TaxMonthDetail', { year, month: now.getFullYear() === year ? now.getMonth() + 1 : 12 }) },
    { key: 'site', icon: 'map-marker-outline', bg: '#DFF8F4', fg: colors.secondary, title: '현장별 수입 내역', sub: '현장별로 모아보기', onPress: () => navigation.navigate('IncomeList', { year, tab: '현장별' }) },
    { key: 'tax_excel', icon: 'file-document-outline', bg: '#FFF1DE', fg: colors.accentDark, title: '세금계산서 자료 (엑셀)', sub: '수입 · 공수 · 단가', onPress: () => navigation.navigate('TaxExport', { year }) },
    { key: 'pay_excel', icon: 'tray-arrow-down', bg: '#EFEAFF', fg: '#6B4FD8', title: '지급명세서 자료 (엑셀)', sub: '일용 · 프리랜서 구분', onPress: () => navigation.navigate('TaxExport', { year }) },
  ];

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="세무 자료" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.yearBtn} onPress={() => setYearPickerVisible(true)}>
          <Text style={styles.yearBtnText}>{year}년</Text>
          <Icon name="chevron-down" size={16} color={colors.primaryDark} />
        </Pressable>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>연간 수입 합계</Text>
          <Text style={styles.summaryValue}>{formatMoney(summary?.totals.total_income ?? 0)}원</Text>
          <View style={styles.barRow}>
            {(summary?.months ?? []).map((m, i) => (
              <View
                key={m.year_month}
                style={[
                  styles.bar,
                  { height: Math.max(4, (m.total_income / maxBarIncome) * 64) },
                  i === (summary?.months.length ?? 1) - 1 && styles.barActive,
                ]}
              />
            ))}
          </View>
          <View style={styles.summaryStatsRow}>
            <View style={{ gap: 2 }}>
              <Text style={styles.summaryStatLabel}>예상 원천세</Text>
              <Text style={styles.summaryStatValue}>{formatMoney(summary?.totals.estimated_tax ?? 0)}원</Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={styles.summaryStatLabel}>작업 일수</Text>
              <Text style={styles.summaryStatValue}>{summary?.totals.work_days ?? 0}일</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <Pressable key={item.key} style={[styles.menuRow, i === menuItems.length - 1 && { borderBottomWidth: 0 }]} onPress={item.onPress}>
              <View style={[styles.menuIcon, { backgroundColor: item.bg }]}><Icon name={item.icon} size={18} color={item.fg} /></View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        {recentMonths.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>월별 자료</Text>
            <View style={styles.menuCard}>
              {recentMonths.map((m, i) => (
                <Pressable
                  key={m.year_month}
                  style={[styles.monthRow, i === recentMonths.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => navigation.navigate('TaxMonthDetail', { year, month: m.month })}
                >
                  <Text style={styles.monthLabel}>{m.month}월</Text>
                  <View style={styles.monthValueRow}>
                    <Text style={styles.monthValue}>{formatMoney(m.total_income)}원</Text>
                    <Icon name="chevron-right" size={14} color={colors.muted} />
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View style={styles.hintBox}>
          <Icon name="information-outline" size={16} color={colors.accentDark} />
          <Text style={styles.hintText}>세무 자료는 계산 참고용이에요. 신고는 홈택스 또는 세무사를 통해 별도로 진행해주세요.</Text>
        </View>
      </ScrollView>

      <Modal visible={yearPickerVisible} animationType="fade" transparent onRequestClose={() => setYearPickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setYearPickerVisible(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>연도 선택</Text>
          <FlatList
            data={yearOptions}
            keyExtractor={y => String(y)}
            renderItem={({ item: y }) => (
              <Pressable style={styles.modalRow} onPress={() => { setYear(y); setYearPickerVisible(false); }}>
                <Text style={[styles.modalRowText, y === year && { color: colors.primaryDark, fontWeight: '700' }]}>{y}년</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xl, gap: spacing.md },

  yearBtn: { alignSelf: 'flex-start', height: 40, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: '#EAF3FE', flexDirection: 'row', alignItems: 'center', gap: 6 },
  yearBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },

  summaryCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 16, gap: 8 },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  barRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 64 },
  bar: { flex: 1, borderRadius: 4, backgroundColor: '#9FD0FF', opacity: 0.8 },
  barActive: { backgroundColor: colors.primaryDark, opacity: 1 },
  summaryStatsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.borderHairline },
  summaryStatLabel: { fontSize: 12, color: colors.textSecondary },
  summaryStatValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },

  menuCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  menuSub: { fontSize: 12, color: colors.textSecondary },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  monthLabel: { fontSize: 14, color: colors.textPrimary },
  monthValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },

  hintBox: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: colors.warningBg, borderRadius: radius.md, alignItems: 'flex-start' },
  hintText: { flex: 1, fontSize: 13, color: colors.accentDark, lineHeight: 18 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,42,86,0.4)' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, maxHeight: '60%' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  modalRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  modalRowText: { fontSize: 15, color: colors.textPrimary, textAlign: 'center' },
});
