/**
 * 정산 상세 — DESIGN-CANVAS 기준, TEAM_SETTLEMENT_DETAIL.dc.html (★ v18.48, 팀장 전용)
 * 팀원 한 명의 그 달 합계·근무일·공수, 지급 상태, 메모, 일정별 내역(지급 처리 뒤 바뀐 단가·공수 표시), 지급 완료/취소.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, TextInput, Linking } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import dayjs from 'dayjs';
import AppHeader from '../components/AppHeader';
import { getSettlement, markSettlement, getSettlementXlsxLink } from '../api/teamApi';
import type { SettlementMember, SettlementSchedule } from '../api/teamApi';
import { Avatar, RoleTag, won } from '../components/TeamUi';
import { colors, spacing } from '../theme/designTokens';
import { isPlanLocked } from '../utils/planLock';

const FIRST = 5;
const n = (v: number) => Math.round(v).toLocaleString('ko-KR');
const units = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}공수`;

function changeNote(s: SettlementSchedule): string | null {
  if (s.added_after_paid) return '지급 처리 뒤 추가된 일정';
  if (!s.changed) return null;
  const parts = [];
  if (s.changed.from_wage !== s.daily_wage) parts.push(`단가 변경 ${n(s.changed.from_wage)} → ${n(s.daily_wage)}`);
  if (s.changed.from_units !== s.work_units) parts.push(`공수 변경 ${s.changed.from_units} → ${s.work_units}`);
  return parts.join(' · ');
}

export default function TeamSettlementDetailScreen() {
  const route = useRoute<any>();
  const { teamId, userId, month } = route.params as { teamId: number; userId: number; month: string };
  const [m, setM] = useState<SettlementMember | null>(null);
  const [memo, setMemo] = useState('');
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getSettlement(teamId, month)
      .then(d => {
        const row = d.members.find(x => x.user_id === userId) ?? null;
        setM(row);
        setMemo(row?.memo ?? '');
      })
      .catch(() => setM(null));
  }, [teamId, userId, month]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveMemo = async () => {
    if (!m || (m.memo ?? '') === memo.trim()) return;
    try {
      await markSettlement(teamId, userId, month, { memo: memo.trim() || null });
      setM({ ...m, memo: memo.trim() || null });
    } catch (e: any) {
      if (!isPlanLocked(e)) Alert.alert('메모 저장 실패', e?.response?.data?.message || '다시 시도해주세요.');
    }
  };

  const setPaid = async (paid: boolean) => {
    if (!m) return;
    setBusy(true);
    try {
      await markSettlement(teamId, userId, month, { paid, memo: memo.trim() || null });
      load();
    } catch (e: any) {
      if (!isPlanLocked(e)) Alert.alert('실패', e?.response?.data?.message || '다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  };

  const exportXlsx = async () => {
    try {
      Linking.openURL(await getSettlementXlsxLink(teamId, month));
    } catch (e: any) {
      if (!isPlanLocked(e)) Alert.alert('내보내기 실패', e?.response?.data?.message || '다시 시도해주세요.');
    }
  };

  if (!m) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="정산 상세" />
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  const shown = all ? m.schedules : m.schedules.slice(0, FIRST);
  const rest = m.schedules.length - shown.length;

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="정산 상세" />
      <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.head}>
            <Avatar id={m.user_id} name={m.name} color={m.avatar_color} image={m.avatar_image_path} size={52} />
            <View style={{ flex: 1, gap: 3 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{m.name}</Text>
                <RoleTag role={m.role} big />
              </View>
              <Text style={styles.sub}>{dayjs(`${month}-01`).format('YYYY년 M월')} 정산</Text>
            </View>
            <View style={[styles.status, { backgroundColor: m.paid ? '#E2F8F4' : '#FFF2E2' }]}>
              <Text style={[styles.statusText, { color: m.paid ? '#0B8574' : '#B95E00' }]}>{m.paid ? '지급 완료' : '미지급'}</Text>
            </View>
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statLabel}>합계</Text><Text style={styles.statValue}>{won(m.amount)}</Text></View>
            <View style={styles.stat}><Text style={styles.statLabel}>근무일</Text><Text style={styles.statValue}>{m.work_days}일</Text></View>
            <View style={styles.stat}><Text style={styles.statLabel}>공수</Text><Text style={styles.statValue}>{units(m.work_units)}</Text></View>
          </View>
          <Text style={styles.sub}>
            {m.paid && m.paid_at ? `${dayjs(m.paid_at).format('M월 D일')} 지급 처리${m.amount_changed && m.paid_amount != null ? ` · 처리 당시 ${won(m.paid_amount)}` : ''}` : '지급 전'}
          </Text>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={styles.label} nativeID="memoLabel">메모</Text>
          <View style={styles.inputWrap}>
            <TextInput
              accessibilityLabelledBy="memoLabel"
              value={memo}
              onChangeText={setMemo}
              onBlur={saveMemo}
              onSubmitEditing={saveMemo}
              maxLength={200}
              placeholder="예: 계좌이체 · 국민은행"
              placeholderTextColor="#9AACC4"
              style={styles.input}
            />
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <View style={styles.secHead}>
            <Text style={styles.secTitle}>일정별 내역</Text>
            <Pressable onPress={exportXlsx} style={styles.excelLink} hitSlop={8}>
              <Text style={styles.excelText}>엑셀</Text>
              <Icon name="chevron-right" size={14} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={[styles.card, { paddingVertical: 0, paddingHorizontal: 16, gap: 0 }]}>
            {shown.map((s, i) => {
              const note = changeNote(s);
              return (
                <View key={s.schedule_id} style={[styles.sRow, (i !== shown.length - 1 || rest > 0) && styles.rowDivider]}>
                  <View style={styles.sTop}>
                    <Text style={styles.sDate}>{dayjs(s.date).format('MM.DD (ddd)')}</Text>
                    <Text style={styles.sAmount}>{won(s.amount)}</Text>
                  </View>
                  <Text style={styles.sSite}>{s.site || '현장 미지정'}</Text>
                  <View style={styles.sMeta}>
                    {!!s.work_type && <View style={styles.wtTag}><Text style={styles.wtText}>{s.work_type}</Text></View>}
                    <Text style={styles.sub}>{units(s.work_units)} × {won(s.daily_wage)}</Text>
                    {!!note && (
                      <View style={styles.changed}>
                        <Icon name="information-outline" size={12} color="#B95E00" />
                        <Text style={styles.changedText}>{note}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
            {rest > 0 && (
              <Pressable onPress={() => setAll(true)} style={{ paddingVertical: 12 }}>
                <Text style={styles.more}>+ {rest}건 더 보기</Text>
              </Pressable>
            )}
            {m.schedules.length === 0 && <Text style={[styles.more, { paddingVertical: 16 }]}>이 달 배정된 팀 일정이 없어요.</Text>}
          </View>
        </View>

        {m.paid ? (
          <Pressable style={styles.cancelBtn} onPress={() => setPaid(false)} disabled={busy}>
            {busy ? <ActivityIndicator color={colors.danger} /> : <Text style={styles.cancelText}>지급 완료 취소</Text>}
          </Pressable>
        ) : (
          <Pressable onPress={() => setPaid(true)} disabled={busy}>
            <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.payBtn}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : (
                <>
                  <Icon name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.payText}>지급 완료로 표시</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: spacing.xl, gap: 14 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6F0FA', borderRadius: 16, padding: 18, gap: 12, shadowColor: '#102A56', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  sub: { fontSize: 12, color: colors.textSecondary },
  status: { height: 26, paddingHorizontal: 10, borderRadius: 7, justifyContent: 'center' },
  statusText: { fontSize: 12, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderHairline },
  stat: { flex: 1, gap: 2 },
  statLabel: { fontSize: 11, color: colors.textSecondary },
  statValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  inputWrap: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: '#FFFFFF', justifyContent: 'center', paddingHorizontal: 14 },
  input: { fontSize: 14, color: colors.textPrimary, padding: 0 },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  excelLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  excelText: { fontSize: 13, color: colors.textSecondary },
  sRow: { gap: 4, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  sTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sDate: { fontSize: 12, color: colors.textSecondary },
  sAmount: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  sSite: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  sMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  wtTag: { height: 24, paddingHorizontal: 9, borderRadius: 7, backgroundColor: '#EEF2F7', justifyContent: 'center' },
  wtText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  changed: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  changedText: { fontSize: 11, fontWeight: '700', color: '#B95E00' },
  more: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  payBtn: { height: 52, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  payText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  cancelBtn: { height: 52, borderRadius: 12, backgroundColor: '#FFF2F2', borderWidth: 1, borderColor: '#FFD5D6', alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
});
