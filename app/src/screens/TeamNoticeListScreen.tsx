/**
 * 팀 공지 — DESIGN-CANVAS 기준, TEAM_NOTICE_LIST.dc.html + TEAM_NOTICE_WRITE.dc.html(쓰기 시트) (★ v18.48)
 * 팀원 누구나 읽기, 팀장·부팀장이 쓰기(팀원 전체 알림)·고정, 작성자·팀장이 삭제.
 * 팀 상세 "팀 공지" 타일, 팀 공지 알림(link_type team_notice)에서 진입.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import dayjs from 'dayjs';
import AppHeader from '../components/AppHeader';
import { getTeamNotices, postTeamNotice, toggleTeamNoticePin, deleteTeamNotice } from '../api/teamApi';
import type { TeamNoticeList, TeamNotice } from '../api/teamApi';
import { Avatar, RoleTag, CheckBox, InfoNote, BottomSheet } from '../components/TeamUi';
import { colors, spacing } from '../theme/designTokens';
import { ICONS } from '../assets/icons';
import { isPlanLocked } from '../utils/planLock';

const MAX = 1000;

function when(iso: string) {
  const d = dayjs(iso);
  if (d.isSame(dayjs(), 'day')) return `오늘 · ${d.format('HH:mm')}`;
  if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return `어제 · ${d.format('HH:mm')}`;
  return d.isSame(dayjs(), 'year') ? d.format('M월 D일') : d.format('YYYY년 M월 D일');
}

export default function TeamNoticeListScreen() {
  const route = useRoute<any>();
  const teamId: number = route.params?.teamId;
  const [data, setData] = useState<TeamNoticeList | null>(null);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');
  const [pin, setPin] = useState(false);
  const [posting, setPosting] = useState(false);
  const [done, setDone] = useState<number | null>(null); // 알림 보낸 인원

  const load = useCallback(() => {
    getTeamNotices(teamId).then(setData).catch(() => setData({ team_name: '', can_write: false, member_count: 0, items: [] }));
  }, [teamId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openWrite = () => { setText(''); setPin(false); setDone(null); setWriting(true); };
  const closeWrite = () => { setWriting(false); if (done !== null) load(); };

  const post = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      const r = await postTeamNotice(teamId, text.trim(), pin);
      setDone(r.notified);
    } catch (e: any) {
      if (isPlanLocked(e)) setWriting(false);
      else Alert.alert('올리기 실패', e?.response?.data?.message || '다시 시도해주세요.');
    } finally {
      setPosting(false);
    }
  };

  const togglePin = async (n: TeamNotice) => {
    try {
      const pinned = await toggleTeamNoticePin(teamId, n.id);
      setData(d => d && { ...d, items: d.items.map(x => (x.id === n.id ? { ...x, pinned } : x)) });
    } catch (e: any) {
      Alert.alert('실패', e?.response?.data?.message || '다시 시도해주세요.');
    }
  };

  const remove = (n: TeamNotice) => {
    Alert.alert('공지 삭제', '이 공지를 지울까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          try {
            await deleteTeamNotice(teamId, n.id);
            setData(d => d && { ...d, items: d.items.filter(x => x.id !== n.id) });
          } catch (e: any) {
            Alert.alert('삭제 실패', e?.response?.data?.message || '다시 시도해주세요.');
          }
        },
      },
    ]);
  };

  const list = (data?.items ?? []).slice().sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const canManage = !!data?.can_write;
  const notifyCount = Math.max(0, (data?.member_count ?? 1) - 1);

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="팀 공지" />
      {!data ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {list.length > 0 && <Text style={styles.meta}>{data.team_name} · 공지 {list.length}개</Text>}
          {list.map(n => (
            <View key={n.id} style={[styles.card, { borderColor: n.pinned ? '#FFD9A8' : '#E6F0FA' }]}>
              <View style={styles.cardHead}>
                <Avatar id={n.author?.id ?? 0} name={n.author?.name ?? '?'} color={n.author?.avatar_color} image={n.author?.avatar_image_path} size={38} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{n.author?.name ?? '알 수 없음'}</Text>
                    <RoleTag role={n.author_role} />
                  </View>
                  <Text style={styles.time}>{when(n.created_at)}</Text>
                </View>
                {n.pinned && (
                  <View style={styles.pinTag}>
                    <Icon name="pin" size={12} color="#B95E00" />
                    <Text style={styles.pinTagText}>고정</Text>
                  </View>
                )}
              </View>
              <Text style={styles.body}>{n.body}</Text>
              {(canManage || n.can_delete) && (
                <View style={styles.actions}>
                  {canManage && (
                    <Pressable onPress={() => togglePin(n)} hitSlop={8}>
                      <Text style={styles.actionBlue}>{n.pinned ? '고정 해제' : '맨 위에 고정'}</Text>
                    </Pressable>
                  )}
                  {n.can_delete && (
                    <Pressable onPress={() => remove(n)} hitSlop={8}>
                      <Text style={styles.actionRed}>삭제</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          ))}

          {list.length === 0 && (
            <View style={styles.empty}>
              <Image source={ICONS.megaphone} style={{ width: 88, height: 88 }} resizeMode="contain" />
              <Text style={styles.emptyTitle}>아직 팀 공지가 없어요</Text>
              <Text style={styles.emptyDesc}>현장 집합 시간, 자재 소식처럼{'\n'}팀원 모두가 알아야 할 내용을 올려보세요.</Text>
              {canManage && (
                <Pressable style={styles.emptyBtn} onPress={openWrite}>
                  <Text style={styles.emptyBtnText}>첫 공지 쓰기</Text>
                </Pressable>
              )}
            </View>
          )}
          <View style={{ height: 64 }} />
        </ScrollView>
      )}

      {canManage && (
        <Pressable style={styles.fabWrap} onPress={openWrite}>
          <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.fab}>
            <Icon name="pencil-outline" size={18} color="#FFFFFF" />
            <Text style={styles.fabText}>공지 쓰기</Text>
          </LinearGradient>
        </Pressable>
      )}

      <BottomSheet visible={writing} onClose={closeWrite} label="공지 쓰기">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {done === null ? (
            <View style={{ gap: 14 }}>
              <View style={styles.sheetHead}>
                <Text style={styles.sheetTitle}>팀 공지 쓰기</Text>
                <Pressable onPress={closeWrite} accessibilityLabel="닫기" hitSlop={10}>
                  <Icon name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>
              <TextInput
                accessibilityLabel="공지 내용"
                value={text}
                onChangeText={setText}
                maxLength={MAX}
                multiline
                numberOfLines={7}
                placeholder="팀원들에게 알릴 내용을 적어주세요"
                placeholderTextColor="#9AACC4"
                textAlignVertical="top"
                style={styles.textarea}
              />
              <View style={styles.optRow}>
                <Pressable style={styles.pinOpt} onPress={() => setPin(v => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: pin }}>
                  <CheckBox checked={pin} size={22} />
                  <Text style={styles.pinOptText}>맨 위에 고정</Text>
                </Pressable>
                <Text style={styles.time}>{text.length} / {MAX}</Text>
              </View>
              <InfoNote>팀원 {notifyCount}명에게 알림이 가요.</InfoNote>
              <Pressable onPress={post} disabled={!text.trim() || posting}>
                {text.trim() ? (
                  <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.submit}>
                    {posting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>올리기</Text>}
                  </LinearGradient>
                ) : (
                  <View style={[styles.submit, { backgroundColor: '#B9D6F7' }]}><Text style={styles.submitText}>올리기</Text></View>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.doneBox} accessibilityLiveRegion="polite">
              <Image source={ICONS.bell} style={{ width: 64, height: 64 }} resizeMode="contain" />
              <Text style={styles.emptyTitle}>공지를 올렸어요</Text>
              <Text style={styles.time}>팀원 {done}명에게 알림을 보냈어요</Text>
              <Pressable style={{ width: '100%', marginTop: 6 }} onPress={closeWrite}>
                <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.submit, { height: 50 }]}>
                  <Text style={styles.submitText}>확인</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: spacing.xl, gap: 12 },
  meta: { fontSize: 13, color: colors.textSecondary },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, shadowColor: '#102A56', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  time: { fontSize: 12, color: colors.textSecondary },
  pinTag: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 22, paddingHorizontal: 7, borderRadius: 6, backgroundColor: '#FFF2E2' },
  pinTagText: { fontSize: 11, fontWeight: '700', color: '#B95E00' },
  body: { fontSize: 14, lineHeight: 23, color: colors.textPrimary },
  actions: { flexDirection: 'row', gap: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderHairline },
  actionBlue: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  actionRed: { fontSize: 13, fontWeight: '700', color: colors.danger },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 70, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, textAlign: 'center' },
  emptyBtn: { marginTop: 6, height: 46, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFB', justifyContent: 'center' },
  emptyBtnText: { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
  fabWrap: { position: 'absolute', right: 16, bottom: 24, zIndex: 5, elevation: 6 },
  fab: { height: 52, paddingHorizontal: 20, borderRadius: 26, flexDirection: 'row', alignItems: 'center', gap: 6 },
  fabText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  textarea: { minHeight: 170, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 15, lineHeight: 24, color: colors.textPrimary },
  optRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pinOpt: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinOptText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  submit: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  doneBox: { alignItems: 'center', gap: 10, paddingTop: 20, paddingBottom: 6 },
});
