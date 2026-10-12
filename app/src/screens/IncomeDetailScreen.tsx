/**
 * 수입 상세 화면 — DESIGN-CANVAS 기준, INCOME_DETAIL.dc.html
 * 2026-10-02: Schedule에 employment_type/payment_status를 추가해 "지급 완료" 배지와
 * "세무 추정"(원천세/실수령 per건)을 디자인대로 구현함. 원천세는 참고용 추정치.
 * ★ v18.66: 계산은 utils/tax.ts(서버와 같은 식)로 — 소득세 + 지방소득세(10%), 소액부징수 적용, 내역 줄 표시.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { getScheduleById, deleteSchedule } from '../api/schedulesApi';
import AppHeader from '../components/AppHeader';
import type { Schedule } from '../types/api';
import { formatMoney, formatWorkUnits } from '../utils/format';
import { colors, radius, spacing } from '../theme/designTokens';
import { scheduleLocationLabel } from '../utils/scheduleLocation';
import { estimateWithholding, TAX_NOTE } from '../utils/tax';

export default function IncomeDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const scheduleId: number = route.params.scheduleId;
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getScheduleById(scheduleId).then(setSchedule).catch(() => setSchedule(null)).finally(() => setLoading(false));
  }, [scheduleId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = () => {
    Alert.alert('일정 삭제', '이 일정을 삭제할까요? 수입 내역에서도 사라집니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSchedule(scheduleId);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('삭제 실패', e?.response?.data?.message || '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  if (loading || !schedule) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="수입 상세" />
        <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  const siteLabel = scheduleLocationLabel(schedule);
  const wage = Number(schedule.daily_wage) || 0;
  const units = Number(schedule.work_units) || 1;
  const income = wage * units;
  // ★ v18.66 — 서버 MonthlySummaryService.taxBreakdown과 같은 식(utils/tax.ts)
  const isFreelance = schedule.employment_type === 'freelance';
  const tax = estimateWithholding(wage, units, schedule.employment_type);
  const withholdingTax = tax.total;
  const netIncome = income - withholdingTax;
  // 0원인 이유 안내: 소액부징수 / 일용근로 하루 15만원 공제
  const zeroReason = tax.exempt
    ? '소액부징수(1,000원 미만)로 0원'
    : !isFreelance && tax.total === 0
      ? '일용근로는 하루 지급액 15만원까지 공제돼 0원'
      : null;
  const isPaid = schedule.payment_status === 'paid';

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="수입 상세" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerIcon}><Icon name="currency-krw" size={28} color={colors.secondary} /></View>
          <Text style={styles.headerTitle}>{schedule.memo || schedule.work_type_relation?.name || '일정'}</Text>
          <Text style={styles.headerAmount}>{formatMoney(income)}원</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, isPaid ? styles.badgePaid : styles.badgePending]}>
              <Text style={[styles.badgeText, isPaid ? styles.badgeTextPaid : styles.badgeTextPending]}>
                {isPaid ? '지급 완료' : '미지급'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>작업 정보</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>일자</Text><Text style={styles.infoValue}>{dayjs(schedule.date).format('YYYY년 M월 D일 (ddd)')}</Text></View>
          {!!siteLabel && (
            <Pressable style={styles.infoRow} onPress={() => navigation.navigate('SiteDetail', { siteId: schedule.site_id })}>
              <Text style={styles.infoLabel}>현장</Text>
              <Text style={[styles.infoValue, styles.infoLink]}>{siteLabel} ›</Text>
            </Pressable>
          )}
          <View style={styles.infoRow}><Text style={styles.infoLabel}>공정</Text><Text style={styles.infoValue}>{schedule.work_type_relation?.name ?? schedule.work_type ?? '-'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>공수</Text><Text style={styles.infoValue}>{formatWorkUnits(schedule.work_units)}공수</Text></View>
          {!!schedule.area_m2 && (
            <View style={styles.infoRow}><Text style={styles.infoLabel}>평수</Text><Text style={styles.infoValue}>{schedule.area_m2}㎡</Text></View>
          )}
          {Number(schedule.expenses) > 0 && (
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}><Text style={styles.infoLabel}>경비</Text><Text style={styles.infoValue}>{formatMoney(schedule.expenses)}원{schedule.expenses_memo ? ` (${schedule.expenses_memo})` : ''}</Text></View>
          )}
        </View>

        {income > 0 && (
          <View style={styles.infoCard}>
            <View style={styles.taxHeaderRow}>
              <Text style={styles.sectionTitle}>세무 추정</Text>
              <View style={styles.refBadge}><Text style={styles.refBadgeText}>참고용</Text></View>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, styles.taxLabel]}>구분</Text>
              <Text style={styles.infoValue}>{isFreelance ? '프리랜서(3.3%)' : '일용근로'}</Text>
            </View>
            {/* ★ v18.66 — 소득세 / 지방소득세 내역 */}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, styles.taxLabel]}>소득세</Text>
              <Text style={styles.infoValue}>{formatMoney(tax.incomeTax)}원</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, styles.taxLabel]}>지방소득세</Text>
              <Text style={styles.infoValue}>{formatMoney(tax.localTax)}원 (소득세의 10%)</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, styles.taxLabel]}>원천세(추정)</Text>
              <View style={styles.taxValueCol}>
                <Text style={styles.infoValue}>{formatMoney(withholdingTax)}원</Text>
                {!!zeroReason && <Text style={styles.taxSub}>{zeroReason}</Text>}
              </View>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.infoLabel, styles.taxLabel]}>실수령(추정)</Text>
              <Text style={styles.infoValue}>{formatMoney(netIncome)}원</Text>
            </View>
            <Text style={styles.taxHint}>{TAX_NOTE}</Text>
            <Text style={styles.taxHint}>계산 참고용이며, 실제 신고는 별도로 처리해야 해요.</Text>
          </View>
        )}

        <Pressable style={styles.linkRow} onPress={() => navigation.navigate('ScheduleDetail', { id: scheduleId })}>
          <Icon name="calendar-month-outline" size={18} color={colors.primaryDark} />
          <Text style={styles.linkRowText}>원본 일정 보기</Text>
          <Icon name="chevron-right" size={16} color={colors.muted} />
        </Pressable>

        {/* ★ v18.44 — 팀원은 팀 일정을 수정·삭제할 수 없어 버튼 숨김 */}
        {schedule.can_edit !== false && (
          <View style={styles.footerRow}>
            <Pressable style={styles.editBtn} onPress={() => navigation.navigate('ScheduleCreate', { scheduleId })}>
              <Text style={styles.editBtnText}>수정</Text>
            </Pressable>
            <Pressable style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>삭제</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },

  headerCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 18, alignItems: 'center', gap: 8 },
  headerIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  headerAmount: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  badgeRow: { flexDirection: 'row', gap: 6 },
  badge: { height: 24, paddingHorizontal: 9, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  badgePaid: { backgroundColor: '#E2F8F4' },
  badgePending: { backgroundColor: '#EEF2F7' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextPaid: { color: '#0B8574' },
  badgeTextPending: { color: colors.textSecondary },

  taxHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refBadge: { height: 24, paddingHorizontal: 9, borderRadius: 7, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center' },
  refBadgeText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  taxHint: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  // ★ v18.66 — 세무 추정 카드는 라벨이 길어("지방소득세", "원천세(추정)") 폭을 넓힘
  taxLabel: { width: 84 },
  taxValueCol: { flex: 1, gap: 2 },
  taxSub: { fontSize: 12, color: colors.textSecondary },

  infoCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 16, gap: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  infoRow: { flexDirection: 'row', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  infoLabel: { width: 60, fontSize: 13, color: colors.textSecondary },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  infoLink: { fontWeight: '700', color: colors.primaryDark },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.md },
  linkRowText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },

  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  editBtn: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: '#BFDBFB', alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  deleteBtn: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.dangerBorder, backgroundColor: colors.dangerBg, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: colors.danger },
});
