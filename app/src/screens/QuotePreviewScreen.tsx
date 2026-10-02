/**
 * 견적서 미리보기 화면 — DESIGN-CANVAS 기준, ESTIMATE_PREVIEW.dc.html
 * 2026-10-02: "PDF 저장"은 인증이 필요한 다운로드라 모바일에서 바로 열 수 없어 제외하고,
 * 대신 CSV/엑셀(CSV)로만 저장 가능하도록 변경함 — 견적 내용을 클라이언트에서 바로 CSV로
 * 만들어 OS 공유 시트로 전달(세무자료 내보내기와 동일한 패턴, 별도 백엔드 호출 불필요).
 * v18.36 이후 엑셀·PDF 둘 다 고를 수 있어 버튼 이름을 "파일 저장"으로 바꿈.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, Share } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../components/AppHeader';
import { getQuote, updateQuoteStatus } from '../api/quoteApi';
import { downloadQuotePdf, downloadQuoteXlsx, getQuoteShareUrl } from '../api/pdfDownload';
import { useAuthStore } from '../store/authStore';
import type { Quote } from '../types/api';
import { formatMoney } from '../utils/format';
import { colors, radius, spacing } from '../theme/designTokens';

export default function QuotePreviewScreen() {
  const route = useRoute<any>();
  const quoteId: number = route.params?.quoteId;
  const { user } = useAuthStore();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getQuote(quoteId).then(setQuote).catch(() => setQuote(null)).finally(() => setLoading(false));
  }, [quoteId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleExport = () => {
    // ★ v18.40 — 서버에서 만든 진짜 엑셀(.xlsx)과 PDF를 브라우저로 내려받음 (기존 CSV 텍스트 공유는 대체)
    Alert.alert('자료 저장', '어떤 형식으로 저장할까요?', [
      { text: '취소', style: 'cancel' },
      // ★ v18.40 — 진짜 엑셀(.xlsx) 파일로 다운로드
      {
        text: 'Excel',
        onPress: () => downloadQuoteXlsx(quote!.id).catch((e: any) =>
          Alert.alert('엑셀 저장 실패', e?.response?.data?.message || '엑셀 파일을 만들지 못했습니다.')),
      },
      {
        text: 'PDF',
        onPress: () => downloadQuotePdf(quote!.id).catch((e: any) =>
          Alert.alert('PDF 저장 실패', e?.response?.data?.message || 'PDF를 만들지 못했습니다.')),
      },
    ]);
  };

  // ★ v18.38 — 실제 발송: 견적서 PDF 링크(30일 유효)를 카톡·문자 공유창으로 고객에게 전달하고 발송 상태로 표시
  const handleSend = async () => {
    if (!quote) return;
    setSending(true);
    try {
      const url = await getQuoteShareUrl(quoteId);
      const message = [
        `[견적서] ${quote.client_name ? `${quote.client_name}님, ` : ''}요청하신 견적서를 보내드립니다.`,
        `총 견적가: ${formatMoney(quote.total_amount)}원`,
        `견적서 보기(PDF): ${url}`,
        user?.name ? `- ${user.name}${user.phone ? ` (${user.phone})` : ''} 드림` : '',
      ].filter(Boolean).join('\n');

      const result = await Share.share({ message });
      if (result.action === Share.dismissedAction) return;
      if (quote.status !== 'draft') return;

      // 안드로이드는 공유창을 그냥 닫아도 "공유함"으로 돌아와서, 실제로 보냈는지 한 번 확인
      Alert.alert('발송 확인', '고객에게 견적서를 보내셨나요?\n발송 상태로 표시할게요. (링크는 30일 동안 열 수 있어요)', [
        { text: '아니요', style: 'cancel' },
        {
          text: '네, 보냈어요',
          onPress: async () => {
            try {
              await updateQuoteStatus(quoteId, 'sent');
              setQuote({ ...quote, status: 'sent' });
            } catch (e: any) {
              Alert.alert('실패', e?.response?.data?.message || '상태 변경에 실패했습니다.');
            }
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('발송 실패', e?.response?.data?.message || '견적서 링크를 만들지 못했습니다.');
    } finally {
      setSending(false);
    }
  };

  if (loading || !quote) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="견적서 미리보기" />
        <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  const siteLabel = quote.site ? [quote.site.apt_name, quote.site.dong, quote.site.ho].filter(Boolean).join(' ') || quote.site.address : quote.address;

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="견적서 미리보기" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sheet}>
          <View style={styles.sheetTop}>
            <Text style={styles.sheetTitle}>견 적 서</Text>
            <Text style={styles.sheetNo}>No. E-{quote.id}{'\n'}{quote.created_at ? quote.created_at.slice(0, 10).replace(/-/g, '.') : ''}</Text>
          </View>
          <View style={styles.partyBox}>
            <View style={styles.partyCol}>
              <Text style={styles.partyLabel}>수신</Text>
              <Text style={styles.partyBold}>{quote.client_name ? `${quote.client_name} 귀하` : '-'}</Text>
              <Text style={styles.partyText}>{siteLabel ?? '-'}</Text>
            </View>
            <View style={styles.partyCol}>
              <Text style={styles.partyLabel}>공급자</Text>
              <Text style={styles.partyBold}>{user?.name ?? '-'}</Text>
              <Text style={styles.partyText}>{user?.phone ?? ''}</Text>
            </View>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.totalLineLabel}>합계 금액</Text>
            <Text style={styles.totalLineValue}>{formatMoney(quote.total_amount)}원</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.tableHeadRow}>
              <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>항목</Text>
              <Text style={[styles.tableHeadCell, { flex: 1.4 }]}>수량·단가</Text>
              <Text style={[styles.tableHeadCell, { flex: 1, textAlign: 'right' }]}>금액</Text>
            </View>
            {(quote.lines ?? []).map((l, i) => (
              <View key={l.id ?? i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.2 }]}>{l.name}</Text>
                <Text style={[styles.tableCellSub, { flex: 1.4 }]}>{l.quantity}{l.unit} × {formatMoney(l.unit_price)}원</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>{formatMoney(l.amount ?? Number(l.quantity) * Number(l.unit_price))}원</Text>
              </View>
            ))}
          </View>
          <View style={styles.sumBox}>
            <Text style={styles.sumText}>공급가 {formatMoney(quote.subtotal_amount)}원</Text>
            <Text style={styles.sumSub}>부가세 별도</Text>
          </View>
          {!!quote.memo && <Text style={styles.remark}>비고: {quote.memo}</Text>}
        </View>

        <View style={styles.footerRow}>
          <Pressable style={styles.pdfBtn} onPress={handleExport}>
            <Icon name="tray-arrow-down" size={18} color={colors.primaryDark} />
            <Text style={styles.pdfBtnText}>파일 저장</Text>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={handleSend} disabled={sending}>
            <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.sendBtn, sending && { opacity: 0.7 }]}>
              {sending ? <ActivityIndicator color="#FFFFFF" /> : (
                <>
                  <Icon name="share-variant" size={18} color="#FFFFFF" />
                  <Text style={styles.sendBtnText}>고객에게 발송</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EEF3F9' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },

  sheet: { backgroundColor: '#FFFFFF', borderRadius: 6, padding: 20, gap: 14, shadowColor: '#102A56', shadowOpacity: 0.1, shadowRadius: 20, elevation: 3 },
  sheetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sheetTitle: { fontSize: 22, fontWeight: '800', letterSpacing: 8, color: colors.textPrimary },
  sheetNo: { fontSize: 10, color: colors.textSecondary, textAlign: 'right' },
  partyBox: { flexDirection: 'row', gap: 10, padding: 10, backgroundColor: colors.background, borderRadius: 6 },
  partyCol: { flex: 1, gap: 3 },
  partyLabel: { fontSize: 10, color: colors.textSecondary },
  partyBold: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  partyText: { fontSize: 12, color: colors.textPrimary },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 2, borderTopColor: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: '#E8EEF5' },
  totalLineLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  totalLineValue: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  table: { gap: 0 },
  tableHeadRow: { flexDirection: 'row', backgroundColor: '#EEF5FD', paddingVertical: 7, paddingHorizontal: 6 },
  tableHeadCell: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#E8EEF5' },
  tableCell: { fontSize: 12, color: colors.textPrimary },
  tableCellSub: { fontSize: 11, color: colors.textSecondary },
  sumBox: { alignItems: 'flex-end', gap: 4 },
  sumText: { fontSize: 12, color: colors.textPrimary },
  sumSub: { fontSize: 12, color: colors.textSecondary },
  remark: { fontSize: 11, color: colors.textSecondary, lineHeight: 16 },

  footerRow: { flexDirection: 'row', gap: 10 },
  pdfBtn: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: '#BFDBFB', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pdfBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  sendBtn: { height: 48, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
