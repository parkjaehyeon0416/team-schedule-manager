/**
 * 월별 세무자료 화면 — DESIGN-CANVAS 기준, TAX_MONTH_DETAIL.dc.html
 * 2026-10-02: Schedule에 employment_type이 추가되어 "일용근로/프리랜서(3.3%)" 비율 바를
 * 디자인대로 구현함(이 달 수입 일정들을 고용형태별 금액으로 집계).
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { getTaxSummary } from '../api/taxSummaryApi';
import { getSchedules } from '../api/schedulesApi';
import AppHeader from '../components/AppHeader';
import type { Schedule, TaxMonthRow } from '../types/api';
import { formatMoney } from '../utils/format';
import { colors, radius, spacing } from '../theme/designTokens';
import { scheduleLocationLabel } from '../utils/scheduleLocation';

const ICON_BG = ['#FFF1DE', '#DFF8F4', '#EFEAFF', '#E8F3FF'];
const ICON_FG = ['#E07E00', '#0B9C8A', '#6B4FD8', '#0A6CE0'];

export default function TaxMonthDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const year: number = route.params.year;
  const month: number = route.params.month;
  const [row, setRow] = useState<TaxMonthRow | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getTaxSummary(year), getSchedules(year, month)])
      .then(([summary, list]) => {
        setRow(summary.months.find(m => m.month === month) ?? null);
        setSchedules(list.filter(s => Number(s.daily_wage ?? 0) > 0).sort((a, b) => b.date.localeCompare(a.date)));
      })
      .finally(() => setLoading(false));
  }, [year, month]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title={`${year}년 ${month}월`} onBackPress={() => navigation.navigate('TaxSummary')} />
        <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title={`${year}년 ${month}월`} onBackPress={() => navigation.navigate('TaxSummary')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{year}년 {month}월 총 수입</Text>
          <Text style={styles.summaryValue}>{formatMoney(row?.total_income ?? 0)}원</Text>
        </View>

        {schedules.length > 0 && (() => {
          const dailyAmount = schedules.filter(s => s.employment_type !== 'freelance').reduce((sum, s) => sum + (Number(s.daily_wage) || 0), 0);
          const freelanceAmount = schedules.filter(s => s.employment_type === 'freelance').reduce((sum, s) => sum + (Number(s.daily_wage) || 0), 0);
          const total = dailyAmount + freelanceAmount;
          const dailyPct = total > 0 ? Math.round((dailyAmount / total) * 100) : 0;
          return (
            <View style={styles.ratioCard}>
              <Text style={styles.sectionTitle}>일용근로 / 프리랜서(3.3%) 비율</Text>
              <View style={styles.ratioBarTrack}>
                <View style={[styles.ratioBarFill, { width: `${dailyPct}%` }]} />
              </View>
              <View style={styles.ratioLegendRow}>
                <Text style={styles.ratioLegendText}>일용근로 {dailyPct}% ({formatMoney(dailyAmount)}원)</Text>
                <Text style={styles.ratioLegendText}>프리랜서 {100 - dailyPct}% ({formatMoney(freelanceAmount)}원)</Text>
              </View>
            </View>
          );
        })()}

        <View style={styles.infoCard}>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>총 경비</Text><Text style={styles.infoValue}>{formatMoney(row?.total_expenses ?? 0)}원</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>예상 원천세</Text><Text style={styles.infoValue}>{formatMoney(row?.estimated_tax ?? 0)}원 (참고)</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>실수령액</Text><Text style={styles.infoValue}>{formatMoney(row?.net_income ?? 0)}원</Text></View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}><Text style={styles.infoLabel}>작업 일수</Text><Text style={styles.infoValue}>{row?.work_days ?? 0}일</Text></View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>원본 내역</Text>
          <Pressable onPress={() => navigation.navigate('IncomeList', { year, month })}>
            <Text style={styles.sectionLink}>수입 보기 ›</Text>
          </Pressable>
        </View>
        <View style={styles.listCard}>
          {schedules.length === 0 ? (
            <Text style={styles.emptyText}>이 달에 수입으로 집계된 일정이 없어요.</Text>
          ) : (
            schedules.map((s, i) => {
              const bg = ICON_BG[i % ICON_BG.length];
              const fg = ICON_FG[i % ICON_FG.length];
              const siteLabel = scheduleLocationLabel(s) || s.work_type || s.district || '현장 미지정';
              return (
                <Pressable
                  key={s.id}
                  style={[styles.row, i === schedules.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => navigation.navigate('ScheduleDetail', { id: s.id })}
                >
                  <View style={[styles.rowIcon, { backgroundColor: bg }]}><Icon name="currency-krw" size={17} color={fg} /></View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{siteLabel}</Text>
                    <Text style={styles.rowSub}>{s.date.slice(5).replace('-', '.')}</Text>
                  </View>
                  <Text style={styles.rowAmount}>{formatMoney(s.daily_wage)}원</Text>
                </Pressable>
              );
            })
          )}
        </View>

        <View style={styles.hintBox}>
          <Icon name="information-outline" size={16} color={colors.accentDark} />
          <Text style={styles.hintText}>세무 자료는 계산 참고용이에요. 신고는 홈택스 또는 세무사를 통해 별도로 진행해주세요.</Text>
        </View>

        <Pressable onPress={() => navigation.navigate('TaxExport', { year, month })}>
          <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.exportBtn}>
            <Icon name="tray-arrow-down" size={18} color="#FFFFFF" />
            <Text style={styles.exportBtnText}>이 달 자료 내보내기</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },

  summaryCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 16, gap: 6 },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },

  infoCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16 },
  ratioCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 16, gap: 8 },
  ratioBarTrack: { height: 8, borderRadius: 4, backgroundColor: '#F0EBFF', overflow: 'hidden' },
  ratioBarFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  ratioLegendRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ratioLegendText: { fontSize: 12, color: colors.textSecondary },
  infoRow: { flexDirection: 'row', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  infoLabel: { width: 88, fontSize: 13, color: colors.textSecondary },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textPrimary },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  sectionLink: { fontSize: 13, color: colors.textSecondary },
  listCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, paddingVertical: 20, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary },
  rowAmount: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },

  hintBox: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: colors.warningBg, borderRadius: radius.md, alignItems: 'flex-start' },
  hintText: { flex: 1, fontSize: 13, color: colors.accentDark, lineHeight: 18 },

  exportBtn: { height: 52, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  exportBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
