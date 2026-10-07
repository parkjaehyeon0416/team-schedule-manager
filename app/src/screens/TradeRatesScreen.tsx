/**
 * 공정별 단가 설정 화면 — DESIGN-CANVAS 기준, TRADE_RATES.dc.html
 * ★ 공정과 무관한 기본 일급은 별도 화면(내 단가 설정=MyRatesScreen)에서 관리.
 * ★ 디자인의 "원/평"·"원/㎡" 단위 표기는 공정별 저장된 단위 데이터가 없어 생략(그냥 "원"으로 표시).
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../components/AppHeader';
import { getWageSettings, saveWageSetting } from '../api/wageSettingsApi';
import { getWorkTypes, createWorkType } from '../api/workTypesApi';
import type { WageSetting, WorkType } from '../types/api';
import { parseMoney } from '../utils/format';
import { colors, radius, spacing } from '../theme/designTokens';

export default function TradeRatesScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [settings, setSettings] = useState<WageSetting[]>([]);
  const [values, setValues] = useState<Record<number, string>>({});
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getWorkTypes(), getWageSettings()])
      .then(([types, wageSettings]) => {
        setWorkTypes(types);
        setSettings(wageSettings);
        const v: Record<number, string> = {};
        types.forEach(t => {
          const s = wageSettings.find(w => w.work_type_id === t.id);
          v[t.id] = s ? String(Math.round(parseFloat(s.default_wage))) : '0';
        });
        setValues(v);
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAddType = async () => {
    if (!newName.trim()) return;
    try {
      // 내 단가 화면에서 추가하는 공정은 나만 쓰는 개인 공정(★ v18.44 — 팀원이면 팀 공정 추가가 막혀 실패했었음)
      const created = await createWorkType({ name: newName.trim(), is_personal: true });
      setWorkTypes(prev => [...prev, created]);
      setValues(prev => ({ ...prev, [created.id]: '0' }));
      setNewName('');
      setAddingNew(false);
    } catch (e: any) {
      Alert.alert('추가 실패', e?.response?.data?.message || '공정 추가에 실패했습니다.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const t of workTypes) {
        const existing = settings.find(s => s.work_type_id === t.id);
        await saveWageSetting({
          work_type_id: t.id,
          default_wage: parseMoney(values[t.id] ?? '0'),
          default_work_units: existing ? parseFloat(existing.default_work_units) : 1,
          memo: existing?.memo ?? undefined,
        });
      }
      Alert.alert('완료', '공정별 단가가 저장되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('저장 실패', e?.response?.data?.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="공정별 단가 설정" />
        <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="공정별 단가 설정" />
      <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>견적서 작성 시 공정별 기본 단가로 사용돼요.</Text>

        <View style={styles.listCard}>
          {workTypes.map((t, i) => (
            <View key={t.id} style={[styles.row, i === workTypes.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rowLabel}>{t.name}</Text>
              </View>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={values[t.id] ?? '0'}
                  onChangeText={v => setValues(prev => ({ ...prev, [t.id]: v }))}
                  keyboardType="numeric"
                  textAlign="right"
                />
                <Text style={styles.unit}>원</Text>
              </View>
            </View>
          ))}
        </View>

        {addingNew ? (
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="공정명"
              placeholderTextColor={colors.muted}
              autoFocus
              onSubmitEditing={handleAddType}
            />
            <Pressable style={styles.addConfirmBtn} onPress={handleAddType}>
              <Text style={styles.addConfirmBtnText}>추가</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.addBtn} onPress={() => setAddingNew(true)}>
            <Icon name="plus" size={16} color={colors.primaryDark} />
            <Text style={styles.addBtnText}>공정 추가</Text>
          </Pressable>
        )}

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
  intro: { fontSize: 14, color: colors.textSecondary },

  listCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  rowLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  inputWrap: { width: 150, height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 6 },
  input: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary, padding: 0 },
  unit: { fontSize: 13, color: colors.textSecondary },

  addBtn: { height: 44, borderWidth: 1, borderStyle: 'dashed', borderColor: '#9CC9FA', borderRadius: radius.md, backgroundColor: '#F3F9FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addBtnText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  addRow: { flexDirection: 'row', gap: 8 },
  addInput: { flex: 1, height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, paddingHorizontal: 14, fontSize: 14, color: colors.textPrimary },
  addConfirmBtn: { height: 44, paddingHorizontal: 16, borderRadius: radius.sm, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  addConfirmBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  saveBtn: { height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
