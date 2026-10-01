/**
 * 견적서 상세 화면 — DESIGN-CANVAS 기준, ESTIMATE_DETAIL.dc.html
 * ★ "더보기" 메뉴는 디자인엔 없는 실제 동작(발송/완료 처리/삭제)을 담당 — 디자인은
 *   정적 목업이라 해당 메뉴의 구체적 항목이 없었음, 기능 보존을 위해 추가.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import AppHeader from '../components/AppHeader';
import { getQuote, updateQuoteStatus, approveQuote, deleteQuote } from '../api/quoteApi';
import type { Quote } from '../types/api';
import { formatMoney } from '../utils/format';
import { colors, radius, spacing } from '../theme/designTokens';

const STATUS_CHIP: Record<Quote['status'], { bg: string; fg: string; label: string }> = {
  draft: { bg: '#FFF2E2', fg: '#B95E00', label: '작성중' },
  sent: { bg: '#E8F3FF', fg: '#0A6CE0', label: '발송' },
  approved: { bg: '#E2F8F4', fg: '#0B8574', label: '완료' },
  rejected: { bg: '#FFF2F2', fg: '#E5484D', label: '반려' },
};

export default function QuoteDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const quoteId: number = route.params?.quoteId;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getQuote(quoteId)
      .then(setQuote)
      .catch(() => setQuote(null))
      .finally(() => setLoading(false));
  }, [quoteId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSend = () => {
    setMenuOpen(false);
    Alert.alert('발송 처리', '이 견적서를 발송 상태로 변경할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '발송', onPress: async () => { try { await updateQuoteStatus(quoteId, 'sent'); load(); } catch (e: any) { Alert.alert('실패', e?.response?.data?.message || '상태 변경에 실패했습니다.'); } } },
    ]);
  };

  const doApprove = async (date?: string) => {
    try {
      if (date) await updateQuoteStatus(quoteId, 'sent').catch(() => {});
      await approveQuote(quoteId);
      Alert.alert('완료', '견적이 승인되어 일정이 등록되었습니다.');
      load();
    } catch (e: any) {
      Alert.alert('실패', e?.response?.data?.message || '완료 처리에 실패했습니다.');
    }
  };

  const handleComplete = () => {
    setMenuOpen(false);
    if (!quote) return;
    if (!quote.desired_date) {
      Alert.alert('희망 시공일 필요', '완료 처리하려면 먼저 시공 희망일을 선택해야 합니다.', [
        { text: '취소', style: 'cancel' },
        { text: '날짜 선택', onPress: () => setDatePickerVisible(true) },
      ]);
      return;
    }
    Alert.alert('완료 처리', '견적을 승인하고 일정을 등록할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '완료', onPress: () => doApprove() },
    ]);
  };

  const handleDelete = () => {
    setMenuOpen(false);
    Alert.alert('견적 삭제', '이 견적서를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => { try { await deleteQuote(quoteId); navigation.goBack(); } catch (e: any) { Alert.alert('실패', e?.response?.data?.message || '삭제에 실패했습니다.'); } } },
    ]);
  };

  if (loading || !quote) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="견적서 상세" onBackPress={() => navigation.navigate('QuoteList')} />
        <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  const chip = STATUS_CHIP[quote.status];
  const siteLabel = quote.site ? [quote.site.apt_name, quote.site.dong, quote.site.ho].filter(Boolean).join(' ') || quote.site.address : quote.address;

  return (
    <View style={styles.screen}>
      <AppHeader
        leftType="back"
        title="견적서 상세"
        onBackPress={() => navigation.navigate('QuoteList')}
        rightContent={
          <Pressable onPress={() => setMenuOpen(v => !v)} style={styles.headerRightBtn}>
            <Icon name="dots-horizontal" size={22} color={colors.textPrimary} />
          </Pressable>
        }
      />
      {menuOpen && (
        <View style={styles.menuBox}>
          {quote.status === 'draft' && (
            <Pressable style={styles.menuItem} onPress={handleSend}><Text style={styles.menuItemText}>발송으로 변경</Text></Pressable>
          )}
          {quote.status !== 'approved' && (
            <Pressable style={styles.menuItem} onPress={handleComplete}><Text style={styles.menuItemText}>완료 처리 (일정 등록)</Text></Pressable>
          )}
          <Pressable style={styles.menuItem} onPress={handleDelete}><Text style={[styles.menuItemText, { color: colors.danger }]}>삭제</Text></Pressable>
        </View>
      )}
      {datePickerVisible && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          locale="ko-KR"
          onChange={(_e, d) => {
            setDatePickerVisible(Platform.OS === 'ios');
            if (d) doApprove(dayjs(d).format('YYYY-MM-DD'));
          }}
        />
      )}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerCardTop}>
            <Text style={styles.noText}>No. E-{quote.id}</Text>
            <View style={[styles.statusTag, { backgroundColor: chip.bg }]}>
              <Text style={[styles.statusTagText, { color: chip.fg }]}>{chip.label}</Text>
            </View>
          </View>
          <Text style={styles.titleText}>{quote.client_name ? `${quote.client_name} 고객` : '견적서'}</Text>
          <Text style={styles.amountText}>{formatMoney(quote.total_amount)}원</Text>
          <Text style={styles.metaText}>부가세 별도 · 희망일 {quote.desired_date ?? '미정'}</Text>
        </View>

        <Text style={styles.sectionTitle}>견적 항목</Text>
        <View style={styles.itemsCard}>
          {(quote.lines ?? []).map((l, i) => (
            <View key={l.id ?? i} style={styles.itemRow}>
              <View style={styles.itemIcon}><Icon name="view-grid-outline" size={16} color={colors.primaryDark} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{l.name}</Text>
                <Text style={styles.itemSpec}>{l.quantity}{l.unit} × {formatMoney(l.unit_price)}원</Text>
              </View>
              <Text style={styles.itemAmount}>{formatMoney(l.amount ?? Number(l.quantity) * Number(l.unit_price))}원</Text>
            </View>
          ))}
          <View style={styles.itemsTotalRow}>
            <Text style={styles.itemsTotalLabel}>공급가 합계</Text>
            <Text style={styles.itemsTotalValue}>{formatMoney(quote.subtotal_amount)}원</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>고객 · 현장</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>고객명</Text><Text style={styles.infoValue}>{quote.client_name ?? '-'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>연락처</Text><Text style={styles.infoValue}>{quote.client_contact ?? '-'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>현장</Text><Text style={styles.infoValue}>{siteLabel ?? '-'}</Text></View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}><Text style={styles.infoLabel}>메모</Text><Text style={styles.infoValue}>{quote.memo ?? '-'}</Text></View>
        </View>

        <View style={styles.footerRow}>
          <Pressable style={styles.editBtn} onPress={() => navigation.navigate('QuoteEdit', { quote })}>
            <Text style={styles.editBtnText}>수정</Text>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('QuotePreview', { quoteId })}>
            <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.previewBtn}>
              <Icon name="eye-outline" size={18} color="#FFFFFF" />
              <Text style={styles.previewBtnText}>미리보기</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },

  headerRightBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  menuBox: { position: 'absolute', top: 54, right: 14, zIndex: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderCard, paddingVertical: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  menuItem: { paddingVertical: 12, paddingHorizontal: 18 },
  menuItemText: { fontSize: 14, color: colors.textPrimary },

  headerCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 18, gap: 6 },
  headerCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noText: { fontSize: 12, color: colors.textSecondary },
  statusTag: { height: 24, paddingHorizontal: 9, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  statusTagText: { fontSize: 12, fontWeight: '700' },
  titleText: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  amountText: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  metaText: { fontSize: 12, color: colors.textSecondary },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  itemsCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 16, gap: 0 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  itemIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#E8F3FF', alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  itemSpec: { fontSize: 12, color: colors.textSecondary },
  itemAmount: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  itemsTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
  itemsTotalLabel: { fontSize: 13, color: colors.textSecondary },
  itemsTotalValue: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },

  infoCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16 },
  infoRow: { flexDirection: 'row', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  infoLabel: { width: 70, fontSize: 13, color: colors.textSecondary },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textPrimary },

  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  editBtn: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: '#BFDBFB', alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  previewBtn: { height: 48, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  previewBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
