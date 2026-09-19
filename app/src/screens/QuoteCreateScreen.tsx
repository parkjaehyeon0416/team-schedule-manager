// ═══════════════════════════════════════════════════════════════
// 📄 QuoteCreateScreen.tsx — 견적서 작성 (★ v12.1 백엔드/웹에 이어 모바일 연동 ★ 이번 작업)
// ═══════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Button, TextInput, IconButton, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import { createQuote, getMaterials } from '../api/quoteApi';
import type { QuoteLine, UserMaterial } from '../types/api';
import { formatMoney, parseMoney } from '../utils/format';
import AppHeader from '../components/AppHeader';

interface LineForm {
  name: string;
  spec: string;
  quantity: string;
  unit: string;
  unit_price: string;
}

const emptyLine = (): LineForm => ({
  name: '',
  spec: '',
  quantity: '1',
  unit: '개',
  unit_price: '0',
});

export default function QuoteCreateScreen() {
  const navigation = useNavigation<any>();
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [address, setAddress] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [memo, setMemo] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [lines, setLines] = useState<LineForm[]>([emptyLine()]);
  const [materials, setMaterials] = useState<UserMaterial[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMaterials()
      .then(setMaterials)
      .catch(() => {});
  }, []);

  const updateLine = (idx: number, patch: Partial<LineForm>) => {
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const pickMaterial = (idx: number, m: UserMaterial) => {
    updateLine(idx, {
      name: m.name,
      unit: m.unit,
      unit_price: m.default_unit_price ? String(Math.round(parseFloat(m.default_unit_price))) : '0',
    });
  };

  const subtotal = lines.reduce(
    (sum, l) => sum + (parseMoney(l.quantity) || 0) * (parseMoney(l.unit_price) || 0),
    0,
  );
  const total = Math.max(0, subtotal - (parseMoney(discountAmount) || 0));

  const handleSubmit = async () => {
    const validLines: QuoteLine[] = lines
      .filter(l => l.name.trim() && parseMoney(l.quantity) > 0)
      .map(l => ({
        name: l.name.trim(),
        spec: l.spec.trim() || null,
        quantity: parseMoney(l.quantity),
        unit: l.unit.trim() || '개',
        unit_price: parseMoney(l.unit_price),
      }));

    if (validLines.length === 0) {
      Alert.alert('입력 오류', '최소 1개 이상의 견적 항목을 입력해주세요.');
      return;
    }
    if (desiredDate && !/^\d{4}-\d{2}-\d{2}$/.test(desiredDate)) {
      Alert.alert('입력 오류', '희망 시공일은 YYYY-MM-DD 형식으로 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      await createQuote({
        client_name: clientName.trim() || undefined,
        client_contact: clientContact.trim() || undefined,
        address: address.trim() || undefined,
        desired_date: desiredDate.trim() || undefined,
        memo: memo.trim() || undefined,
        discount_amount: parseMoney(discountAmount),
        lines: validLines,
      });
      navigation.goBack();
    } catch (e: any) {
      console.error('견적 생성 실패:', e);
      Alert.alert('생성 실패', e?.response?.data?.message || '견적서 생성에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="견적서 작성" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TextInput mode="outlined" label="고객명" value={clientName} onChangeText={setClientName} style={styles.input} />
        <TextInput mode="outlined" label="고객 연락처" value={clientContact} onChangeText={setClientContact} style={styles.input} />
        <TextInput mode="outlined" label="현장 주소" value={address} onChangeText={setAddress} style={styles.input} />
        <TextInput
          mode="outlined"
          label="희망 시공일 (YYYY-MM-DD)"
          value={desiredDate}
          onChangeText={setDesiredDate}
          placeholder="2026-10-01"
          style={styles.input}
        />

        <Divider style={styles.divider} />
        <Text style={styles.section}>견적 항목</Text>

        {lines.map((line, idx) => (
          <View key={idx} style={styles.lineBox}>
            <View style={styles.lineHeaderRow}>
              <TextInput
                mode="outlined"
                label="항목명"
                value={line.name}
                onChangeText={t => updateLine(idx, { name: t })}
                style={styles.lineNameInput}
                dense
              />
              <IconButton
                icon="close"
                size={18}
                onPress={() => setLines(prev => prev.filter((_, i) => i !== idx))}
              />
            </View>

            {materials.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestRow}>
                {materials.slice(0, 8).map(m => (
                  <Button
                    key={m.id}
                    mode="outlined"
                    compact
                    onPress={() => pickMaterial(idx, m)}
                    style={styles.suggestChip}
                    labelStyle={styles.suggestChipLabel}
                  >
                    {m.name}
                  </Button>
                ))}
              </ScrollView>
            )}

            <TextInput
              mode="outlined"
              label="규격/설명"
              value={line.spec}
              onChangeText={t => updateLine(idx, { spec: t })}
              style={styles.input}
              dense
            />
            <View style={styles.rowThree}>
              <TextInput
                mode="outlined"
                label="수량"
                keyboardType="numeric"
                value={line.quantity}
                onChangeText={t => updateLine(idx, { quantity: t })}
                style={styles.thirdInput}
                dense
              />
              <TextInput
                mode="outlined"
                label="단위"
                value={line.unit}
                onChangeText={t => updateLine(idx, { unit: t })}
                style={styles.thirdInput}
                dense
              />
              <TextInput
                mode="outlined"
                label="단가"
                keyboardType="numeric"
                value={line.unit_price}
                onChangeText={t => updateLine(idx, { unit_price: t })}
                style={styles.thirdInput}
                dense
              />
            </View>
            <Text style={styles.lineAmount}>
              {formatMoney((parseMoney(line.quantity) || 0) * (parseMoney(line.unit_price) || 0))}원
            </Text>
          </View>
        ))}

        <Button
          mode="outlined"
          onPress={() => setLines(prev => [...prev, emptyLine()])}
          style={styles.addLineBtn}
        >
          + 항목 추가
        </Button>

        <Divider style={styles.divider} />

        <TextInput
          mode="outlined"
          label="할인 금액"
          keyboardType="numeric"
          value={discountAmount}
          onChangeText={setDiscountAmount}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="메모"
          value={memo}
          onChangeText={setMemo}
          multiline
          numberOfLines={2}
          style={styles.input}
        />

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>총 견적가</Text>
          <Text style={styles.totalValue}>{formatMoney(total)}원</Text>
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={saving}
          disabled={saving}
          style={styles.submitBtn}
        >
          견적서 생성
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { padding: 16, paddingBottom: 60 },
  input: { marginBottom: 12, backgroundColor: '#FFF' },

  divider: { marginVertical: 16 },
  section: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 10 },

  lineBox: {
    backgroundColor: '#F7F7F9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  lineHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  lineNameInput: { flex: 1, backgroundColor: '#FFF' },

  suggestRow: { marginBottom: 8 },
  suggestChip: { marginRight: 6, borderRadius: 16 },
  suggestChipLabel: { fontSize: 11 },

  rowThree: { flexDirection: 'row', gap: 8 },
  thirdInput: { flex: 1, backgroundColor: '#FFF' },
  lineAmount: { textAlign: 'right', fontSize: 13, color: '#555', marginTop: 4 },

  addLineBtn: { marginBottom: 8, borderStyle: 'dashed' },

  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#E8F0FE',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#1F3864' },
  totalValue: { fontSize: 17, fontWeight: '700', color: '#1F3864' },

  submitBtn: { marginBottom: 40 },
});
