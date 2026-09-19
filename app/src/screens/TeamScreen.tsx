// ═══════════════════════════════════════════════════════════════
// 📄 TeamScreen.tsx — 팀 관리 (★ v11.8 백엔드/웹에 이어 모바일 연동 ★ 이번 작업)
//   - 팀 없음: 팀 생성 / 초대 코드로 가입
//   - 팀 있음: 팀 정보 + 초대 코드 공유 + 팀원 목록
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Text, Button, TextInput, Divider, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';

import {
  getMyTeams,
  getTeamMembers,
  createTeam,
  joinTeam,
} from '../api/teamApi';
import type { Team, TeamMember } from '../types/api';
import AppHeader from '../components/AppHeader';

const ROLE_LABELS: Record<number, string> = {
  1: '최고 관리자',
  2: '관리자',
  3: '팀원',
};

type TabKey = 'create' | 'join';

export default function TeamScreen() {
  const [loading, setLoading] = useState<boolean>(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);

  const [tab, setTab] = useState<TabKey>('create');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [teams, memberList] = await Promise.all([
        getMyTeams(),
        getTeamMembers(),
      ]);
      setTeam(teams[0] ?? null);
      setMembers(memberList);
    } catch (e: any) {
      console.error('팀 정보 조회 실패:', e);
      Alert.alert('조회 실패', e?.response?.data?.message || '팀 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleCreate = async () => {
    if (!teamName.trim()) {
      Alert.alert('입력 오류', '팀 이름을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await createTeam(teamName.trim());
      setTeamName('');
      await load();
    } catch (e: any) {
      Alert.alert('생성 실패', e?.response?.data?.message || '팀 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('입력 오류', '초대 코드를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await joinTeam(inviteCode.trim().toUpperCase());
      setInviteCode('');
      await load();
    } catch (e: any) {
      Alert.alert('가입 실패', e?.response?.data?.message || '팀 가입에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareInvite = () => {
    if (!team) return;
    Share.share({
      message: `Team Schedule Manager에서 "${team.name}" 팀에 초대합니다.\n초대 코드: ${team.invite_code}`,
    }).catch(() => {});
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppHeader title="팀 관리" />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2E75B6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="팀 관리" />
      <ScrollView contentContainerStyle={styles.container}>
        {!team ? (
          <View>
            <Text style={styles.emptyTitle}>아직 소속된 팀이 없습니다</Text>
            <Text style={styles.emptyHint}>
              새 팀을 만들거나, 초대 코드로 기존 팀에 가입하세요.
            </Text>

            <View style={styles.tabRow}>
              <Chip
                selected={tab === 'create'}
                onPress={() => setTab('create')}
                style={styles.tabChip}
              >
                팀 생성
              </Chip>
              <Chip
                selected={tab === 'join'}
                onPress={() => setTab('join')}
                style={styles.tabChip}
              >
                초대 코드로 가입
              </Chip>
            </View>

            {tab === 'create' ? (
              <View style={styles.formGroup}>
                <TextInput
                  mode="outlined"
                  label="팀 이름"
                  value={teamName}
                  onChangeText={setTeamName}
                  disabled={submitting}
                />
                <Button
                  mode="contained"
                  onPress={handleCreate}
                  loading={submitting}
                  disabled={submitting}
                  style={styles.submitBtn}
                >
                  팀 생성
                </Button>
              </View>
            ) : (
              <View style={styles.formGroup}>
                <TextInput
                  mode="outlined"
                  label="초대 코드"
                  value={inviteCode}
                  onChangeText={t => setInviteCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  disabled={submitting}
                />
                <Button
                  mode="contained"
                  onPress={handleJoin}
                  loading={submitting}
                  disabled={submitting}
                  style={styles.submitBtn}
                >
                  가입
                </Button>
              </View>
            )}
          </View>
        ) : (
          <View>
            <View style={styles.teamCard}>
              <Text style={styles.teamName}>{team.name}</Text>
              <View style={styles.inviteRow}>
                <Icon name="ticket-confirmation-outline" size={18} color="#2E75B6" />
                <Text style={styles.inviteCode}>{team.invite_code}</Text>
                <Button mode="text" compact onPress={handleShareInvite}>
                  공유
                </Button>
              </View>
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.section}>팀원 ({members.length}명)</Text>
            {members.map(m => (
              <View key={m.id} style={styles.memberRow}>
                <Text style={styles.memberName}>{m.name}</Text>
                <Text style={styles.memberRole}>{ROLE_LABELS[m.role_id] ?? '팀원'}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { padding: 16, paddingBottom: 60 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 20 },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabChip: {},

  formGroup: { gap: 12 },
  submitBtn: { marginTop: 4 },

  teamCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 16,
  },
  teamName: { fontSize: 18, fontWeight: '700', color: '#1F3864', marginBottom: 10 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inviteCode: { fontSize: 15, fontWeight: '600', color: '#333', flex: 1 },

  divider: { marginVertical: 20 },
  section: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 10 },

  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  memberName: { fontSize: 15, color: '#222' },
  memberRole: { fontSize: 13, color: '#888' },
});
