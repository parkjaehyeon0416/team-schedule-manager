/**
 * 내 단가 설정 화면 — DESIGN-CANVAS 기준, MY_RATES.dc.html
 * ★ 공정별로 다른 단가(도배/타일/필름 등)는 별도 화면(공정별 단가 설정=TradeRatesScreen)에서 관리.
 * ★ 백엔드에 이 "기본 일급 프로필" 개념이 없어서 wage_profiles 테이블 + /wage-profile API를 신규로 추가함.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../components/AppHeader';
import { getWageProfile, saveWageProfile } from '../api/wageSettingsApi';
import { formatMoney, parseMoney } from '../utils/format';
import { colors, radius, spacing } from '../theme/designTokens';

export default function MyRatesScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullDay, setFullDay] = useState('250000');
  const [halfDay, setHalfDay] = useState('125000');
  const [overtime, setOvertime] = useState('35000');
  const [premium, setPremium] = useState('20');

  const load = useCallback(() => {
    setLoading(true);
    getWageProfile()
      .then(p => {
        // 값이 비어 오면 화면 기본값 유지 (예전 서버는 저장 전이면 값을 안 보냈음 → "undefined" 표시 버그)
        if (p.full_day_wage != null) setFullDay(String(p.full_day_wage));
        if (p.half_day_wage != null) setHalfDay(String(p.half_day_wage));
        if (p.overtime_hourly_wage != null) setOvertime(String(p.overtime_hourly_wage));
        if (p.night_holiday_premium_percent != null) setPremium(String(p.night_holiday_premium_percent));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveWageProfile({
        full_day_wage: parseMoney(fullDay),
        half_day_wage: parseMoney(halfDay),
        overtime_hourly_wage: parseMoney(overtime),
        night_holiday_premium_percent: parseMoney(premium),
      });
      Alert.alert('완료', '단가가 저장되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('저장 실패', e?.response?.data?.message || '단가 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="내 단가 설정" />
        <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  const rows = [
    { label: '1공수 단가', sub: '8시간 기준', value: fullDay, onChange: setFullDay, unit: '원' },
    { label: '0.5공수 단가', sub: '4시간 기준', value: halfDay, onChange: setHalfDay, unit: '원' },
    { label: '연장 (시간당)', sub: '8시간 초과분', value: overtime, onChange: setOvertime, unit: '원' },
    { label: '야간 · 휴일 할증', sub: null, value: premium, onChange: setPremium, unit: '%' },
  ];

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="내 단가 설정" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>기본 일급 (1공수)</Text>
          <Text style={styles.summaryValue}>{formatMoney(parseMoney(fullDay))}원</Text>
          <Text style={styles.summaryHint}>저장하면 일정 등록 때 자동 입력돼요. (공정별 단가가 우선)</Text>
        </View>

        <View style={styles.listCard}>
          {rows.map((row, i) => (
            <View key={row.label} style={[styles.row, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                {!!row.sub && <Text style={styles.rowSub}>{row.sub}</Text>}
              </View>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={row.value}
                  onChangeText={row.onChange}
                  keyboardType="numeric"
                  textAlign="right"
                />
                <Text style={styles.unit}>{row.unit}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.hintBox}>
          <Icon name="information-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.hintText}>공정별로 다른 단가는 공정별 단가 설정에서 관리할 수 있어요.</Text>
        </View>

        <Pressable style={styles.linkRow} onPress={() => navigation.navigate('TradeRates')}>
          <View style={styles.linkIcon}><Icon name="view-grid-outline" size={18} color={colors.accentDark} /></View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.linkTitle}>공정별 단가 설정</Text>
            <Text style={styles.linkSub}>도배 · 타일 · 필름</Text>
          </View>
          <Icon name="chevron-right" size={16} color={colors.muted} />
        </Pressable>

        <Pressable onPress={handleSave} disabled={saving}>
          <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.saveBtn, saving && { opacity: 0.7 }]}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>저장하기</Text>}
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

  summaryCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 16, gap: 4 },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  summaryHint: { fontSize: 12, color: colors.textSecondary },

  listCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  rowLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary },
  inputWrap: { width: 150, height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 6 },
  input: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary, padding: 0 },
  unit: { fontSize: 13, color: colors.textSecondary },

  hintBox: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#E8F3FF', borderRadius: radius.md, alignItems: 'flex-start' },
  hintText: { flex: 1, fontSize: 13, color: colors.primaryDark, lineHeight: 18 },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.md },
  linkIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.warningBg, alignItems: 'center', justifyContent: 'center' },
  linkTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  linkSub: { fontSize: 12, color: colors.textSecondary },

  saveBtn: { height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
