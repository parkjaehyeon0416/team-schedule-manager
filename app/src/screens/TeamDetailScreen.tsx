/**
 * 팀 상세 화면 — v18.34 (DESIGN-CANVAS 기준, TEAM_DETAIL.dc.html)
 * 탭: 팀 정보 / 팀원 / 팀 일정 / 활동 내역
 * ★ "활동 내역"은 실시간 활동 피드 백엔드가 없어 항상 빈 상태로 표시됨
 *   (가짜 데이터로 채우지 않음). "팀 설명/주요 공정/팀장"도 백엔드에 해당
 *   필드가 없어 표시하지 않고, 실제로 있는 필드(팀명/생성일/초대코드)만 보여줌.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, ScrollView, Image, Linking } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import AppHeader from '../components/AppHeader';
import { getMyTeams, getTeamMembers, leaveTeam } from '../api/teamApi';
import { getSchedules } from '../api/schedulesApi';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import type { Team, TeamMember, Schedule } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';
import { scheduleLocationLabel } from '../utils/scheduleLocation';

const TABS = ['팀 정보', '팀원', '팀 일정', '활동 내역'];

export default function TeamDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const teamId: number = route.params?.teamId;

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [teams, memberList] = await Promise.all([getMyTeams(), getTeamMembers(teamId)]);
      setTeam(teams.find(t => t.id === teamId) ?? null);
      setMembers(memberList);
      const now = new Date();
      const list = await getSchedules(now.getFullYear(), now.getMonth() + 1);
      setSchedules(list.filter(s => s.team_id === teamId));
    } catch {
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleLeave = () => {
    if (!team) return;
    Alert.alert('팀 나가기', `정말 "${team.name}"에서 나가시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveTeam(team.id);
            navigation.popTo('TeamList');
          } catch (e: any) {
            Alert.alert('실패', e?.response?.data?.message || '팀 나가기에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const handleMemberPress = (m: TeamMember) => {
    const actions: { text: string; onPress?: () => void }[] = [];
    if (m.phone) actions.push({ text: `📞 ${m.phone} 전화하기`, onPress: () => Linking.openURL(`tel:${m.phone}`) });
    if (m.kakao_talk_id) {
      actions.push({
        text: `💬 카카오톡 ID 복사 (${m.kakao_talk_id})`,
        onPress: () => { Clipboard.setString(m.kakao_talk_id!); Alert.alert('복사 완료', '카카오톡 아이디가 복사되었습니다.'); },
      });
    }
    actions.push({ text: '닫기' });
    Alert.alert(m.name, undefined, actions as any);
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="팀 상세" />
        <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="팀 상세" />
        <View style={styles.centerBox}><Text style={styles.emptyText}>팀 정보를 찾을 수 없습니다.</Text></View>
      </View>
    );
  }

  const createdDate = team.created_at
    ? new Date(team.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-';
  const lead = members.find(m => m.role_id <= 2);

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="팀 상세" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.coverBox}>
          <Icon name="account-group" size={28} color="#7F95B2" />
          <Text style={styles.coverText}>팀 대표 사진</Text>
        </View>

        <View style={styles.headRow}>
          <View style={styles.headIcon}>
            <Icon name="briefcase-outline" size={24} color={colors.primaryDark} />
          </View>
          <View style={styles.headTextBox}>
            <Text style={styles.headName}>{team.name}</Text>
            <Text style={styles.headSub}>팀원 {members.length}명 · 이번 달 일정 {schedules.length}건</Text>
          </View>
          {team.is_active && (
            <View style={styles.myRoleTag}>
              <Text style={styles.myRoleText}>내 역할 · {lead ? '팀장' : '팀원'}</Text>
            </View>
          )}
        </View>

        <View style={styles.tabRow}>
          {TABS.map((t, i) => (
            <Pressable key={t} style={[styles.tabChip, tab === i && styles.tabChipActive]} onPress={() => setTab(i)}>
              <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 0 && (
          <View style={styles.card}>
            {[
              { label: '팀명', value: team.name },
              { label: '생성일', value: createdDate },
              { label: '초대 코드', value: team.invite_code },
            ].map((r, i, arr) => (
              <View key={r.label} style={[styles.infoRow, i !== arr.length - 1 && styles.rowDivider]}>
                <Text style={styles.infoLabel}>{r.label}</Text>
                <Text style={styles.infoValue}>{r.value}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 1 && (
          <View style={styles.card}>
            {members.map((m, i) => {
              const isLead = m.role_id <= 2;
              const avatarUri = m.avatar_image_path ? `${SERVER_BASE_URL}/storage/${m.avatar_image_path}` : null;
              return (
                <Pressable
                  key={m.id}
                  style={[styles.memberRow, i !== members.length - 1 && styles.rowDivider]}
                  onPress={() => handleMemberPress(m)}
                >
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.memberAvatarImg} />
                  ) : (
                    <View style={[styles.memberAvatar, { backgroundColor: m.avatar_color || '#D6ECFF' }]}>
                      <Text style={styles.memberAvatarText}>{m.name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.rowTextBox}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <Text style={styles.memberSub}>{m.phone || '연락처 없음'}</Text>
                  </View>
                  <View style={[styles.roleTag, isLead ? styles.roleTagLead : styles.roleTagMember]}>
                    <Text style={[styles.roleTagText, { color: isLead ? '#B95E00' : colors.textSecondary }]}>
                      {isLead ? '팀장' : '팀원'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {tab === 2 && (
          schedules.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>이번 달 팀 일정이 없습니다.</Text></View>
          ) : (
            <View style={styles.card}>
              {schedules.map((s, i) => (
                <Pressable
                  key={s.id}
                  style={[styles.scheduleRow, i !== schedules.length - 1 && styles.rowDivider]}
                  onPress={() => navigation.navigate('ScheduleDetail', { id: s.id })}
                >
                  <View style={styles.scheduleIcon}>
                    <Icon name="calendar-month-outline" size={18} color={colors.accentDark} />
                  </View>
                  <View style={styles.rowTextBox}>
                    <Text style={styles.memberName}>
                      {scheduleLocationLabel(s) || s.work_type_relation?.name || s.work_type || '일정'}
                    </Text>
                    <Text style={styles.memberSub}>{s.date}</Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          )
        )}

        {tab === 3 && (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>아직 활동 내역이 없습니다.</Text></View>
        )}

        <View style={styles.footerRow}>
          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate('TeamCreate', { team })}>
            <Text style={styles.secondaryBtnText}>팀 정보 수정</Text>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('TeamInvite', { teamId: team.id })}>
            <LinearGradient
              colors={[colors.primaryLight, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.primaryBtn}
            >
              <Icon name="account-plus-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>팀원 초대</Text>
            </LinearGradient>
          </Pressable>
        </View>
        <Pressable onPress={handleLeave} style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
          <Text style={styles.leaveText}>팀 나가기</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  coverBox: {
    height: 140, borderRadius: radius.lg, backgroundColor: '#E9F1FA',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  coverText: { fontSize: 11, color: '#7F95B2' },

  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#E8F3FF', alignItems: 'center', justifyContent: 'center' },
  headTextBox: { flex: 1, minWidth: 0, gap: 3 },
  headName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  headSub: { fontSize: 13, color: colors.textSecondary },
  myRoleTag: { height: 24, paddingHorizontal: 9, borderRadius: 7, backgroundColor: '#FFF2E2', alignItems: 'center', justifyContent: 'center' },
  myRoleText: { fontSize: 12, fontWeight: '700', color: '#B95E00' },

  tabRow: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.sm, backgroundColor: '#EEF5FD' },
  tabChip: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 9 },
  tabChipActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: '#CFE3FA' },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  tabTextActive: { color: colors.primaryDark, fontWeight: '700' },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderCard, paddingHorizontal: spacing.md },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  infoRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 11 },
  infoLabel: { width: 78, fontSize: 13, color: colors.textSecondary },
  infoValue: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '500' },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  memberAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  memberAvatarText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  rowTextBox: { flex: 1, minWidth: 0, gap: 2 },
  memberName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  memberSub: { fontSize: 12, color: colors.textSecondary },
  roleTag: { height: 24, paddingHorizontal: 9, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  roleTagLead: { backgroundColor: '#FFF2E2' },
  roleTagMember: { backgroundColor: '#EEF2F7' },
  roleTagText: { fontSize: 12, fontWeight: '700' },

  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10 },
  scheduleIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.warningBg, alignItems: 'center', justifyContent: 'center' },

  emptyCard: {
    padding: spacing.xl, alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderCard,
  },
  emptyText: { color: colors.textSecondary, fontSize: 13 },

  footerRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  primaryBtn: { height: 48, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    flex: 1, height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: '#BFDBFB',
  },
  secondaryBtnText: { color: colors.primaryDark, fontSize: 15, fontWeight: '700' },
  leaveText: { fontSize: 13, color: colors.textSecondary, textDecorationLine: 'underline' },
});
