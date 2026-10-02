/**
 * 세무자료 내보내기 화면 — DESIGN-CANVAS 기준, TAX_EXPORT.dc.html
 * 2026-10-02: 백엔드에 엑셀 생성 패키지(PhpSpreadsheet 등)가 없어 "엑셀"도 CSV로 생성하되,
 * 실제로 `GET /tax-summary/export`에서 텍스트를 받아 OS 공유 시트로 저장/전달하도록 구현함.
 * PDF는 여전히 인증 헤더 문제로 모바일에서 직접 못 열어 웹 대시보드 안내로 대체.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator, Share } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import AppHeader from '../components/AppHeader';
import { exportTaxCsv } from '../api/taxSummaryApi';
import { downloadTaxPdf, downloadTaxXlsx } from '../api/pdfDownload';
import { colors, radius, spacing } from '../theme/designTokens';

const FORMATS = [
  { key: 'xlsx', title: 'Excel', sub: '엑셀 파일(.xlsx)로 저장돼요' },
  { key: 'pdf', title: 'PDF', sub: '보관 · 출력용' },
  { key: 'csv', title: 'CSV', sub: '다른 프로그램 연동용' },
] as const;

const ITEMS = [
  { key: 'income', label: '수입 내역', defaultOn: true },
  { key: 'wage', label: '공수 · 단가', defaultOn: true },
  { key: 'site', label: '현장 · 팀 정보', defaultOn: true },
  { key: 'tax', label: '예상 원천세', defaultOn: true },
  { key: 'schedule', label: '원본 일정', defaultOn: false },
] as const;

export default function TaxExportScreen() {
  const route = useRoute<any>();
  const now = new Date();
  const [from, setFrom] = useState(new Date(route.params?.year ?? now.getFullYear(), 0, 1));
  const [to, setTo] = useState(new Date(route.params?.year ?? now.getFullYear(), (route.params?.month ?? now.getMonth() + 1) - 1, 1));
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);
  const [format, setFormat] = useState<(typeof FORMATS)[number]['key']>('xlsx');
  const [items, setItems] = useState<Record<string, boolean>>(
    Object.fromEntries(ITEMS.map(i => [i.key, i.defaultOn])),
  );

  const [generating, setGenerating] = useState(false);

  const toggleItem = (key: string) => setItems(prev => ({ ...prev, [key]: !prev[key] }));

  const handleGenerate = async () => {
    if (format === 'pdf') {
      // ★ v18.36 — 서버 PDF는 연 단위 정리본이라 기간 끝 연도 기준으로 받음
      setGenerating(true);
      try {
        await downloadTaxPdf(dayjs(to).year());
      } catch (e: any) {
        Alert.alert('생성 실패', e?.response?.data?.message || 'PDF를 만들지 못했습니다.');
      } finally {
        setGenerating(false);
      }
      return;
    }
    const selectedItems = Object.entries(items).filter(([, on]) => on).map(([key]) => key);
    if (format === 'xlsx') {
      // ★ v18.40 — 진짜 엑셀 파일(월별 요약 시트 + 원본 일정 시트)
      setGenerating(true);
      try {
        await downloadTaxXlsx(dayjs(from).format('YYYY-MM'), dayjs(to).format('YYYY-MM'), selectedItems);
      } catch (e: any) {
        Alert.alert('생성 실패', e?.response?.data?.message || '엑셀 파일을 만들지 못했습니다.');
      } finally {
        setGenerating(false);
      }
      return;
    }
    setGenerating(true);
    try {
      const csv = await exportTaxCsv(dayjs(from).format('YYYY-MM'), dayjs(to).format('YYYY-MM'), selectedItems);
      await Share.share({
        title: `세무자료_${dayjs(from).format('YYYYMM')}-${dayjs(to).format('YYYYMM')}.csv`,
        message: csv,
      });
    } catch (e: any) {
      Alert.alert('생성 실패', e?.response?.data?.message || '자료 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="자료 내보내기" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>기간</Text>
          <View style={styles.periodRow}>
            <Pressable style={styles.periodBtn} onPress={() => setPickerTarget('from')}>
              <Text style={styles.periodBtnText}>{dayjs(from).format('YYYY.MM')}</Text>
              <Icon name="calendar-month-outline" size={16} color={colors.muted} />
            </Pressable>
            <Pressable style={styles.periodBtn} onPress={() => setPickerTarget('to')}>
              <Text style={styles.periodBtnText}>{dayjs(to).format('YYYY.MM')}</Text>
              <Icon name="calendar-month-outline" size={16} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        {pickerTarget && (
          <DateTimePicker
            value={pickerTarget === 'from' ? from : to}
            mode="date"
            display="default"
            locale="ko-KR"
            onChange={(_e, d) => {
              setPickerTarget(null);
              if (!d) return;
              if (pickerTarget === 'from') setFrom(d);
              else setTo(d);
            }}
          />
        )}

        <View style={{ gap: 8 }}>
          <Text style={styles.label}>파일 형식</Text>
          {FORMATS.map(f => {
            const on = f.key === format;
            return (
              <Pressable key={f.key} style={[styles.formatRow, on && styles.formatRowOn]} onPress={() => setFormat(f.key)}>
                <View style={[styles.radioOuter, on && styles.radioOuterOn]}>{on && <View style={styles.radioInner} />}</View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.formatTitle}>{f.title}</Text>
                  <Text style={styles.formatSub}>{f.sub}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 2 }}>
          <Text style={[styles.label, { marginBottom: 4 }]}>포함 항목</Text>
          {ITEMS.map(item => {
            const on = items[item.key];
            return (
              <Pressable key={item.key} style={styles.checkRow} onPress={() => toggleItem(item.key)}>
                <View style={[styles.checkbox, on && styles.checkboxOn]}>
                  {on && <Icon name="check" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkLabel}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.hintBox}>
          <Icon name="information-outline" size={16} color={colors.accentDark} />
          <Text style={styles.hintText}>세무 자료는 계산 참고용이에요. 신고는 홈택스 또는 세무사를 통해 별도로 진행해주세요.</Text>
        </View>

        <Pressable onPress={handleGenerate} disabled={generating}>
          <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.generateBtn, generating && { opacity: 0.7 }]}>
            {generating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="tray-arrow-down" size={18} color="#FFFFFF" />
                <Text style={styles.generateBtnText}>자료 생성</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  periodRow: { flexDirection: 'row', gap: 10 },
  periodBtn: { flex: 1, height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodBtnText: { fontSize: 14, color: colors.textPrimary },

  formatRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  formatRowOn: { borderColor: '#7DBBFF', backgroundColor: '#F3F9FF' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#C5D5E8', alignItems: 'center', justifyContent: 'center' },
  radioOuterOn: { borderWidth: 6, borderColor: colors.primary },
  radioInner: { width: 0, height: 0 },
  formatTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  formatSub: { fontSize: 12, color: colors.textSecondary },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#C5D5E8', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLabel: { fontSize: 14, color: colors.textPrimary },

  hintBox: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: colors.warningBg, borderRadius: radius.md, alignItems: 'flex-start' },
  hintText: { flex: 1, fontSize: 13, color: colors.accentDark, lineHeight: 18 },

  generateBtn: { height: 52, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  generateBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
