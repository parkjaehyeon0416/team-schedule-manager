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
  TouchableOpacity,
} from 'react-native';
import { Text, Button, TextInput, Chip } from 'react-native-paper';
import Clipboard from '@react-native-clipboard/clipboard';
import { useFocusEffect } from '@react-navigation/native';

import {
  getMyTeams,
  getTeamMembers,
  createTeam,
  joinTeam,
  leaveTeam,
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

  const handleCopyInvite = () => {
    if (!team) return;
    Clipboard.setString(team.invite_code);
    Alert.alert('복사 완료', '초대 코드가 복사되었습니다.');
  };

  const handleLeaveTeam = () => {
    Alert.alert('팀 탈퇴', '정말 이 팀에서 탈퇴하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveTeam();
            await load();
          } catch (e: any) {
            Alert.alert('탈퇴 실패', e?.response?.data?.message || '팀 탈퇴에 실패했습니다.');
          }
        },
      },
    ]);
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
                  style={styles.input}
                  textColor="#222222"
                  outlineColor="#CCCCCC"
                  activeOutlineColor="#1F3864"
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
                  style={styles.input}
                  textColor="#222222"
                  outlineColor="#CCCCCC"
                  activeOutlineColor="#1F3864"
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
              <Text style={styles.fieldLabel}>우리 팀</Text>
              <Text style={styles.teamName}>{team.name}</Text>
              <Text style={styles.fieldLabel}>초대코드</Text>
              <View style={styles.inviteRow}>
                <Text style={styles.inviteCode}>{team.invite_code}</Text>
                <TouchableOpacity onPress={handleCopyInvite} style={styles.copyBtn}>
                  <Text style={styles.copyBtnText}>복사</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.section}>팀원 ({members.length}명)</Text>
            {members.map(m => {
              const isLead = m.role_id <= 2;
              return (
                <View key={m.id} style={styles.memberRow}>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: isLead ? '#1F3864' : '#999' },
                    ]}
                  >
                    <Text style={styles.avatarText}>{m.name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: isLead ? '#eaf0fb' : '#f0f0f0' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        { color: isLead ? '#1F3864' : '#666' },
                      ]}
                    >
                      {ROLE_LABELS[m.role_id] ?? '팀원'}
                    </Text>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity onPress={handleLeaveTeam} style={styles.leaveBtn}>
              <Text style={styles.leaveBtnText}>팀 탈퇴하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6F8' },
  container: { padding: 16, paddingBottom: 60 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 20 },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabChip: {},

  formGroup: { gap: 12 },
  input: { backgroundColor: '#fff' },
  submitBtn: { marginTop: 4 },

  teamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
  },
  fieldLabel: { fontSize: 12, color: '#777', marginBottom: 6 },
  teamName: { fontSize: 18, fontWeight: '900', color: '#222', marginBottom: 14 },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F6F8',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inviteCode: { fontSize: 17, fontWeight: '700', letterSpacing: 3, color: '#1F3864' },
  copyBtn: {
    borderWidth: 1,
    borderColor: '#1F3864',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  copyBtnText: { fontSize: 12, color: '#1F3864', fontWeight: '700' },

  section: { fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 10 },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  memberName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#222' },
  roleBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },

  leaveBtn: { marginTop: 14, alignItems: 'center' },
  leaveBtnText: {
    fontSize: 13,
    color: '#C0392B',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
