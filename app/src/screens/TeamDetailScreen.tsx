/**
 * 팀 상세 화면 — DESIGN-CANVAS 기준, TEAM_DETAIL.dc.html (★ v18.48 재구성)
 * 메뉴 타일(팀 공지 · 정산표[팀장] · 현장 앨범 · 근태 현황[팀장·부팀장]) + 탭(팀 정보 / 팀원 / 팀 일정 / 활동).
 * 팀원을 누르면 연락하기 시트, 팀장은 거기서 부팀장 지정/해제. 팀 나가기는 오른쪽 위 ⋯ 메뉴.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, ScrollView, Image, Linking } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import AppHeader from '../components/AppHeader';
import { getMyTeams, getTeamMembers, leaveTeam, setSubLeader, getTeamActivities } from '../api/teamApi';
import type { TeamActivity } from '../api/teamApi';
import { getSchedules } from '../api/schedulesApi';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import { useAuthStore } from '../store/authStore';
import type { Team, TeamMember, Schedule } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';
import { ICONS } from '../assets/icons';
import { scheduleLocationLabel } from '../utils/scheduleLocation';
import { Avatar, RoleTag, SegTabs, BottomSheet, ROLE_COLORS } from '../components/TeamUi';
import { isPlanLocked } from '../utils/planLock';

dayjs.extend(relativeTime);

const roleOf = (m: TeamMember) => (m.role_id <= 2 ? '팀장' : m.is_sub_leader ? '부팀장' : '팀원');

export default function TeamDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const teamId: number = route.params?.teamId;
  const me = useAuthStore(s => s.user);

  const [tab, setTab] = useState(1);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activities, setActivities] = useState<TeamActivity[] | null>(null);
  const [pick, setPick] = useState<TeamMember | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(''), 2200);
  };

  const load = useCallback(async () => {
    try {
      const [teams, memberList] = await Promise.all([getMyTeams(), getTeamMembers(teamId)]);
      setTeam(teams.find(t => t.id === teamId) ?? null);
      setMembers(memberList);
      const now = new Date();
      const list = await getSchedules(now.getFullYear(), now.getMonth() + 1);
      setSchedules(list.filter(s => s.team_id === teamId).sort((a, b) => a.date.localeCompare(b.date)));
    } catch {
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openTab = (i: number) => {
    setTab(i);
    if (i === 3 && activities === null) {
      getTeamActivities(teamId, 20).then(setActivities).catch(() => setActivities([]));
    }
  };

  const handleLeave = () => {
    setMenuOpen(false);
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

  const toggleSub = async () => {
    if (!pick || !team) return;
    const target = pick;
    const next = !target.is_sub_leader;
    setPick(null);
    try {
      await setSubLeader(team.id, target.id, next);
      setMembers(ms => ms.map(m => (m.id === target.id ? { ...m, is_sub_leader: next } : m)));
      showToast(`${target.name}님이 ${next ? '부팀장' : '팀원'}(으)로 바뀌었어요`);
    } catch (e: any) {
      if (!isPlanLocked(e)) Alert.alert('변경 실패', e?.response?.data?.message || '다시 시도해주세요.');
    }
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

  const isLeader = !!team.is_leader;
  const isSub = !!team.is_sub_leader;
  const myRole = isLeader ? '팀장' : isSub ? '부팀장' : '팀원';
  const [mrbg, mrfg] = ROLE_COLORS[myRole];
  const leaders = members.filter(m => m.role_id <= 2).map(m => m.name).join(', ');
  const subs = members.filter(m => m.role_id > 2 && m.is_sub_leader).map(m => m.name).join(', ');
  const coverUri = team.photo_path ? `${SERVER_BASE_URL}/storage/${team.photo_path}` : null;

  const tiles = [
    { key: 'notice', icon: ICONS.megaphone, label: '팀 공지', sub: team.notice_unread ? `새 글 ${team.notice_unread}` : '공지 보기', show: true, go: () => navigation.navigate('TeamNoticeList', { teamId }) },
    { key: 'settle', icon: ICONS.income, label: '정산표', sub: '팀장 전용', show: isLeader, go: () => navigation.navigate('TeamSettlement', { teamId }) },
    { key: 'album', icon: ICONS.site, label: '현장 앨범', sub: `사진 ${team.photo_count ?? 0}장`, show: true, go: () => navigation.navigate('TeamAlbum', { teamId }) },
    { key: 'att', icon: ICONS.schedule, label: '근태 현황', sub: '팀장 · 부팀장', show: isLeader || isSub, go: () => navigation.navigate('Attendance', { teamId }) },
  ].filter(t => t.show);

  const activityText = (a: TeamActivity) =>
    a.type === 'join' ? `${a.actor_name}님이 팀에 참여했어요`
      : a.type === 'notice' ? `${a.actor_name}님이 팀 공지를 올렸어요`
        : a.type === 'photos' ? `${a.actor_name}님이 현장 사진 ${a.count ?? 1}장을 올렸어요`
          : `${a.actor_name}님이 일정을 추가했어요`;

  return (
    <View style={styles.screen}>
      <AppHeader
        leftType="back"
        title="팀 상세"
        rightContent={
          <Pressable onPress={() => setMenuOpen(v => !v)} style={styles.headerBtn} accessibilityLabel="더보기">
            <Icon name="dots-horizontal" size={22} color={colors.textPrimary} />
          </Pressable>
        }
      />
      {menuOpen && (
        <View style={styles.menuBox}>
          <Pressable style={styles.menuItem} onPress={handleLeave}>
            <Text style={[styles.menuItemText, { color: colors.danger }]}>팀 나가기</Text>
          </Pressable>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.content}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.cover} />
        ) : (
          <LinearGradient colors={['#E9F1FA', '#D7E5F4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover}>
            <Icon name="image-outline" size={22} color="#7F95B2" />
            <Text style={styles.coverText}>팀 대표 사진</Text>
          </LinearGradient>
        )}

        <View style={styles.headRow}>
          <View style={styles.headIcon}><Image source={ICONS.team} style={{ width: 38, height: 38 }} resizeMode="contain" /></View>
          <View style={styles.headTextBox}>
            <Text style={styles.headName}>{team.name}</Text>
            <Text style={styles.headSub}>팀원 {members.length}명 · 이번 달 일정 {schedules.length}건</Text>
          </View>
          <View style={[styles.myRoleTag, { backgroundColor: mrbg }]}>
            <Text style={[styles.myRoleText, { color: mrfg }]}>내 역할 · {myRole}</Text>
          </View>
        </View>

        <View style={styles.tileRow}>
          {tiles.map(t => (
            <Pressable key={t.key} style={styles.tile} onPress={t.go}>
              <Image source={t.icon} style={{ width: 36, height: 36 }} resizeMode="contain" />
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={styles.tileSub}>{t.sub}</Text>
            </Pressable>
          ))}
        </View>

        <SegTabs items={['팀 정보', `팀원 ${members.length}`, '팀 일정', '활동']} active={tab} onPick={openTab} />

        {tab === 0 && (
          <View style={[styles.card, { paddingVertical: 6 }]}>
            {[
              ['팀명', team.name],
              ['팀 설명', team.description || '-'],
              ['주요 공정', team.specialty ? team.specialty.split(',').map(s => s.trim()).filter(Boolean).join(' · ') : '-'],
              ['팀장', leaders || '-'],
              ['부팀장', subs || '-'],
              ['생성일', team.created_at ? dayjs(team.created_at).format('YYYY년 M월 D일') : '-'],
            ].map(([label, value], i, arr) => (
              <View key={label} style={[styles.infoRow, i !== arr.length - 1 && styles.rowDivider]}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 1 && (
          <View style={{ gap: 8 }}>
            <Text style={styles.hint}>{isLeader ? '팀원을 누르면 연락하기 · 부팀장 지정을 할 수 있어요' : '팀원을 누르면 연락처를 볼 수 있어요'}</Text>
            <View style={styles.card}>
              {members.map((m, i) => {
                const mine = m.id === me?.id;
                return (
                  <Pressable key={m.id} disabled={mine} onPress={() => setPick(m)}
                    style={[styles.memberRow, i !== members.length - 1 && styles.rowDivider]}>
                    <Avatar id={m.id} name={m.name} color={m.avatar_color} image={m.avatar_image_path} />
                    <View style={styles.rowTextBox}>
                      <Text style={styles.memberName}>{m.name} <Text style={styles.meTag}>{mine ? '(나)' : ''}</Text></Text>
                      <Text style={styles.memberSub}>{m.phone || '연락처 없음'}</Text>
                    </View>
                    <RoleTag role={roleOf(m)} />
                    <Icon name="dots-horizontal" size={18} color={colors.muted} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {tab === 2 && (
          schedules.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>이번 달 팀 일정이 없습니다.</Text></View>
          ) : (
            <View style={[styles.card, { paddingVertical: 2 }]}>
              {schedules.map((s, i) => (
                <Pressable key={s.id} style={[styles.scheduleRow, i !== schedules.length - 1 && styles.rowDivider]}
                  onPress={() => navigation.navigate('ScheduleDetail', { id: s.id })}>
                  <View style={styles.scheduleIcon}><Icon name="calendar-month-outline" size={17} color={colors.accentDark} /></View>
                  <View style={styles.rowTextBox}>
                    <Text style={styles.memberName} numberOfLines={1}>{s.title || scheduleLocationLabel(s) || s.work_type_relation?.name || '일정'}</Text>
                    <Text style={styles.memberSub}>
                      {dayjs(s.date).format('M월 D일')}{s.start_time && s.end_time ? ` · ${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}` : ''}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          )
        )}

        {tab === 3 && (
          activities === null ? (
            <View style={styles.emptyCard}><ActivityIndicator color={colors.primary} /></View>
          ) : activities.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>아직 활동 내역이 없습니다.</Text></View>
          ) : (
            <View style={[styles.card, { paddingVertical: 2 }]}>
              {activities.map((a, i) => (
                <View key={`${a.type}-${a.created_at}-${i}`} style={[styles.scheduleRow, i !== activities.length - 1 && styles.rowDivider]}>
                  <Avatar id={a.actor_name.length + i} name={a.actor_name} color={a.actor_color} image={a.actor_avatar} size={32} />
                  <View style={styles.rowTextBox}>
                    <Text style={styles.memberName}>{activityText(a)}</Text>
                    <Text style={styles.memberSub}>{dayjs(a.created_at).locale('ko').fromNow()}</Text>
                  </View>
                </View>
              ))}
            </View>
          )
        )}

        <View style={styles.footerRow}>
          {isLeader && (
            <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate('TeamCreate', { team })}>
              <Text style={styles.secondaryBtnText}>팀 정보 수정</Text>
            </Pressable>
          )}
          <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('TeamInvite', { teamId: team.id })}>
            <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.primaryBtn}>
              <Icon name="account-plus-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>팀원 초대</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>

      {!!toast && (
        <View style={styles.toast} accessibilityLiveRegion="polite">
          <Icon name="check" size={16} color="#FFFFFF" />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <BottomSheet visible={!!pick} onClose={() => setPick(null)} label="팀원 메뉴">
        {pick && (
          <>
            <View style={styles.sheetHead}>
              <Avatar id={pick.id} name={pick.name} color={pick.avatar_color} image={pick.avatar_image_path} size={48} />
              <View style={{ gap: 2 }}>
                <Text style={styles.sheetName}>{pick.name}</Text>
                <Text style={styles.memberSub}>{roleOf(pick)} · {pick.phone || '연락처 없음'}</Text>
              </View>
            </View>
            <View>
              {!!pick.phone && (
                <Pressable style={[styles.sheetRow, styles.rowDivider]} onPress={() => { setPick(null); Linking.openURL(`tel:${pick.phone}`); }}>
                  <View style={styles.sheetIcon}><Image source={ICONS.bell} style={{ width: 28, height: 28 }} resizeMode="contain" /></View>
                  <Text style={[styles.memberName, { flex: 1 }]}>전화하기</Text>
                  <Icon name="chevron-right" size={16} color={colors.muted} />
                </Pressable>
              )}
              {!!pick.kakao_talk_id && (
                <Pressable style={[styles.sheetRow, styles.rowDivider]}
                  onPress={() => { Clipboard.setString(pick.kakao_talk_id!); setPick(null); showToast('카카오톡 ID를 복사했어요'); }}>
                  <View style={styles.sheetIcon}><Image source={ICONS.megaphone} style={{ width: 28, height: 28 }} resizeMode="contain" /></View>
                  <Text style={[styles.memberName, { flex: 1 }]}>카카오톡 ID 복사</Text>
                </Pressable>
              )}
              {isLeader && pick.role_id > 2 && (
                <Pressable style={styles.sheetRow} onPress={toggleSub}>
                  <View style={[styles.sheetIcon, { backgroundColor: '#E8F3FF' }]}><Image source={ICONS.profile} style={{ width: 28, height: 28 }} resizeMode="contain" /></View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.subLabel}>{pick.is_sub_leader ? '부팀장 해제' : '부팀장으로 지정'}</Text>
                    <Text style={styles.memberSub}>
                      {pick.is_sub_leader ? '팀원으로 바뀌고 일정 배정 · 근태 현황 권한이 없어져요' : '팀 일정 배정 · 팀 공지 쓰기 · 근태 현황 보기 권한이 생겨요'}
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>
            <Pressable style={styles.closeBtn} onPress={() => setPick(null)}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </Pressable>
          </>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: spacing.xl, gap: spacing.md },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  menuBox: { position: 'absolute', top: 54, right: 14, zIndex: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderCard, paddingVertical: 4, elevation: 4 },
  menuItem: { paddingHorizontal: 18, paddingVertical: 12 },
  menuItemText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },

  cover: { width: '100%', height: 120, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: 4 },
  coverText: { fontSize: 11, color: '#7F95B2' },

  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F2F7FE', alignItems: 'center', justifyContent: 'center' },
  headTextBox: { flex: 1, minWidth: 0, gap: 3 },
  headName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  headSub: { fontSize: 13, color: colors.textSecondary },
  myRoleTag: { height: 26, paddingHorizontal: 9, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  myRoleText: { fontSize: 12, fontWeight: '700' },

  tileRow: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: 14 },
  tileLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  tileSub: { fontSize: 10, color: colors.textSecondary },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderCard, paddingHorizontal: spacing.lg, shadowColor: '#102A56', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  infoRow: { flexDirection: 'row', gap: 12, paddingVertical: 9 },
  infoLabel: { width: 78, fontSize: 13, color: colors.textSecondary },
  infoValue: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  hint: { fontSize: 12, color: colors.textSecondary },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  rowTextBox: { flex: 1, minWidth: 0, gap: 2 },
  memberName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  meTag: { color: colors.textSecondary, fontWeight: '400' },
  memberSub: { fontSize: 12, color: colors.textSecondary },

  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  scheduleIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFF1DE', alignItems: 'center', justifyContent: 'center' },

  emptyCard: { padding: spacing.xl, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderCard },
  emptyText: { color: colors.textSecondary, fontSize: 13 },

  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryBtn: { height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: '#BFDBFB' },
  secondaryBtnText: { color: colors.primaryDark, fontSize: 15, fontWeight: '700' },

  toast: { position: 'absolute', left: 16, right: 16, bottom: 24, zIndex: 15, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(16,42,86,0.92)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  toastText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', flex: 1 },

  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetName: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sheetIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F2F7FE', alignItems: 'center', justifyContent: 'center' },
  subLabel: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  closeBtn: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 15, fontWeight: '700', color: '#3B4F70' },
});
