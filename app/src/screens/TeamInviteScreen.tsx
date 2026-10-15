/**
 * 팀 초대 화면 — DESIGN-CANVAS 기준, TEAM_INVITE.dc.html (★ v18.43 개편)
 * QR 대신 "링크 공유하기"(카톡·문자 등 공유 시트) + "연락처에서 초대"(문자앱으로 여러 명에게).
 * 초대 코드·링크는 7일 유효 — 화면을 열 때 만료됐으면 서버가 새 코드를 만들어 줌.
 * ★ v18.68 — 팀장·부팀장은 "새 코드 만들기"(TEAM_INVITE_NEW_CODE / _NEW_DONE): 기존 코드·링크는 바로 막힘.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Share, Alert, ActivityIndicator, Image, ScrollView, Modal } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from '../components/Gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import dayjs from 'dayjs';
import AppHeader from '../components/AppHeader';
import { MODAL_UNDER_SYSTEM_BARS } from '../components/ModalBottomSafeArea'; // ★ v18.70 QA — 확인 창 어두운 배경이 기기 바 뒤까지
import { getTeamInvite, regenerateTeamInvite } from '../api/teamApi';
import type { TeamInviteInfo } from '../api/teamApi';
import { colors, spacing } from '../theme/designTokens';
import { ICONS } from '../assets/icons';
import { isPlanLocked } from '../utils/planLock';

// 초대 문구 — 연락처 초대(문자)에서도 같이 씀
export function inviteMessage(invite: TeamInviteInfo): string {
  return `[현장메이트] "${invite.team_name}" 팀에 초대합니다.\n아래 링크를 눌러 참여해 주세요.\n${invite.invite_url}\n(초대 코드: ${invite.invite_code})`;
}

export default function TeamInviteScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const teamId: number = route.params?.teamId;
  const [invite, setInvite] = useState<TeamInviteInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const [ask, setAsk] = useState(false); // 새 코드 만들기 확인
  const [regenerating, setRegenerating] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const showToast = (t: string) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  };
  const hideToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast('');
  };

  useFocusEffect(
    useCallback(() => {
      setFailed(false);
      getTeamInvite(teamId).then(setInvite).catch(() => setFailed(true));
    }, [teamId]),
  );

  const doRegenerate = async () => {
    if (regenerating) return;
    setRegenerating(true);
    try {
      const next = await regenerateTeamInvite(teamId);
      setInvite(next);
      setAsk(false);
      showToast('새 초대 코드를 만들었어요');
    } catch (e: any) {
      setAsk(false);
      if (!isPlanLocked(e)) Alert.alert('새 코드를 만들지 못했어요', e?.response?.data?.message || '잠시 후 다시 시도해주세요.');
      // 403(팀장·부팀장 아님) — 권한이 바뀌었을 수 있어 초대 정보를 다시 불러와 버튼 노출을 맞춤
      if (e?.response?.status === 403) getTeamInvite(teamId).then(setInvite).catch(() => {});
    } finally {
      setRegenerating(false);
    }
  };

  if (!invite) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="팀 초대" />
        <View style={styles.centerBox}>
          {failed ? <Text style={styles.muted}>초대 정보를 불러오지 못했어요.</Text> : <ActivityIndicator color={colors.primary} />}
        </View>
      </View>
    );
  }

  const shareLink = () => Share.share({ message: inviteMessage(invite) }).catch(() => {});
  const copyCode = () => {
    Clipboard.setString(invite.invite_code);
    showToast('초대 코드를 복사했어요');
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="팀 초대" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Image source={ICONS.team} style={styles.introIcon} />
          <Text style={styles.introText}>함께 일할 팀원을{'\n'}초대하세요</Text>
          <Text style={styles.muted13}>{invite.team_name} · 팀원 {invite.member_count}명</Text>
        </View>

        <Pressable onPress={shareLink}>
          {({ pressed }) => (
            <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} style={[styles.actionPrimary, pressed && { opacity: 0.92 }]}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Icon name="link-variant" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.actionTitle, { color: '#FFFFFF' }]}>링크 공유하기</Text>
                <Text style={[styles.actionSub, { color: 'rgba(255,255,255,0.85)' }]}>카카오톡 · 문자 등으로 초대 링크를 보내요</Text>
              </View>
              <Icon name="chevron-right" size={18} color="#FFFFFF" />
            </LinearGradient>
          )}
        </Pressable>

        <Pressable style={styles.actionLine} onPress={() => navigation.navigate('TeamContactPick', { teamId })}>
          <View style={[styles.actionIcon, { backgroundColor: '#EAF4FF' }]}>
            <Icon name="account-multiple-outline" size={22} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.actionTitle}>연락처에서 초대</Text>
            <Text style={styles.actionSub}>연락처에서 골라 초대 문자를 보내요</Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.codeCard}>
          <View style={styles.codeRow}>
            <View style={{ gap: 2 }}>
              <Text style={styles.codeLabel}>초대 코드</Text>
              <Text style={styles.code}>{invite.invite_code}</Text>
            </View>
            <Pressable style={styles.copyBtn} onPress={copyCode}>
              <Icon name="content-copy" size={16} color={colors.primaryDark} />
              <Text style={styles.copyText}>복사</Text>
            </Pressable>
          </View>
          <Text style={styles.muted}>링크 · 코드 모두 7일간 유효해요 · {dayjs(invite.expires_at).format('YYYY.MM.DD')} 만료</Text>
          {!!invite.can_regenerate && (
            <>
              <View style={styles.codeDivider} />
              <Pressable style={({ pressed }) => [styles.newCodeBtn, pressed && styles.newCodeBtnPressed]} onPress={() => setAsk(true)} accessibilityRole="button">
                <Icon name="swap-horizontal" size={16} color="#3B4F70" />
                <Text style={styles.newCodeText}>새 코드 만들기</Text>
              </Pressable>
              <Text style={styles.newCodeHelp}>코드나 링크가 엉뚱한 사람에게 갔다면 새로 만들어 주세요.</Text>
            </>
          )}
        </View>

        <View style={styles.hintBox}>
          <Icon name="information-outline" size={16} color={colors.primaryDark} style={{ marginTop: 2 }} />
          <Text style={styles.hintText}>링크를 받은 사람이 앱이 없으면 설치 안내 페이지가 열리고, 설치 후 바로 팀 참여 화면으로 이어져요.</Text>
        </View>
      </ScrollView>

      {!!toast && (
        <Pressable onPress={hideToast} style={styles.toast} accessibilityRole="text" accessibilityHint="눌러서 닫기" accessibilityLiveRegion="polite">
          <View style={styles.toastCheck}><Icon name="check" size={14} color="#FFFFFF" /></View>
          <Text style={styles.toastText}>{toast}</Text>
        </Pressable>
      )}

      {/* ── 새 초대 코드 확인 (TEAM_INVITE_NEW_CODE) ── */}
      <Modal transparent {...MODAL_UNDER_SYSTEM_BARS} visible={ask} animationType="fade" onRequestClose={() => { if (!regenerating) setAsk(false); }}>
        <View style={styles.dim}>
          <View style={styles.dialog} accessibilityRole="alert" accessibilityLabel="새 초대 코드 확인">
            <View style={styles.dialogIcon}><Icon name="swap-horizontal" size={26} color={colors.primaryDark} /></View>
            <Text style={styles.dialogTitle}>초대 코드를 새로 만들까요?</Text>
            <Text style={styles.dialogDesc}>기존 코드와 링크는 바로 막혀요.{'\n'}이미 보낸 초대도 새 링크로 다시 보내야 해요.</Text>
            <View style={styles.dialogBtns}>
              <Pressable onPress={() => setAsk(false)} disabled={regenerating} style={[styles.dialogBtn, styles.dialogCancel]} accessibilityRole="button">
                <Text style={[styles.dialogBtnText, styles.dialogCancelText]}>취소</Text>
              </Pressable>
              <Pressable onPress={doRegenerate} disabled={regenerating} style={styles.dialogBtnWrap} accessibilityRole="button"
                accessibilityLabel="새로 만들기" accessibilityState={{ disabled: regenerating, busy: regenerating }}>
                <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.dialogBtn}>
                  {regenerating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.dialogBtnText, styles.dialogPrimaryText]}>새로 만들기</Text>}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingTop: 4, paddingBottom: spacing.xl, gap: 12 },

  intro: { alignItems: 'center', gap: 10, paddingTop: 8 },
  introIcon: { width: 80, height: 80, resizeMode: 'contain' },
  introText: { fontSize: 18, fontWeight: '800', lineHeight: 27, textAlign: 'center', color: colors.textPrimary },
  muted13: { fontSize: 13, color: colors.textSecondary },
  muted: { fontSize: 12, color: colors.textSecondary },

  actionPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16,
    shadowColor: '#0A6CE0', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  actionLine: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CFE3FA' },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  actionSub: { fontSize: 12, color: colors.textSecondary },

  codeCard: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6F0FA', borderRadius: 16, padding: 16, gap: 8,
    shadowColor: '#102A56', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  codeLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  code: { fontSize: 24, fontWeight: '800', letterSpacing: 5, color: colors.textPrimary },
  copyBtn: { height: 40, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#EAF4FF', flexDirection: 'row', alignItems: 'center', gap: 6 },
  copyText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  codeDivider: { height: 1, backgroundColor: colors.borderHairline, marginVertical: 4 },
  newCodeBtn: {
    height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  newCodeBtnPressed: { backgroundColor: '#F7FBFF' },
  newCodeText: { fontSize: 14, fontWeight: '700', color: '#3B4F70' },
  newCodeHelp: { fontSize: 12, lineHeight: 18, color: colors.textSecondary },

  hintBox: { flexDirection: 'row', gap: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#E8F3FF', borderRadius: 12 },
  hintText: { flex: 1, fontSize: 13, lineHeight: 20, color: colors.primaryDark },

  toast: {
    position: 'absolute', left: 16, right: 16, bottom: 24, zIndex: 25, paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: 12, backgroundColor: 'rgba(16,42,86,0.94)', flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  toastCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#2CC4B2', alignItems: 'center', justifyContent: 'center' },
  toastText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  dim: { flex: 1, backgroundColor: 'rgba(16,42,86,0.45)', justifyContent: 'center', padding: 24 },
  dialog: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingTop: 24, paddingHorizontal: 22, paddingBottom: 20, alignItems: 'center', gap: 10,
    shadowColor: '#102A56', shadowOpacity: 0.25, shadowRadius: 25, shadowOffset: { width: 0, height: 20 }, elevation: 8,
  },
  dialogIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center' },
  dialogTitle: { marginTop: 4, fontSize: 18, fontWeight: '800', lineHeight: 25, color: colors.textPrimary, textAlign: 'center' },
  dialogDesc: { fontSize: 14, lineHeight: 22, color: colors.textSecondary, textAlign: 'center' },
  dialogBtns: { flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 8 },
  dialogBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dialogCancel: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' },
  dialogBtnText: { fontSize: 15, fontWeight: '700' },
  dialogBtnWrap: { flex: 1 },
  dialogCancelText: { color: '#3B4F70' },
  dialogPrimaryText: { color: '#FFFFFF' },
});
