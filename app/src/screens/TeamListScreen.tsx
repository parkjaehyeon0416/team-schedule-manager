/**
 * 팀 관리(목록) 화면 — v18.34 (DESIGN-CANVAS 기준, TEAM_LIST.dc.html)
 * ★ 참고: 디자인은 "내 팀"/"초대 받은 팀" 두 탭이지만, 이 앱의 초대 코드는
 *   입력 즉시 바로 가입되는 방식이라 "대기 중인 초대" 개념이 백엔드에 없음.
 *   그래서 탭 없이 내가 소속된 팀 목록만 보여줌.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../components/AppHeader';
import { getMyTeams, getTeamMembers } from '../api/teamApi';
import { useAuthStore } from '../store/authStore';
import type { Team } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';

const AV_BG = ['#FFE3C2', '#D6ECFF', '#D9F6F1', '#ECE5FF', '#FFE0E0'];
const AV_FG = ['#B95E00', '#0A6CE0', '#0B8574', '#6B4FD8', '#C03A3E'];

type Row = Team & { memberCount: number; myRole: 'lead' | 'member' };

export default function TeamListScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const teams = await getMyTeams();
      const enriched = await Promise.all(
        teams.map(async t => {
          try {
            const members = await getTeamMembers(t.id);
            const me = members.find(m => m.id === user?.id);
            return { ...t, memberCount: members.length, myRole: (me && me.role_id <= 2 ? 'lead' : 'member') as 'lead' | 'member' };
          } catch {
            return { ...t, memberCount: 0, myRole: 'member' as const };
          }
        }),
      );
      setRows(enriched);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="팀 관리" />
      <FlatList
        data={rows}
        keyExtractor={t => String(t.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          loading ? null : (
            <Text style={styles.countLabel}>내 팀 {rows.length}</Text>
          )
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <Text style={styles.emptyText}>아직 소속된 팀이 없습니다.</Text>
          )
        }
        renderItem={({ item, index }) => {
          const bg = AV_BG[index % AV_BG.length];
          const fg = AV_FG[index % AV_FG.length];
          const lead = item.myRole === 'lead';
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              onPress={() => navigation.navigate('TeamDetail', { teamId: item.id })}
            >
              <View style={[styles.avatar, { backgroundColor: bg }]}>
                <Text style={[styles.avatarText, { color: fg }]}>{item.name.charAt(0)}</Text>
              </View>
              <View style={styles.rowTextBox}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowSub}>팀원 {item.memberCount}명</Text>
              </View>
              <View style={[styles.roleTag, lead ? styles.roleTagLead : styles.roleTagMember]}>
                {lead && <Icon name="crown-outline" size={13} color="#B95E00" />}
                <Text style={[styles.roleTagText, { color: lead ? '#B95E00' : colors.textSecondary }]}>
                  {lead ? '팀장' : '팀원'}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.muted} />
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
      <View style={styles.footerRow}>
        <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('TeamCreate')}>
          <LinearGradient
            colors={[colors.primaryLight, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.primaryBtn}
          >
            <Icon name="plus" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>새 팀 만들기</Text>
          </LinearGradient>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate('TeamJoin')}>
          <Icon name="account-plus-outline" size={18} color={colors.primaryDark} />
          <Text style={styles.secondaryBtnText}>코드로 참여</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.md, flexGrow: 1 },
  countLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.lg,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 19, fontWeight: '800' },
  rowTextBox: { flex: 1, minWidth: 0, gap: 3 },
  rowName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary },
  roleTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    height: 24, paddingHorizontal: 9, borderRadius: 7,
  },
  roleTagLead: { backgroundColor: '#FFF2E2' },
  roleTagMember: { backgroundColor: '#EEF2F7' },
  roleTagText: { fontSize: 12, fontWeight: '700' },

  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  primaryBtn: {
    height: 52, borderRadius: radius.sm, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    flex: 1, height: 52, borderRadius: radius.sm, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: '#BFDBFB',
  },
  secondaryBtnText: { color: colors.primaryDark, fontSize: 15, fontWeight: '700' },
});
