/**
 * 앱 정보 화면 — v18.34 (DESIGN-CANVAS 기준, APP_INFO.dc.html)
 * 내정보 > 앱 정보에서 진입.
 * 2026-10-02: 위치기반서비스 약관/오픈소스 라이선스/문의하기/회원탈퇴를 전부 실제
 * 동작으로 구현함(기존엔 "준비 중" 안내만 있었음).
 * ★ v18.70 — 이용약관·개인정보 처리방침은 이제 이 화면에만 있음(내정보에서 뺌).
 *   아래 정보 칸은 디자인 플레이스홀더([회사명]·[대표자명]·[고객센터 번호]) 대신 실제 운영자 정보
 *   (constants/operatorInfo — 사업자 등록 전이라 개인 개발자 표기, 전화번호 없음).
 *   버전 줄도 고정 글자(v1.0.0 · 최신 버전입니다) 대신 설치된 버전 + 서버 최신 버전과 비교한 결과.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, Linking, Modal, TextInput, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import AppHeader from '../components/AppHeader';
import axiosInstance from '../api/axiosInstance';
import { withdrawAccount, requestWithdraw, WithdrawMethod, WithdrawChannel } from '../api/profileApi';
import { getSocialCredential, isSocialCancel, SocialProvider } from '../api/socialAuthApi';
import { SocialButton } from '../components/AuthUi';
import { useAuthStore } from '../store/authStore';
import { colors, radius, spacing } from '../theme/designTokens';
import { ICONS } from '../assets/icons';
import type { IconKey } from '../assets/icons';
import { APP_VERSION } from '../constants/appVersion';
import { OPERATOR_INFO } from '../constants/operatorInfo';
import { openAppUpdate } from '../utils/appUpdate';
import {
  APP_PLATFORM,
  APP_VERSION_ENDPOINT,
  AppUpdateDetails,
  compareVersions,
  getAppVersion,
  parseUpdateDetails,
} from '../utils/appVersionInfo';

// ★ v18.36 — 디자인의 3D 아이콘(이미지)으로 교체
type Row = { key: string; image: IconKey; label: string; sub?: string; onPress: () => void };

export default function AppInfoScreen() {
  const navigation = useNavigation<any>();
  const { logout } = useAuthStore();
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  // ★ v18.63 — 본인 확인 방법: 비밀번호 / 문자·이메일 인증번호(비밀번호 없는 소셜 가입자) / 소셜 다시 로그인(둘 다 없는 경우)
  const [wm, setWm] = useState<WithdrawMethod | null>(null);
  const [sentTo, setSentTo] = useState<WithdrawChannel | null>(null); // 인증번호를 보낸 곳
  const [sending, setSending] = useState(false);
  const codeSent = !!sentTo;
  // ★ v18.70 — 서버의 최신 버전(GET /api/app/version). 못 받으면 null → "최신 버전입니다"를 함부로 쓰지 않음
  const [latest, setLatest] = useState<AppUpdateDetails | null>(null);
  const installedVersion = getAppVersion(); // 네이티브 모듈이 없는 빌드면 null(그땐 비교 안 함)

  useEffect(() => {
    if (!installedVersion) return;
    let alive = true;
    axiosInstance
      .get(APP_VERSION_ENDPOINT, { params: { platform: APP_PLATFORM, version: installedVersion }, timeout: 8000 })
      .then(res => {
        if (alive) setLatest(parseUpdateDetails(res.data));
      })
      .catch(() => {}); // 오프라인·서버 오류 → 버전만 보여 줌
    return () => {
      alive = false;
    };
  }, [installedVersion]);

  const hasNewer = !!installedVersion && !!latest?.latestVersion && compareVersions(installedVersion, latest.latestVersion) < 0;
  const isLatest = !!installedVersion && !!latest?.latestVersion && !hasNewer;

  // ★ v18.70 — 운영자 이메일: 메일 앱으로. 메일 앱이 없으면 주소를 보여 주고 복사할 수 있게
  const handleEmail = async () => {
    const email = OPERATOR_INFO.supportEmail;
    try {
      await Linking.openURL(`mailto:${email}?subject=${encodeURIComponent('[현장메이트] 문의')}`);
    } catch {
      Alert.alert('메일 앱을 열지 못했어요', email, [
        { text: '닫기', style: 'cancel' },
        { text: '주소 복사', onPress: () => Clipboard.setString(email) },
      ]);
    }
  };

  const openWithdraw = () => {
    setPassword('');
    setSentTo(null);
    setWm(null);
    setWithdrawVisible(true);
    requestWithdraw().then(setWm).catch(() => setWm({ method: 'password', channels: [], providers: [], minutes: 3 }));
  };

  const sendCode = async (ch: WithdrawChannel) => {
    setSending(true);
    try {
      setWm(await requestWithdraw(ch.type));
      setSentTo(ch);
      setPassword('');
    } catch (e: any) {
      Alert.alert('발송 실패', e?.response?.data?.message || '인증번호를 보내지 못했어요.');
    } finally {
      setSending(false);
    }
  };

  // ★ v18.43 — 이메일·전화 대신 앱 안 고객 문의로
  const handleContact = () => navigation.navigate('InquiryList');

  const finishWithdraw = async (body: Parameters<typeof withdrawAccount>[0]) => {
    setWithdrawing(true);
    try {
      await withdrawAccount(body);
      setWithdrawVisible(false);
      await logout();
    } catch (e: any) {
      if (!isSocialCancel(e)) Alert.alert('탈퇴 실패', e?.response?.data?.message || '본인 확인에 실패했어요.');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!password.trim()) {
      Alert.alert('입력 오류', wm?.method === 'code' ? '인증번호를 입력해주세요.' : '비밀번호를 입력해주세요.');
      return;
    }
    await finishWithdraw(wm?.method === 'code' && sentTo ? { channel: sentTo.type, code: password.trim() } : { password });
  };

  const handleSocialWithdraw = async (provider: SocialProvider) => {
    setWithdrawing(true);
    try {
      const { token } = await getSocialCredential(provider);
      await finishWithdraw({ provider, token });
    } catch (e: any) {
      setWithdrawing(false);
      if (!isSocialCancel(e)) Alert.alert('탈퇴 실패', '다시 로그인하지 못했어요.');
    }
  };

  const rows: Row[] = [
    { key: 'terms', image: 'doc', label: '이용약관', onPress: () => navigation.navigate('LegalDocument', { type: 'terms' }) },
    { key: 'privacy', image: 'privacy', label: '개인정보 처리방침', onPress: () => navigation.navigate('LegalDocument', { type: 'privacy' }) },
    { key: 'location', image: 'doc', label: '위치기반서비스 이용약관', onPress: () => navigation.navigate('LegalDocument', { type: 'location' }) },
    { key: 'oss', image: 'info', label: '오픈소스 라이선스', onPress: () => navigation.navigate('OpenSourceLicenses') },
    // ★ v18.70 — 고객 문의 전용 아이콘(내정보 '고객 문의'와 같은 것)
    { key: 'contact', image: 'inquiry', label: '문의하기', sub: '고객지원', onPress: handleContact },
  ];

  // ★ v18.70 — 운영자 정보(사업자 등록 전 → 개인 개발자). 누를 수 있는 값은 파란 글자
  //   사업자 등록 후 상호·대표자·사업자등록번호 줄은 constants/operatorInfo에 값을 넣고 여기 추가
  const bizRows: { label: string; value: string; onPress?: () => void }[] = [
    { label: '운영자', value: `${OPERATOR_INFO.name} (${OPERATOR_INFO.kind})` },
    { label: '이메일', value: OPERATOR_INFO.supportEmail, onPress: handleEmail },
    { label: '고객센터', value: '앱 고객 문의 (전화 상담 없음)', onPress: handleContact }, // 누르면 고객 문의 목록
  ];

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="앱 정보" />
      <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content}>
        <View style={styles.brandBlock}>
          <Image source={ICONS.logo} style={styles.logo} />
          <Text style={styles.brandText}>
            현장<Text style={{ color: colors.primaryDark }}>메이트</Text>
          </Text>
          <Text style={styles.versionText}>
            현재 버전 v{APP_VERSION}
            {isLatest ? ' · 최신 버전입니다' : hasNewer ? ` · 새 버전 v${latest?.latestVersion} 나왔어요` : ''}
          </Text>
          {hasNewer && (
            <TouchableOpacity
              style={styles.updateBtn}
              onPress={() => openAppUpdate(latest ? { ...latest, currentVersion: installedVersion } : null)}
              hitSlop={8}
            >
              <Text style={styles.updateBtnText}>업데이트</Text>
            </TouchableOpacity>
          )}
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
          {bizRows.map((r, i) => {
            const rowStyle = [styles.bizRow, i !== bizRows.length - 1 && styles.rowDivider];
            const content = (
              <>
                <Text style={styles.bizLabel}>{r.label}</Text>
                <Text style={[styles.bizValue, !!r.onPress && styles.bizValueLink]}>{r.value}</Text>
              </>
            );
            return r.onPress ? (
              <TouchableOpacity key={r.label} style={rowStyle} onPress={r.onPress} accessibilityRole="button">
                {content}
              </TouchableOpacity>
            ) : (
              <View key={r.label} style={rowStyle}>
                {content}
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.withdrawBtn} onPress={openWithdraw}>
          <Text style={styles.withdrawText}>회원 탈퇴</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={withdrawVisible} animationType="fade" transparent onRequestClose={() => setWithdrawVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>회원 탈퇴</Text>
            <Text style={styles.modalDesc}>
              탈퇴하면 계정이 삭제되고 모든 팀에서 자동으로 나가게 됩니다.{' '}
              {!wm ? '' : wm.method === 'password'
                ? '계속하려면 비밀번호를 입력해주세요.'
                : wm.method === 'code'
                  ? (sentTo ? `${sentTo.target}로 보낸 인증번호 6자리를 입력해주세요. (${wm.minutes}분간 유효)` : '본인 확인을 위해 인증번호를 받을 곳을 골라주세요.')
                  : '본인 확인을 위해 연결된 계정으로 다시 로그인해주세요.'}
            </Text>

            {!wm && <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.md }} />}

            {wm?.method === 'code' && !codeSent && wm.channels.map(ch => (
              <TouchableOpacity key={ch.type} style={styles.modalOutlineBtn} onPress={() => sendCode(ch)} disabled={sending}>
                {sending ? <ActivityIndicator color={colors.primary} size="small" /> : (
                  <Text style={styles.modalOutlineText}>{ch.type === 'phone' ? '문자로 받기' : '이메일로 받기'} · {ch.target}</Text>
                )}
              </TouchableOpacity>
            ))}

            {(wm?.method === 'password' || (wm?.method === 'code' && codeSent)) && (
              <TextInput
                style={styles.modalInput}
                value={password}
                onChangeText={setPassword}
                placeholder={wm.method === 'code' ? '인증번호 6자리' : '비밀번호'}
                placeholderTextColor={colors.muted}
                secureTextEntry={wm.method === 'password'}
                keyboardType={wm.method === 'code' ? 'number-pad' : 'default'}
                maxLength={wm.method === 'code' ? 6 : undefined}
                autoCapitalize="none"
              />
            )}
            {wm?.method === 'code' && sentTo && (
              <TouchableOpacity onPress={() => sendCode(sentTo)} disabled={sending} style={{ alignSelf: 'flex-end' }}>
                <Text style={styles.resendText}>인증번호 다시 받기</Text>
              </TouchableOpacity>
            )}

            {wm?.method === 'social' && wm.providers.map(p => (
              <SocialButton key={p} provider={p} onPress={() => handleSocialWithdraw(p)} disabled={withdrawing} />
            ))}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setWithdrawVisible(false)} disabled={withdrawing}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              {(wm?.method === 'password' || (wm?.method === 'code' && codeSent)) && (
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleWithdraw} disabled={withdrawing}>
                  {withdrawing ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalConfirmText}>탈퇴하기</Text>}
                </TouchableOpacity>
              )}
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
  bizValue: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  bizValueLink: { color: colors.primary },
  updateBtn: { marginTop: 2, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: '#EAF4FF' },
  updateBtnText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },

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
  modalOutlineBtn: { height: 46, borderRadius: radius.sm, borderWidth: 1, borderColor: '#BFDBFB', alignItems: 'center', justifyContent: 'center' },
  modalOutlineText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  resendText: { fontSize: 12, fontWeight: '600', color: colors.primary, paddingVertical: 4 },
});
