// ═══════════════════════════════════════════════════════════════
// 📄 TeamScreen.tsx — 팀 관리
//   ★ v18.21 — 여러 팀 동시 소속 지원. 소속된 모든 팀을 칩으로 보여주고,
//   선택한 팀의 정보/팀원을 아래에 표시. 칩을 누르면 "활성 팀"이 전환됨
//   (일정/현장 등록은 항상 활성 팀 기준으로 동작).
//   팀이 있어도 언제든 새 팀 생성/추가 가입이 가능함.
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Modal,
  Linking,
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
  switchActiveTeam,
} from '../api/teamApi';
import type { Team, TeamMember } from '../types/api';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import AppHeader from '../components/AppHeader';

const ROLE_LABELS: Record<number, string> = {
  1: '최고 관리자',
  2: '관리자',
  3: '팀원',
};

type FormTabKey = 'create' | 'join';

export default function TeamScreen() {
  const [loading, setLoading] = useState<boolean>(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formTab, setFormTab] = useState<FormTabKey>('create');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadMembers = useCallback(async (teamId: number) => {
    setMembersLoading(true);
    try {
      const memberList = await getTeamMembers(teamId);
      setMembers(memberList);
    } catch (e: any) {
      console.error('팀원 조회 실패:', e);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const teamList = await getMyTeams();
      setTeams(teamList);

      const active = teamList.find(t => t.is_active) ?? teamList[0] ?? null;
      setSelectedTeamId(active?.id ?? null);
      if (active) {
        await loadMembers(active.id);
      } else {
        setMembers([]);
      }
    } catch (e: any) {
      console.error('팀 정보 조회 실패:', e);
      Alert.alert('조회 실패', e?.response?.data?.message || '팀 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [loadMembers]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const selectedTeam = teams.find(t => t.id === selectedTeamId) ?? null;

  const handleSelectChip = async (team: Team) => {
    setSelectedTeamId(team.id);
    await loadMembers(team.id);

    if (!team.is_active) {
      setSwitching(true);
      try {
        await switchActiveTeam(team.id);
        await load();
      } catch (e: any) {
        Alert.alert('전환 실패', e?.response?.data?.message || '활성 팀 전환에 실패했습니다.');
      } finally {
        setSwitching(false);
      }
    }
  };

  const handleCreate = async () => {
    if (!teamName.trim()) {
      Alert.alert('입력 오류', '팀 이름을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await createTeam(teamName.trim());
      setTeamName('');
      setShowForm(false);
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
      setShowForm(false);
      await load();
    } catch (e: any) {
      Alert.alert('가입 실패', e?.response?.data?.message || '팀 가입에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyInvite = () => {
    if (!selectedTeam) return;
    Clipboard.setString(selectedTeam.invite_code);
    Alert.alert('복사 완료', '초대 코드가 복사되었습니다.');
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('오류', '전화 앱을 열 수 없습니다.'),
    );
  };

  const handleCopyKakao = (kakaoTalkId: string) => {
    Clipboard.setString(kakaoTalkId);
    Alert.alert('복사 완료', '카카오톡 아이디가 복사되었습니다. 카카오톡에서 검색해 친구 추가해보세요.');
  };

  const handleLeaveTeam = () => {
    if (!selectedTeam) return;
    Alert.alert('팀 탈퇴', `정말 "${selectedTeam.name}"에서 탈퇴하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveTeam(selectedTeam.id);
            await load();
          } catch (e: any) {
            Alert.alert('탈퇴 실패', e?.response?.data?.message || '팀 탈퇴에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const renderForm = () => (
    <View style={styles.formCard}>
      <View style={styles.tabRow}>
        <Chip
          selected={formTab === 'create'}
          onPress={() => setFormTab('create')}
          style={styles.tabChip}
        >
          팀 생성
        </Chip>
        <Chip
          selected={formTab === 'join'}
          onPress={() => setFormTab('join')}
          style={styles.tabChip}
        >
          초대 코드로 가입
        </Chip>
      </View>

      {formTab === 'create' ? (
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
  );

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
        {teams.length === 0 ? (
          <View>
            <Text style={styles.emptyTitle}>아직 소속된 팀이 없습니다</Text>
            <Text style={styles.emptyHint}>
              새 팀을 만들거나, 초대 코드로 기존 팀에 가입하세요.
            </Text>
            {renderForm()}
          </View>
        ) : (
          <View>
            <Text style={styles.section}>내 팀 ({teams.length}개)</Text>
            <View style={styles.teamChipRow}>
              {teams.map(t => (
                <Chip
                  key={t.id}
                  selected={t.id === selectedTeamId}
                  onPress={() => handleSelectChip(t)}
                  style={styles.teamChip}
                  icon={t.is_active ? 'star' : undefined}
                >
                  {t.name}
                </Chip>
              ))}
            </View>
            {switching && (
              <Text style={styles.switchingHint}>활성 팀 전환 중...</Text>
            )}

            {selectedTeam && (
              <>
                <View style={styles.teamCard}>
                  <Text style={styles.fieldLabel}>
                    {selectedTeam.is_active ? '활성 팀' : '이 팀'}
                  </Text>
                  <Text style={styles.teamName}>{selectedTeam.name}</Text>
                  <Text style={styles.fieldLabel}>초대코드</Text>
                  <View style={styles.inviteRow}>
                    <Text style={styles.inviteCode}>{selectedTeam.invite_code}</Text>
                    <TouchableOpacity onPress={handleCopyInvite} style={styles.copyBtn}>
                      <Text style={styles.copyBtnText}>복사</Text>
                    </TouchableOpacity>
                  </View>
                  {!selectedTeam.is_active && (
                    <Text style={styles.notActiveHint}>
                      위 칩을 눌러 이 팀을 활성 팀으로 전환하면 여기서 일정/현장을 등록할 수 있어요.
                    </Text>
                  )}
                </View>

                <Text style={styles.section}>
                  팀원 {membersLoading ? '' : `(${members.length}명)`}
                </Text>
                {membersLoading ? (
                  <ActivityIndicator color="#2E75B6" style={{ marginBottom: 12 }} />
                ) : (
                  members.map(m => {
                    const isLead = m.role_id <= 2;
                    const memberAvatarUri = m.avatar_image_path
                      ? `${SERVER_BASE_URL}/storage/${m.avatar_image_path}`
                      : null;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={styles.memberRow}
                        onPress={() => setSelectedMember(m)}
                      >
                        {memberAvatarUri ? (
                          <Image source={{ uri: memberAvatarUri }} style={styles.avatarImage} />
                        ) : (
                          <View
                            style={[
                              styles.avatar,
                              { backgroundColor: m.avatar_color || (isLead ? '#1F3864' : '#999') },
                            ]}
                          >
                            <Text style={styles.avatarText}>{m.name.charAt(0)}</Text>
                          </View>
                        )}
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
                        <Text style={styles.chevron}>›</Text>
                      </TouchableOpacity>
                    );
                  })
                )}

                <TouchableOpacity onPress={handleLeaveTeam} style={styles.leaveBtn}>
                  <Text style={styles.leaveBtnText}>이 팀 탈퇴하기</Text>
                </TouchableOpacity>
              </>
            )}

            {showForm ? (
              renderForm()
            ) : (
              <Button
                mode="outlined"
                onPress={() => setShowForm(true)}
                style={styles.addTeamBtn}
              >
                + 다른 팀 추가하기
              </Button>
            )}
          </View>
        )}
      </ScrollView>

      {/* ★ v18.23 — 팀원 상세(연락처/카카오톡 아이디) 모달 */}
      <Modal
        visible={!!selectedMember}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMember(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedMember(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            {selectedMember && (
              <>
                {selectedMember.avatar_image_path ? (
                  <Image
                    source={{ uri: `${SERVER_BASE_URL}/storage/${selectedMember.avatar_image_path}` }}
                    style={styles.modalAvatarImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.modalAvatar,
                      { backgroundColor: selectedMember.avatar_color || '#1F3864' },
                    ]}
                  >
                    <Text style={styles.modalAvatarText}>
                      {selectedMember.name.charAt(0)}
                    </Text>
                  </View>
                )}
                <Text style={styles.modalName}>{selectedMember.name}</Text>
                <Text style={styles.modalRole}>
                  {ROLE_LABELS[selectedMember.role_id] ?? '팀원'}
                </Text>

                {selectedMember.phone ? (
                  <TouchableOpacity
                    style={styles.modalActionRow}
                    onPress={() => handleCall(selectedMember.phone!)}
                  >
                    <Text style={styles.modalActionLabel}>📞 {selectedMember.phone}</Text>
                    <Text style={styles.modalActionBtn}>전화하기</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.modalEmptyHint}>등록된 연락처가 없습니다</Text>
                )}

                {selectedMember.kakao_talk_id ? (
                  <TouchableOpacity
                    style={styles.modalActionRow}
                    onPress={() => handleCopyKakao(selectedMember.kakao_talk_id!)}
                  >
                    <Text style={styles.modalActionLabel}>
                      💬 {selectedMember.kakao_talk_id}
                    </Text>
                    <Text style={styles.modalActionBtn}>복사</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.modalEmptyHint}>등록된 카카오톡 아이디가 없습니다</Text>
                )}

                <Button
                  mode="text"
                  onPress={() => setSelectedMember(null)}
                  style={{ marginTop: 8 }}
                >
                  닫기
                </Button>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6F8' },
  container: { padding: 16, paddingBottom: 60 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 20 },

  teamChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  teamChip: {},
  switchingHint: { fontSize: 12, color: '#2E75B6', marginBottom: 12 },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabChip: {},

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  formGroup: { gap: 12 },
  input: { backgroundColor: '#fff' },
  submitBtn: { marginTop: 4 },
  addTeamBtn: { marginTop: 18 },

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
  notActiveHint: { fontSize: 12, color: '#C77700', marginTop: 12, lineHeight: 18 },

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
  avatarImage: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  memberName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#222' },
  roleBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
  chevron: { fontSize: 20, color: '#CCC', marginLeft: 8 },

  leaveBtn: { marginTop: 14, alignItems: 'center' },
  leaveBtnText: {
    fontSize: 13,
    color: '#C0392B',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalAvatarImage: { width: 64, height: 64, borderRadius: 32, marginBottom: 12 },
  modalAvatarText: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  modalName: { fontSize: 17, fontWeight: '800', color: '#222' },
  modalRole: { fontSize: 12, color: '#888', marginBottom: 18 },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#F5F6F8',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  modalActionLabel: { fontSize: 14, color: '#333', flexShrink: 1 },
  modalActionBtn: { fontSize: 12, color: '#1F3864', fontWeight: '700' },
  modalEmptyHint: { fontSize: 12, color: '#AAA', marginBottom: 10 },
});
