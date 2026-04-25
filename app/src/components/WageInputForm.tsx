// ═══════════════════════════════════════════════════════════════
// 📄 src/components/WageInputForm.tsx
//   단가 + 기본 공수 + 메모 입력 폼
//   - 단가 입력 시 천단위 콤마 자동 표시
//   - 공수는 소수점 1자리 (예: 1.0, 1.5)
//   - 메모 255자 이내
// ═══════════════════════════════════════════════════════════════
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { formatMoney, parseMoney } from '../utils/format';

// ─── Props ───
interface Props {
  defaultWage: number;
  defaultWorkUnits: number;
  memo: string;
  onChangeWage: (value: number) => void;
  onChangeWorkUnits: (value: number) => void;
  onChangeMemo: (value: string) => void;
  disabled?: boolean;
}

export default function WageInputForm({
  defaultWage,
  defaultWorkUnits,
  memo,
  onChangeWage,
  onChangeWorkUnits,
  onChangeMemo,
  disabled = false,
}: Props) {
  return (
    <View style={styles.container}>
      {/* ── 단가 ── */}
      <View style={styles.labelRow}>
        <Icon name="currency-krw" size={18} color="#2E75B6" />
        <Text style={styles.label}>단가 (원)</Text>
      </View>
      <TextInput
        mode="outlined"
        value={formatMoney(defaultWage)}
        onChangeText={text => onChangeWage(parseMoney(text))}
        placeholder="예: 280,000"
        keyboardType="numeric"
        style={styles.input}
        disabled={disabled}
      />

      {/* ── 기본 공수 ── */}
      <View style={styles.labelRow}>
        <Icon name="counter" size={18} color="#2E75B6" />
        <Text style={styles.label}>기본 공수</Text>
      </View>
      <TextInput
        mode="outlined"
        value={String(defaultWorkUnits)}
        onChangeText={text => {
          const n = parseFloat(text);
          onChangeWorkUnits(isNaN(n) ? 0 : n);
        }}
        placeholder="예: 1.0"
        keyboardType="decimal-pad"
        style={styles.input}
        disabled={disabled}
      />

      {/* ── 메모 ── */}
      <View style={styles.labelRow}>
        <Icon name="note-text" size={18} color="#2E75B6" />
        <Text style={styles.label}>메모 (선택)</Text>
      </View>
      <TextInput
        mode="outlined"
        value={memo}
        onChangeText={onChangeMemo}
        placeholder="예: 30평 이상 현장만"
        multiline
        numberOfLines={2}
        maxLength={255}
        style={[styles.input, styles.memoInput]}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    marginTop: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    backgroundColor: '#FFF',
  },
  memoInput: {
    minHeight: 60,
  },
});
