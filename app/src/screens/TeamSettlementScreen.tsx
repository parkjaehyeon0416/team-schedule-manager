/**
 * 팀원 정산표 — DESIGN-CANVAS 기준, TEAM_SETTLEMENT.dc.html (★ v18.48, 팀장 전용)
 * 그 달 팀 일정에 배정된 기록으로 팀원별 근무일·공수·금액, 지급 완료 체크, 엑셀 내보내기.
 * 팀원을 누르면 일정별 내역(TeamSettlementDetail).
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import dayjs from 'dayjs';
import AppHeader from '../components/AppHeader';
import { getSettlement, markSettlement, getSettlementXlsxLink } from '../api/teamApi';
import type { Settlement, SettlementMember } from '../api/teamApi';
import { Avatar, RoleTag, CheckBox, InfoNote, won } from '../components/TeamUi';
import { colors, spacing } from '../theme/designTokens';
import { isPlanLocked } from '../utils/planLock';

export default function TeamSettlementScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const teamId: number = route.params?.teamId;
  const [month, setMonth] = useState<string>(route.params?.month ?? dayjs().format('YYYY-MM'));
  const [data, setData] = useState<Settlement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    getSettlement(teamId, month)
      .then(setData)
      .catch(e => { setData(null); setError(isPlanLocked(e) ? '팀 요금제에서 쓸 수 있는 기능이에요.' : e?.response?.data?.message || '정산표를 불러오지 못했어요.'); });
  }, [teamId, month]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shift = (n: number) => { setData(null); setMonth(m => dayjs(`${m}-01`).add(n, 'month').format('YYYY-MM')); };

  const togglePaid = async (m: SettlementMember) => {
    const next = !m.paid;
    setData(d => d && { ...d, members: d.members.map(x => (x.user_id === m.user_id ? { ...x, paid: next, amount_changed: false } : x)) });
    try {
      await markSettlement(teamId, m.user_id, month, { paid: next });
      load();
    } catch (e: any) {
      load();
      if (!isPlanLocked(e)) Alert.alert('실패', e?.response?.data?.message || '다시 시도해주세요.');
    }
  };

  const exportXlsx = async () => {
    try {
      Linking.openURL(await getSettlementXlsxLink(teamId, month));
    } catch (e: any) {
      if (!isPlanLocked(e)) Alert.alert('내보내기 실패', e?.response?.data?.message || '다시 시도해주세요.');
    }
  };

  const members = data?.members ?? [];
  const total = data?.totals.amount ?? 0;
  const paid = members.filter(m => m.paid).reduce((a, m) => a + m.amount, 0);
  const unpaid = members.filter(m => !m.paid && m.amount > 0).length;
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="팀원 정산표" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.monthRow}>
          <Pressable onPress={() => shift(-1)} accessibilityLabel="이전 달" style={styles.monthBtn}>
            <Icon name="chevron-left" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.monthText}>{dayjs(`${month}-01`).format('YYYY년 M월')}</Text>
          <Pressable onPress={() => shift(1)} accessibilityLabel="다음 달" style={styles.monthBtn}>
            <Icon name="chevron-right" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errBox}><Text style={styles.errText}>{error}</Text></View>
        ) : !data ? (
          <View style={styles.errBox}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <>
            <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.totalCard}>
              <View style={styles.totalTop}>
                <View style={{ gap: 2 }}>
                  <Text style={styles.totalLabel}>총 정산 금액</Text>
                  <Text style={styles.totalValue}>{won(total)}</Text>
                </View>
                <Text style={styles.totalGong}>{data.totals.work_units}공수</Text>
              </View>
              <View style={styles.totalGrid}>
                <View style={styles.totalCell}>
                  <Text style={styles.cellLabel}>지급 완료 · {pct}%</Text>
                  <Text style={styles.cellValue}>{won(paid)}</Text>
                </View>
                <View style={styles.totalCell}>
                  <Text style={styles.cellLabel}>미지급</Text>
                  <Text style={styles.cellValue}>{unpaid}명</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.listHead}>
              <Text style={styles.listHeadText}>팀원 {members.length}명 · 팀원을 누르면 일정별 내역</Text>
              <Text style={styles.listHeadText}>지급 완료</Text>
            </View>

            <View style={styles.card}>
              {members.map((m, i) => (
                <View key={m.user_id} style={[styles.row, i !== members.length - 1 && styles.rowDivider]}>
                  <Pressable style={styles.rowMain} onPress={() => navigation.navigate('TeamSettlementDetail', { teamId, userId: m.user_id, month })}>
                    <Avatar id={m.user_id} name={m.name} color={m.avatar_color} image={m.avatar_image_path} />
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.name} numberOfLines={1}>{m.name}</Text>
                        <RoleTag role={m.role} />
                      </View>
                      <Text style={styles.meta}>{m.work_days}일 · {m.work_units}공수</Text>
                      {m.amount_changed && (
                        <View style={styles.changed}>
                          <Icon name="information-outline" size={12} color="#B95E00" />
                          <Text style={styles.changedText}>금액 변경됨</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.amount}>{won(m.amount)}</Text>
                  </Pressable>
                  <Pressable onPress={() => togglePaid(m)} style={styles.checkBtn}
                    accessibilityRole="checkbox" accessibilityState={{ checked: m.paid }} accessibilityLabel={`${m.name} 지급 완료`}>
                    <CheckBox checked={m.paid} />
                  </Pressable>
                </View>
              ))}
              {members.length === 0 && <Text style={styles.empty}>팀원이 없어요.</Text>}
            </View>

            <InfoNote>정산표는 팀장에게만 보여요. 일정의 공수 · 단가가 바뀌면 “금액 변경됨”으로 알려드려요.</InfoNote>

            <Pressable style={styles.exportBtn} onPress={exportXlsx}>
              <Icon name="tray-arrow-down" size={18} color={colors.primaryDark} />
              <Text style={styles.exportText}>엑셀로 내보내기</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: spacing.xl, gap: 12 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  monthBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  monthText: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, minWidth: 120, textAlign: 'center' },
  errBox: { padding: 40, alignItems: 'center' },
  errText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  totalCard: { borderRadius: 18, padding: 18, gap: 12, elevation: 4, shadowColor: '#0A6CE0', shadowOpacity: 0.22, shadowRadius: 22 },
  totalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  totalLabel: { fontSize: 13, color: '#FFFFFF', opacity: 0.9 },
  totalValue: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  totalGong: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  totalGrid: { flexDirection: 'row', gap: 8 },
  totalCell: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', gap: 2 },
  cellLabel: { fontSize: 11, color: '#FFFFFF', opacity: 0.9 },
  cellValue: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listHeadText: { fontSize: 12, color: colors.textSecondary },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6F0FA', borderRadius: 16, paddingHorizontal: 16, shadowColor: '#102A56', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, flexShrink: 1 },
  meta: { fontSize: 12, color: colors.textSecondary },
  changed: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  changedText: { fontSize: 11, fontWeight: '700', color: '#B95E00' },
  amount: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  checkBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: 20, textAlign: 'center', color: colors.textSecondary, fontSize: 13 },
  exportBtn: { height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BFDBFB' },
  exportText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
});
