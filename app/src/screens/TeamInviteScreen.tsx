/**
 * 팀 초대 화면 — v18.34 (DESIGN-CANVAS 기준, TEAM_INVITE.dc.html)
 * ★ QR 코드는 실제 스캔 가능한 QR이 아니라 디자인 원본과 동일한 장식용 패턴임
 *   (원본 자체도 정적 장식 그리드였음 — 실제 QR 생성 라이브러리는 미설치).
 *   카카오톡/문자/더보기는 카카오 전용 공유 SDK 연동 전이라 OS 공유 시트로 동작함.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Share, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import AppHeader from '../components/AppHeader';
import { getMyTeams } from '../api/teamApi';
import type { Team } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';

function seededGrid(seed: string, size: number): boolean[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const cells: boolean[] = [];
  for (let i = 0; i < size * size; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    cells.push((h >>> 16) % 3 !== 0);
  }
  return cells;
}

export default function TeamInviteScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const teamId: number = route.params?.teamId;
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getMyTeams()
        .then(teams => setTeam(teams.find(t => t.id === teamId) ?? null))
        .finally(() => setLoading(false));
    }, [teamId]),
  );

  const grid = useMemo(() => seededGrid(team?.invite_code || 'WORKMATE', 15), [team?.invite_code]);

  const shareMessage = team
    ? `[WorkMate] "${team.name}" 팀 초대\n초대 코드: ${team.invite_code}\n앱에서 "코드로 참여"를 눌러 코드를 입력하면 바로 합류할 수 있어요.`
    : '';

  const handleShare = () => {
    Share.share({ message: shareMessage }).catch(() => {});
  };

  const handleCopyCode = () => {
    if (!team) return;
    Clipboard.setString(team.invite_code);
    Alert.alert('복사 완료', '초대 코드가 복사되었습니다.');
  };

  if (loading || !team) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="팀 초대" />
        <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="팀 초대" onBackPress={() => navigation.navigate('TeamDetail', { teamId })} />
      <View style={styles.content}>
        <View style={styles.introBlock}>
          <View style={styles.introIcon}>
            <Icon name="account-plus-outline" size={32} color={colors.primaryDark} />
          </View>
          <Text style={styles.introText}>초대 코드로 팀원을{'\n'}간편하게 초대하세요</Text>
          <Text style={styles.introTeam}>{team.name}</Text>
        </View>

        <View style={styles.codeCard}>
          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{team.invite_code}</Text>
            <Pressable style={styles.copyBtn} onPress={handleCopyCode}>
              <Icon name="content-copy" size={18} color={colors.primaryDark} />
            </Pressable>
          </View>
          <Text style={styles.codeHint}>팀원에게 이 코드를 전달해 "코드로 참여"로 가입하게 하세요.</Text>

          <View style={styles.qrBox}>
            {grid.map((on, i) => (
              <View
                key={i}
                style={{ width: '6.666%', height: 8, backgroundColor: on ? colors.textPrimary : 'transparent' }}
              />
            ))}
          </View>
        </View>

        <View style={styles.shareRow}>
          <Pressable style={styles.shareItem} onPress={handleShare}>
            <View style={[styles.shareIcon, { backgroundColor: colors.warningBg }]}>
              <Icon name="chat-outline" size={22} color={colors.accentDark} />
            </View>
            <Text style={styles.shareLabel}>카카오톡</Text>
          </Pressable>
          <Pressable style={styles.shareItem} onPress={handleShare}>
            <View style={[styles.shareIcon, { backgroundColor: colors.successBg }]}>
              <Icon name="message-text-outline" size={22} color={colors.secondary} />
            </View>
            <Text style={styles.shareLabel}>문자</Text>
          </Pressable>
          <Pressable style={styles.shareItem} onPress={handleCopyCode}>
            <View style={[styles.shareIcon, { backgroundColor: '#E8F3FF' }]}>
              <Icon name="link-variant" size={22} color={colors.primaryDark} />
            </View>
            <Text style={styles.shareLabel}>코드 복사</Text>
          </Pressable>
          <Pressable style={styles.shareItem} onPress={handleShare}>
            <View style={[styles.shareIcon, { backgroundColor: '#EEF2F7' }]}>
              <Icon name="dots-horizontal" size={22} color={colors.textSecondary} />
            </View>
            <Text style={styles.shareLabel}>더보기</Text>
          </Pressable>
        </View>

        <Pressable onPress={handleShare}>
          <LinearGradient
            colors={[colors.primaryLight, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.button}
          >
            <Icon name="share-variant" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>코드 공유하기</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },

  introBlock: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm },
  introIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#E8F3FF', alignItems: 'center', justifyContent: 'center' },
  introText: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', lineHeight: 24 },
  introTeam: { fontSize: 13, color: colors.textSecondary },

  codeCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderCard,
    padding: spacing.lg, gap: spacing.sm, alignItems: 'center',
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  codeText: { fontSize: 30, fontWeight: '800', letterSpacing: 6, color: colors.textPrimary },
  copyBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center' },
  codeHint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  qrBox: {
    width: 140, height: 140, padding: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, flexDirection: 'row', flexWrap: 'wrap',
  },

  shareRow: { flexDirection: 'row', justifyContent: 'space-around' },
  shareItem: { alignItems: 'center', gap: 6 },
  shareIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  shareLabel: { fontSize: 12, color: colors.textPrimary },

  button: { height: 52, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 'auto' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
