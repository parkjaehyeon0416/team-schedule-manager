/**
 * 견적서 작성/수정 화면 — DESIGN-CANVAS 기준, ESTIMATE_CREATE.dc.html / ESTIMATE_EDIT.dc.html
 * (두 디자인이 레이아웃상 동일해 한 컴포넌트로 통합 — route.params?.quote 유무로 작성/수정 분기)
 * ★ 디자인에는 항목명이 고정 텍스트("도배" 등)지만, 실제 앱은 항목명을 직접 입력해야 해서
 *   입력창을 추가함.
 * ★ 2026-10-02: 할인 금액 입력 + "세금" 탭 실제 계산(부가세 별도/포함/면세)을 백엔드
 *   quotes.tax_type/vat_amount 추가와 함께 구현함.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../components/AppHeader';
import AddressSearchModal, { DaumAddressResult } from '../components/AddressSearchModal';
import { createQuote, updateQuote, getMaterials } from '../api/quoteApi';
import { getSites } from '../api/siteApi';
import type { Quote, QuoteLine, Site, UserMaterial } from '../types/api';
import { formatMoney, parseMoney } from '../utils/format';
import { formatPhoneInput } from '../utils/phone';
import { colors, radius, spacing } from '../theme/designTokens';
import { isPlanLocked } from '../utils/planLock';

interface LineForm {
  name: string;
  unit: string;
  quantity: string;
  unit_price: string;
}
const emptyLine = (): LineForm => ({ name: '', unit: '개', quantity: '1', unit_price: '0' });
const TAX_MODES: { label: string; value: 'separate' | 'included' | 'exempt' }[] = [
  { label: '부가세 별도', value: 'separate' },
  { label: '부가세 포함', value: 'included' },
  { label: '면세', value: 'exempt' },
];

export default function QuoteFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editing: Quote | undefined = route.params?.quote;
  const isEdit = !!editing;

  const [clientName, setClientName] = useState(editing?.client_name ?? '');
  const [clientContact, setClientContact] = useState(editing?.client_contact ?? '');
  const [siteId, setSiteId] = useState<number | null>(editing?.site_id ?? null);
  const [siteLabel, setSiteLabel] = useState(editing?.site ? [editing.site.apt_name, editing.site.dong, editing.site.ho].filter(Boolean).join(' ') || editing?.address || '' : editing?.address ?? '');
  const [sitePickerVisible, setSitePickerVisible] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [addressSearchVisible, setAddressSearchVisible] = useState(false);
  const [taxType, setTaxType] = useState<'separate' | 'included' | 'exempt'>(editing?.tax_type ?? 'separate');
  const [discount, setDiscount] = useState(editing?.discount_amount ? String(Math.round(parseFloat(editing.discount_amount))) : '0');
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [lines, setLines] = useState<LineForm[]>(
    editing?.lines && editing.lines.length > 0
      ? editing.lines.map(l => ({ name: l.name, unit: l.unit, quantity: String(l.quantity), unit_price: String(l.unit_price) }))
      : [emptyLine()],
  );
  const [materials, setMaterials] = useState<UserMaterial[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMaterials().then(setMaterials).catch(() => {});
    getSites().then(setSites).catch(() => {});
  }, []);

  const updateLine = (idx: number, patch: Partial<LineForm>) => {
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const lineAmount = (l: LineForm) => (parseMoney(l.quantity) || 0) * (parseMoney(l.unit_price) || 0);
  const subtotal = lines.reduce((sum, l) => sum + lineAmount(l), 0);
  const discountAmount = parseMoney(discount) || 0;
  const base = Math.max(0, subtotal - discountAmount);
  const vatAmount = taxType === 'separate' ? Math.round(base * 0.1) : taxType === 'included' ? Math.round(base - base / 1.1) : 0;
  const totalAmount = taxType === 'separate' ? base + vatAmount : base;

  const handlePickSite = (s: Site) => {
    setSiteId(s.id);
    setSiteLabel([s.apt_name, s.dong, s.ho].filter(Boolean).join(' ') || s.address);
    setSitePickerVisible(false);
  };

  const handleAddressSelect = (r: DaumAddressResult) => {
    setSiteId(null);
    setSiteLabel(r.roadAddress || r.jibunAddress);
    setAddressSearchVisible(false);
  };

  // ★ v18.45 — "미리보기"도 먼저 저장 후 이동(예전엔 저장 없이 이동해서 바꾼 부가세 구분·금액이 안 보였음)
  const handleSubmit = async (thenPreview = false) => {
    const validLines: QuoteLine[] = lines
      .filter(l => l.name.trim() && parseMoney(l.quantity) > 0)
      .map(l => ({ name: l.name.trim(), spec: null, quantity: parseMoney(l.quantity), unit: l.unit.trim() || '개', unit_price: parseMoney(l.unit_price) }));

    if (validLines.length === 0) {
      Alert.alert('입력 오류', '최소 1개 이상의 견적 항목을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        client_name: clientName.trim() || undefined,
        client_contact: clientContact.trim() || undefined,
        site_id: siteId ?? undefined,
        address: siteId ? undefined : siteLabel.trim() || undefined,
        memo: memo.trim() || undefined,
        discount_amount: discountAmount,
        tax_type: taxType,
        lines: validLines,
      };
      if (isEdit) {
        await updateQuote(editing!.id, payload);
        if (thenPreview) navigation.replace('QuotePreview', { quoteId: editing!.id });
        else navigation.goBack();
      } else {
        const created = await createQuote(payload);
        navigation.replace('QuoteDetail', { quoteId: created.id });
      }
    } catch (e: any) {
      if (!isPlanLocked(e)) Alert.alert('저장 실패', e?.response?.data?.message || '견적서 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title={isEdit ? '견적서 수정' : '견적서 작성'} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>고객 정보</Text>
        <View style={{ gap: spacing.sm }}>
          <View style={styles.field}>
            <Text style={styles.label}>고객명</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} value={clientName} onChangeText={setClientName} placeholder="고객명" placeholderTextColor={colors.muted} />
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>연락처</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={clientContact}
                onChangeText={t => setClientContact(formatPhoneInput(t))}
                placeholder="010-0000-0000"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                maxLength={13}
              />
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>현장</Text>
            <Pressable style={styles.siteBtn} onPress={() => setSitePickerVisible(true)}>
              <Text style={siteLabel ? styles.siteBtnText : styles.siteBtnPlaceholder} numberOfLines={1}>
                {siteLabel || '현장 선택 (선택사항)'}
              </Text>
              <Icon name="chevron-down" size={18} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>견적 항목</Text>
        <View style={{ gap: spacing.sm }}>
          {lines.map((line, idx) => (
            <View key={idx} style={styles.lineCard}>
              <View style={styles.lineHeader}>
                <View style={styles.lineIcon}>
                  <Icon name="view-grid-outline" size={15} color={colors.primaryDark} />
                </View>
                <TextInput
                  style={styles.lineNameInput}
                  value={line.name}
                  onChangeText={t => updateLine(idx, { name: t })}
                  placeholder="항목명 (예: 도배)"
                  placeholderTextColor={colors.muted}
                />
                {lines.length > 1 && (
                  <Pressable onPress={() => setLines(prev => prev.filter((_, i) => i !== idx))} style={styles.lineDeleteBtn}>
                    <Icon name="close" size={16} color={colors.muted} />
                  </Pressable>
                )}
              </View>
              {materials.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 2 }}>
                  {materials.slice(0, 8).map(m => (
                    <Pressable
                      key={m.id}
                      style={styles.suggestChip}
                      onPress={() => updateLine(idx, { name: m.name, unit: m.unit, unit_price: m.default_unit_price ? String(Math.round(parseFloat(m.default_unit_price))) : '0' })}
                    >
                      <Text style={styles.suggestChipText}>{m.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              <View style={styles.lineGrid}>
                <View style={styles.gridField}>
                  <Text style={styles.gridLabel}>단위</Text>
                  <TextInput style={styles.gridInput} value={line.unit} onChangeText={t => updateLine(idx, { unit: t })} />
                </View>
                <View style={styles.gridField}>
                  <Text style={styles.gridLabel}>수량</Text>
                  <TextInput style={styles.gridInput} value={line.quantity} onChangeText={t => updateLine(idx, { quantity: t })} keyboardType="numeric" />
                </View>
                <View style={styles.gridField}>
                  <Text style={styles.gridLabel}>단가</Text>
                  <TextInput style={styles.gridInput} value={line.unit_price} onChangeText={t => updateLine(idx, { unit_price: t })} keyboardType="numeric" />
                </View>
              </View>
              <View style={styles.lineAmountRow}>
                <Text style={styles.lineAmountLabel}>공급가</Text>
                <Text style={styles.lineAmountValue}>{formatMoney(lineAmount(line))}원</Text>
              </View>
            </View>
          ))}
          <Pressable style={styles.addLineBtn} onPress={() => setLines(prev => [...prev, emptyLine()])}>
            <Icon name="plus" size={16} color={colors.primaryDark} />
            <Text style={styles.addLineBtnText}>항목 추가</Text>
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>할인 금액</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={discount}
              onChangeText={setDiscount}
              placeholder="0"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>세금</Text>
        <View style={styles.tabRow}>
          {TAX_MODES.map(m => {
            const on = m.value === taxType;
            return (
              <Pressable key={m.value} style={[styles.taxBtn, on && styles.taxBtnOn]} onPress={() => setTaxType(m.value)}>
                <Text style={[styles.taxBtnText, on && styles.taxBtnTextOn]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>메모</Text>
          <TextInput
            style={styles.textarea}
            value={memo}
            onChangeText={setMemo}
            placeholder="고객에게 전달할 내용을 입력하세요"
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>항목 합계</Text>
            <Text style={styles.summaryValue}>{formatMoney(subtotal)}원</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>할인</Text>
              <Text style={styles.summaryValue}>-{formatMoney(discountAmount)}원</Text>
            </View>
          )}
          {/* ★ v18.45 — 부가세 포함이면 공급가액은 합계에서 부가세를 뺀 금액 */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>공급가액</Text>
            <Text style={styles.summaryValue}>{formatMoney(totalAmount - vatAmount)}원</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>부가세 ({taxType === 'separate' ? '별도' : taxType === 'included' ? '포함' : '면세'})</Text>
            <Text style={styles.summaryValue}>{taxType === 'exempt' ? '-' : `${formatMoney(vatAmount)}원`}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotalRow]}>
            <Text style={styles.summaryTotalLabel}>합계</Text>
            <Text style={styles.summaryTotalValue}>{formatMoney(totalAmount)}원</Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          {isEdit && (
            <Pressable style={styles.previewBtn} onPress={() => handleSubmit(true)} disabled={saving}>
              <Text style={styles.previewBtnText}>저장 후 미리보기</Text>
            </Pressable>
          )}
          <Pressable style={{ flex: 1 }} onPress={() => handleSubmit()} disabled={saving}>
            <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.saveBtn, saving && { opacity: 0.7 }]}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>저장하기</Text>}
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>

      <AddressSearchModal visible={addressSearchVisible} onClose={() => setAddressSearchVisible(false)} onSelect={handleAddressSelect} />

      <Modal visible={sitePickerVisible} animationType="slide" transparent onRequestClose={() => setSitePickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSitePickerVisible(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>현장 선택</Text>
          <FlatList
            data={sites}
            keyExtractor={s => String(s.id)}
            style={{ maxHeight: 320 }}
            ListEmptyComponent={<Text style={styles.modalEmpty}>등록된 현장이 없습니다.</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.modalRow} onPress={() => handlePickSite(item)}>
                <Text style={styles.modalRowText}>{[item.apt_name, item.dong, item.ho].filter(Boolean).join(' ') || item.address}</Text>
              </Pressable>
            )}
          />
          <Pressable
            style={styles.modalManualBtn}
            onPress={() => {
              setSitePickerVisible(false);
              setAddressSearchVisible(true);
            }}
          >
            <Icon name="magnify" size={16} color={colors.primaryDark} />
            <Text style={styles.modalManualBtnText}>새 주소 직접 검색</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.xs },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  inputWrap: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, paddingHorizontal: 14, justifyContent: 'center' },
  input: { fontSize: 14, color: colors.textPrimary, padding: 0 },
  siteBtn: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  siteBtnText: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  siteBtnPlaceholder: { fontSize: 14, color: colors.muted, flex: 1 },

  lineCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 14, gap: 8 },
  lineHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#E8F3FF', alignItems: 'center', justifyContent: 'center' },
  lineNameInput: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary, padding: 0 },
  lineDeleteBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  suggestChip: { height: 28, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  suggestChipText: { fontSize: 11, color: colors.textSecondary },
  lineGrid: { flexDirection: 'row', gap: 8 },
  gridField: { flex: 1, gap: 6 },
  gridLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  gridInput: { height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, paddingHorizontal: 12, fontSize: 14, color: colors.textPrimary },
  lineAmountRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 2 },
  lineAmountLabel: { fontSize: 13, color: colors.textSecondary },
  lineAmountValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },

  addLineBtn: { height: 44, borderWidth: 1, borderStyle: 'dashed', borderColor: '#9CC9FA', borderRadius: radius.md, backgroundColor: '#F3F9FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addLineBtnText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },

  tabRow: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: '#EEF5FD', borderRadius: 12 },
  taxBtn: { flex: 1, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  taxBtnOn: { backgroundColor: '#FFFFFF' },
  taxBtnText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  taxBtnTextOn: { fontWeight: '700', color: colors.primaryDark },

  textarea: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: 14, color: colors.textPrimary, minHeight: 56, textAlignVertical: 'top' },

  summaryCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 16, gap: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 13, color: colors.textSecondary },
  summaryTotalRow: { paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.borderHairline, alignItems: 'center' },
  summaryTotalLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  summaryTotalValue: { fontSize: 20, fontWeight: '700', color: colors.primaryDark },

  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  previewBtn: { flex: 1, height: 50, borderRadius: radius.sm, borderWidth: 1, borderColor: '#BFDBFB', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  previewBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  saveBtn: { height: 50, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,42,86,0.4)' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, gap: spacing.sm },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  modalEmpty: { textAlign: 'center', color: colors.textSecondary, padding: 20 },
  modalRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  modalRowText: { fontSize: 14, color: colors.textPrimary },
  modalManualBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, marginTop: 4 },
  modalManualBtnText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
});
