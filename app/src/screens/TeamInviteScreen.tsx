/**
 * 팀 초대 화면 — DESIGN-CANVAS 기준, TEAM_INVITE.dc.html (★ v18.43 개편)
 * QR 대신 "링크 공유하기"(카톡·문자 등 공유 시트) + "연락처에서 초대"(문자앱으로 여러 명에게).
 * 초대 코드·링크는 7일 유효 — 화면을 열 때 만료됐으면 서버가 새 코드를 만들어 줌.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Share, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import dayjs from 'dayjs';
import AppHeader from '../components/AppHeader';
import { getTeamInvite } from '../api/teamApi';
import type { TeamInviteInfo } from '../api/teamApi';
import { colors, spacing } from '../theme/designTokens';
import { ICONS } from '../assets/icons';

// 초대 문구 — 연락처 초대(문자)에서도 같이 씀
export function inviteMessage(invite: TeamInviteInfo): string {
  return `[WorkMate] "${invite.team_name}" 팀에 초대합니다.\n아래 링크를 눌러 참여해 주세요.\n${invite.invite_url}\n(초대 코드: ${invite.invite_code})`;
}

export default function TeamInviteScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const teamId: number = route.params?.teamId;
  const [invite, setInvite] = useState<TeamInviteInfo | null>(null);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setFailed(false);
      getTeamInvite(teamId).then(setInvite).catch(() => setFailed(true));
    }, [teamId]),
  );

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
    Alert.alert('복사 완료', '초대 코드가 복사되었습니다.');
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
        </View>

        <View style={styles.hintBox}>
          <Icon name="information-outline" size={16} color={colors.primaryDark} style={{ marginTop: 2 }} />
          <Text style={styles.hintText}>링크를 받은 사람이 앱이 없으면 설치 안내 페이지가 열리고, 설치 후 바로 팀 참여 화면으로 이어져요.</Text>
        </View>
      </ScrollView>
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

  hintBox: { flexDirection: 'row', gap: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#E8F3FF', borderRadius: 12 },
  hintText: { flex: 1, fontSize: 13, lineHeight: 20, color: colors.primaryDark },
});
