// ★ v18.51 — 디자인 MY_LOGIN_LINKS: 내 정보 › 로그인 연결 관리 (카카오·구글 연결/해제, 이메일·비밀번호 표시)
//   ★ v18.60 Apple 줄 — 아이폰에서만(안드로이드는 이미 연결된 경우에만 보여서 해제 가능)
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../components/AppHeader';
import GradientButton from '../components/GradientButton';
import { ProviderBadge } from '../components/AuthUi';
import {
  getLoginLinks, linkSocial, unlinkSocial, isSocialCancel, LoginLinks, PROVIDER_NAME, SocialProvider, APPLE_LOGIN_AVAILABLE,
} from '../api/socialAuthApi';

const GA: Record<SocialProvider, string> = { kakao: '카카오가', google: '구글이', apple: 'Apple이' };
const REUL: Record<SocialProvider, string> = { kakao: '카카오를', google: '구글을', apple: 'Apple을' };
const fmt = (d: string | null) => (d ? d.replace(/-/g, '.') : '');

export default function MyLoginLinksScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [links, setLinks] = useState<LoginLinks | null>(null);
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [confirm, setConfirm] = useState<SocialProvider | null>(null);
  const [fail, setFail] = useState<SocialProvider | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  useFocusEffect(useCallback(() => { getLoginLinks().then(setLinks).catch(() => {}); }, []));

  // ★ v18.52 — 비밀번호 설정/변경 화면에서 돌아올 때 완료 토스트
  useEffect(() => {
    if (route.params?.toast) {
      showToast(route.params.toast);
      navigation.setParams({ toast: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.toast]);

  const connect = async (p: SocialProvider) => {
    setBusy(p);
    try {
      setLinks(await linkSocial(p));
      showToast(`${GA[p]} 연결됐어요`);
    } catch (e: any) {
      if (isSocialCancel(e)) return;
      if (e?.response?.data?.error_code === 'ERR_AUTH_014') setFail(p);
      else showToast(e?.response?.data?.message ?? '연결하지 못했어요. 다시 시도해주세요.');
    } finally {
      setBusy(null);
    }
  };

  const doUnlink = async () => {
    const p = confirm;
    if (!p) return;
    setConfirm(null);
    setBusy(p);
    try {
      setLinks(await unlinkSocial(p));
      showToast(`${PROVIDER_NAME[p]} 연결을 해제했어요`);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? '해제하지 못했어요.');
    } finally {
      setBusy(null);
    }
  };

  const onlyOne = !!links && links.count === 1 && (links.kakao.linked || links.google.linked || !!links.apple?.linked);

  const renderRow = (p: SocialProvider) => {
    if (!links) return null;
    const row = links[p];
    const locked = row.linked && links.count === 1;
    return (
      <View key={p} style={[styles.rowWrap, styles.rowLine]}>
        <View style={styles.row}>
          <ProviderBadge provider={p} />
          <View style={styles.rowText}>
            <Text style={styles.rowName}>{PROVIDER_NAME[p]}</Text>
            <Text style={[styles.rowStatus, { color: row.linked ? '#0B8574' : '#5F7290' }]}>
              {row.linked ? `연결됨${row.linked_at ? ' · ' + fmt(row.linked_at) : ''}` : '연결 안 됨'}
            </Text>
          </View>
          {busy === p ? (
            <ActivityIndicator color="#0A6CE0" style={{ width: 56 }} />
          ) : row.linked ? (
            <Pressable
              onPress={() => setConfirm(p)}
              disabled={locked}
              style={[styles.smallBtn, locked ? styles.btnLocked : styles.btnGhost]}
              accessibilityRole="button"
              accessibilityState={{ disabled: locked }}
              accessibilityHint={locked ? '최소 하나의 로그인 방법이 필요해요' : undefined}
            >
              <Text style={[styles.smallText, { color: locked ? '#A9B6C8' : '#3B4F70' }]}>해제</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => connect(p)} disabled={busy !== null} accessibilityRole="button">
              <LinearGradient colors={['#2492FF', '#0A6CE0']} style={[styles.smallBtn, { borderWidth: 0 }]}>
                <Text style={[styles.smallText, { color: '#FFFFFF' }]}>연결</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
        {locked && (
          <View style={styles.why}>
            <Icon name="information-outline" size={13} color="#B95E00" />
            <Text style={styles.whyText}>최소 하나의 로그인 방법이 필요해요</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="로그인 연결 관리" />
      <ScrollView contentContainerStyle={styles.main}>
        <Text style={styles.lead}>연결해 둔 방법 중 아무거나로 로그인할 수 있어요.</Text>

        <View style={styles.card}>
          {!links ? (
            <ActivityIndicator color="#0A6CE0" style={{ paddingVertical: 40 }} />
          ) : (
            <>
              <Text style={styles.count}>로그인 방법 {links.count}개 사용 중</Text>
              {renderRow('kakao')}
              {renderRow('google')}
              {(APPLE_LOGIN_AVAILABLE || links.apple?.linked) && renderRow('apple')}
              <View style={[styles.row, { paddingVertical: 14 }]}>
                <ProviderBadge provider="email" />
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>이메일 · 비밀번호</Text>
                  {links.email.set ? (
                    <Text style={[styles.rowStatus, { color: '#0B8574' }]} numberOfLines={1}>
                      설정됨{links.email.email ? ' · ' + links.email.email : ''}
                    </Text>
                  ) : (
                    <Text style={[styles.rowStatus, { color: '#5F7290' }]}>설정 안 됨</Text>
                  )}
                </View>
                {/* ★ v18.52 — 설정 안 됨: [설정](파란 버튼) / 설정됨: [변경](테두리 버튼) */}
                {links.email.set ? (
                  <Pressable
                    onPress={() => navigation.navigate('MyPassword', { mode: 'change', email: links.email.email })}
                    style={[styles.smallBtn, styles.btnGhost]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.smallText, { color: '#3B4F70' }]}>변경</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => navigation.navigate('MyPassword', { mode: 'set', email: links.email.email })} accessibilityRole="button">
                    <LinearGradient colors={['#2492FF', '#0A6CE0']} style={[styles.smallBtn, { borderWidth: 0 }]}>
                      <Text style={[styles.smallText, { color: '#FFFFFF' }]}>설정</Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>

        {onlyOne && (
          <View style={[styles.note, { backgroundColor: '#FFF1DE' }]}>
            <Icon name="information-outline" size={16} color="#E07E00" style={{ marginTop: 1 }} />
            <Text style={[styles.noteText, { color: '#E07E00' }]}>
              로그인 방법이 하나만 남아 있어서 해제할 수 없어요. 다른 방법을 먼저 연결해주세요.
            </Text>
          </View>
        )}
        <View style={[styles.note, { backgroundColor: '#E8F3FF' }]}>
          <Icon name="information-outline" size={16} color="#0A6CE0" style={{ marginTop: 1 }} />
          <Text style={[styles.noteText, { color: '#0A6CE0' }]}>연결을 해제해도 일정 · 수입 · 견적서 기록은 그대로 남아요.</Text>
        </View>
      </ScrollView>

      {!!toast && (
        <Pressable onPress={() => setToast('')} style={styles.toast} accessibilityLiveRegion="polite">
          <View style={styles.toastDot}><Icon name="check" size={14} color="#FFFFFF" /></View>
          <Text style={styles.toastText}>{toast}</Text>
        </Pressable>
      )}

      {/* 해제 확인 */}
      <Modal transparent statusBarTranslucent visible={!!confirm} animationType="fade" onRequestClose={() => setConfirm(null)}>
        <View style={styles.dim}>
          <View style={styles.dialog} accessibilityRole="alert">
            <Text style={styles.dTitle}>{confirm ? PROVIDER_NAME[confirm] : ''} 연결을 해제할까요?</Text>
            <Text style={styles.dDesc}>해제하면 {confirm ? PROVIDER_NAME[confirm] : ''}로 로그인할 수 없어요.</Text>
            <View style={styles.dBtns}>
              <Pressable onPress={() => setConfirm(null)} style={[styles.dBtn, { borderColor: '#DDEAF7', backgroundColor: '#FFFFFF' }]}>
                <Text style={[styles.dBtnText, { color: '#3B4F70' }]}>취소</Text>
              </Pressable>
              <Pressable onPress={doUnlink} style={[styles.dBtn, { borderColor: '#FFD5D6', backgroundColor: '#FFF2F2' }]}>
                <Text style={[styles.dBtnText, { color: '#E5484D' }]}>해제</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 연결 실패 — 이미 다른 계정에 연결된 소셜 계정 */}
      <Modal transparent statusBarTranslucent visible={!!fail} animationType="fade" onRequestClose={() => setFail(null)}>
        <View style={styles.dim}>
          <View style={[styles.dialog, { alignItems: 'center' }]} accessibilityRole="alert">
            <View style={styles.failIcon}><Icon name="information-outline" size={26} color="#B95E00" /></View>
            <Text style={[styles.dTitle, { marginTop: 4, textAlign: 'center' }]}>{fail ? REUL[fail] : ''} 연결하지 못했어요</Text>
            <Text style={[styles.dDesc, { textAlign: 'center' }]}>
              이미 다른 WorkMate 계정에 연결된{'\n'}{fail ? PROVIDER_NAME[fail] : ''} 계정이에요.
            </Text>
            <Text style={styles.failSub}>
              그 계정에서 먼저 연결을 해제하거나{'\n'}다른 {fail ? PROVIDER_NAME[fail] : ''} 계정으로 시도해주세요.
            </Text>
            <GradientButton onPress={() => setFail(null)} height={48} style={{ alignSelf: 'stretch', marginTop: 6 }}>확인</GradientButton>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7FBFF' },
  main: { paddingTop: 4, paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  lead: { fontSize: 14, lineHeight: 22, color: '#5F7290' },
  card: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6F0FA', borderRadius: 16, paddingHorizontal: 16,
    shadowColor: '#102A56', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  count: { fontSize: 12, color: '#5F7290', paddingTop: 12 },
  rowWrap: { gap: 6, paddingVertical: 14 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: '#EDF3FA' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '700', color: '#102A56' },
  rowStatus: { fontSize: 12, fontWeight: '600' },
  smallBtn: { height: 36, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  btnGhost: { borderColor: '#DDEAF7', backgroundColor: '#FFFFFF' },
  btnLocked: { borderColor: '#E6ECF3', backgroundColor: '#F3F6FA' },
  smallText: { fontSize: 13, fontWeight: '700' },
  why: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 52 },
  whyText: { fontSize: 12, fontWeight: '600', color: '#B95E00' },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19 },
  toast: {
    position: 'absolute', left: 16, right: 16, bottom: 24, zIndex: 25, paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, backgroundColor: 'rgba(16,42,86,0.94)', flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  toastDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#2CC4B2', alignItems: 'center', justifyContent: 'center' },
  toastText: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  dim: { flex: 1, backgroundColor: 'rgba(16,42,86,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, paddingTop: 24, paddingHorizontal: 22, paddingBottom: 20, gap: 10 },
  dTitle: { fontSize: 18, fontWeight: '800', color: '#102A56' },
  dDesc: { fontSize: 14, lineHeight: 22, color: '#5F7290' },
  dBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dBtnText: { fontSize: 15, fontWeight: '700' },
  failIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF2E2', alignItems: 'center', justifyContent: 'center' },
  failSub: { fontSize: 12, lineHeight: 19, color: '#8FA3BF', textAlign: 'center' },
});
