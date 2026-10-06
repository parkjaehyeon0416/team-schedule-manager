/**
 * 앱 정보 화면 — v18.34 (DESIGN-CANVAS 기준, APP_INFO.dc.html)
 * 내정보 > 앱 정보에서 진입.
 * 2026-10-02: 위치기반서비스 약관/오픈소스 라이선스/문의하기/회원탈퇴를 전부 실제
 * 동작으로 구현함(기존엔 "준비 중" 안내만 있었음). 사업자 정보는 디자인 원본의
 * 플레이스홀더([회사명] 등)를 그대로 유지 — 실제 사업자 정보로 교체 필요.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, Linking, Modal, TextInput, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import { withdrawAccount } from '../api/profileApi';
import { useAuthStore } from '../store/authStore';
import { colors, radius, spacing } from '../theme/designTokens';
import { ICONS } from '../assets/icons';
import type { IconKey } from '../assets/icons';

// ★ v18.36 — 디자인의 3D 아이콘(이미지)으로 교체
type Row = { key: string; image: IconKey; label: string; sub?: string; onPress: () => void };

const SUPPORT_EMAIL = '[support 이메일]';
const SUPPORT_PHONE = '[고객센터 번호]';

export default function AppInfoScreen() {
  const navigation = useNavigation<any>();
  const { logout } = useAuthStore();
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  // ★ v18.43 — 이메일·전화 대신 앱 안 고객 문의로
  const handleContact = () => navigation.navigate('InquiryList');

  const handleWithdraw = async () => {
    if (!password.trim()) {
      Alert.alert('입력 오류', '비밀번호를 입력해주세요.');
      return;
    }
    setWithdrawing(true);
    try {
      await withdrawAccount(password);
      setWithdrawVisible(false);
      await logout();
    } catch (e: any) {
      Alert.alert('탈퇴 실패', e?.response?.data?.message || '비밀번호를 확인해주세요.');
    } finally {
      setWithdrawing(false);
    }
  };

  const rows: Row[] = [
    { key: 'terms', image: 'doc', label: '이용약관', onPress: () => navigation.navigate('LegalDocument', { type: 'terms' }) },
    { key: 'privacy', image: 'privacy', label: '개인정보 처리방침', onPress: () => navigation.navigate('LegalDocument', { type: 'privacy' }) },
    { key: 'location', image: 'doc', label: '위치기반서비스 이용약관', onPress: () => navigation.navigate('LegalDocument', { type: 'location' }) },
    { key: 'oss', image: 'info', label: '오픈소스 라이선스', onPress: () => navigation.navigate('OpenSourceLicenses') },
    { key: 'contact', image: 'megaphone', label: '문의하기', sub: '고객지원', onPress: handleContact },
  ];

  const bizRows: { label: string; value: string }[] = [
    { label: '사업자', value: '[회사명]' },
    { label: '대표', value: '[대표자명]' },
    { label: '고객센터', value: SUPPORT_PHONE },
    { label: '이메일', value: SUPPORT_EMAIL },
  ];

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="앱 정보" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandBlock}>
          <Image source={ICONS.logo} style={styles.logo} />
          <Text style={styles.brandText}>
            Work<Text style={{ color: colors.primaryDark }}>Mate</Text>
          </Text>
          <Text style={styles.versionText}>현재 버전 v1.0.0 · 최신 버전입니다</Text>
        </View>

        <View style={styles.card}>
          {rows.map((row, i) => (
            <TouchableOpacity
              key={row.key}
              onPress={row.onPress}
              style={[styles.row, i !== rows.length - 1 && styles.rowDivider]}
            >
              <View style={styles.rowIcon}>
                <Image source={ICONS[row.image]} style={styles.rowIconImage} />
              </View>
              <Text style={styles.rowLabel}>{row.label}</Text>
              {!!row.sub && <Text style={styles.rowSub}>{row.sub}</Text>}
              <Icon name="chevron-right" size={16} color={colors.muted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bizCard}>
          {bizRows.map((r, i) => (
            <View key={r.label} style={[styles.bizRow, i !== bizRows.length - 1 && styles.rowDivider]}>
              <Text style={styles.bizLabel}>{r.label}</Text>
              <Text style={styles.bizValue}>{r.value}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.withdrawBtn} onPress={() => setWithdrawVisible(true)}>
          <Text style={styles.withdrawText}>회원 탈퇴</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={withdrawVisible} animationType="fade" transparent onRequestClose={() => setWithdrawVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>회원 탈퇴</Text>
            <Text style={styles.modalDesc}>
              탈퇴하면 계정이 삭제되고 모든 팀에서 자동으로 나가게 됩니다. 계속하려면 비밀번호를 입력해주세요.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              placeholderTextColor={colors.muted}
              secureTextEntry
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setWithdrawVisible(false)} disabled={withdrawing}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleWithdraw} disabled={withdrawing}>
                {withdrawing ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalConfirmText}>탈퇴하기</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },

  brandBlock: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  logo: { width: 80, height: 80, resizeMode: 'contain' },
  brandText: { fontSize: 21, fontWeight: '800', color: colors.textPrimary, marginTop: spacing.xs },
  versionText: { fontSize: 13, color: colors.textSecondary },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    paddingHorizontal: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 13 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  rowIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#F2F7FE', alignItems: 'center', justifyContent: 'center' },
  rowIconImage: { width: 28, height: 28, resizeMode: 'contain' },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  rowSub: { fontSize: 13, color: colors.textSecondary },

  bizCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    paddingHorizontal: spacing.md,
  },
  bizRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 9 },
  bizLabel: { width: 70, fontSize: 13, color: colors.textSecondary },
  bizValue: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },

  withdrawBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  withdrawText: { fontSize: 13, color: colors.textSecondary, textDecorationLine: 'underline' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,42,86,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  modalDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  modalInput: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, fontSize: 14, color: colors.textPrimary },
  modalBtnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  modalCancelBtn: { flex: 1, height: 46, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  modalConfirmBtn: { flex: 1, height: 46, borderRadius: radius.sm, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
