/**
 * 팀 참여(초대 코드 입력) 화면 — DESIGN-CANVAS 기준, TEAM_JOIN.dc.html
 * 2026-10-02: 백엔드에 초대코드 미리보기 API(POST /teams/preview)를 추가해
 * 디자인대로 "팀 미리보기" 카드를 보여주도록 구현함(단, "초대 만료일"은 코드 자체에
 * 만료 개념이 없어 생략 — QR/초대 대기중 상태와 함께 이번 작업 범위 밖).
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../components/AppHeader';
import { joinTeam, previewTeam } from '../api/teamApi';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import type { TeamPreview } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';

const AVATAR_BG = ['#FFE3C2', '#D6ECFF', '#D9F6F1', '#ECE5FF'];
const AVATAR_FG = ['#B95E00', '#0A6CE0', '#0B8574', '#6B4FD8'];

export default function TeamJoinScreen() {
  const navigation = useNavigation<any>();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<TeamPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const chars = code.padEnd(6, ' ').slice(0, 6).split('');

  useEffect(() => {
    setPreview(null);
    setPreviewError(null);
    if (code.length < 4) return;
    let cancelled = false;
    setPreviewLoading(true);
    previewTeam(code)
      .then(p => { if (!cancelled) setPreview(p); })
      .catch(e => { if (!cancelled) setPreviewError(e?.response?.data?.message || '초대 코드를 확인해주세요.'); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [code]);

  const handleJoin = async () => {
    if (code.trim().length < 4) {
      Alert.alert('입력 오류', '초대 코드를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await joinTeam(code.trim().toUpperCase());
      Alert.alert('참여 완료', '팀에 가입되었습니다.', [
        { text: '확인', onPress: () => navigation.popTo('TeamList') },
      ]);
    } catch (e: any) {
      Alert.alert('가입 실패', e?.response?.data?.message || '초대 코드를 확인해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const avatarIdx = preview ? preview.id % AVATAR_BG.length : 0;

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="팀 참여" />
      <View style={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>초대 코드 입력</Text>
          <Text style={styles.subtitle}>팀장에게 받은 초대 코드를 입력해주세요.</Text>
        </View>

        <Pressable style={styles.codeBoxesRow} onPress={() => {}}>
          {chars.map((c, i) => (
            <View key={i} style={[styles.codeBox, code.length === i && styles.codeBoxActive]}>
              <Text style={styles.codeBoxText}>{c.trim()}</Text>
            </View>
          ))}
        </Pressable>
        <TextInput
          style={styles.hiddenInput}
          value={code}
          onChangeText={t => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          autoCapitalize="characters"
          autoFocus
          maxLength={6}
        />

        {previewLoading && (
          <View style={styles.previewLoading}><ActivityIndicator color={colors.primary} /></View>
        )}

        {!previewLoading && previewError && (
          <Text style={styles.previewError}>{previewError}</Text>
        )}

        {!previewLoading && preview && (
          <View style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>팀 미리보기</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewHeaderRow}>
                {preview.photo_path ? (
                  <Image source={{ uri: `${SERVER_BASE_URL}/storage/${preview.photo_path}` }} style={styles.previewAvatarImg} />
                ) : (
                  <View style={[styles.previewAvatar, { backgroundColor: AVATAR_BG[avatarIdx] }]}>
                    <Text style={[styles.previewAvatarText, { color: AVATAR_FG[avatarIdx] }]}>{preview.name.charAt(0)}</Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.previewName}>{preview.name}</Text>
                  <Text style={styles.previewSub}>
                    팀원 {preview.member_count}명{preview.specialty ? ` · ${preview.specialty}` : ''}{preview.activity_area ? ` · ${preview.activity_area}` : ''}
                  </Text>
                </View>
              </View>
              {!!preview.leader_name && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewRowLabel}>팀장</Text>
                  <Text style={styles.previewRowValue}>{preview.leader_name}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.hintBox}>
          <Icon name="information-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.hintText}>팀에 참여하면 팀 일정과 팀원 연락처가 공유됩니다.</Text>
        </View>

        <View style={{ flex: 1 }} />

        <Pressable onPress={handleJoin} disabled={submitting}>
          <LinearGradient
            colors={[colors.primaryLight, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.button, submitting && { opacity: 0.7 }]}
          >
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>팀 참여하기</Text>}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, padding: spacing.xl, gap: spacing.md },
  titleBlock: { gap: 4 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary },

  codeBoxesRow: { flexDirection: 'row', gap: spacing.sm },
  codeBox: {
    flex: 1, height: 54, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  codeBoxActive: { borderColor: colors.primary },
  codeBoxText: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },

  previewLoading: { paddingVertical: 12, alignItems: 'center' },
  previewError: { fontSize: 13, color: colors.danger, textAlign: 'center' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  previewCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg,
    padding: 16, gap: 8,
  },
  previewHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  previewAvatarImg: { width: 52, height: 52, borderRadius: 26 },
  previewAvatarText: { fontSize: 19, fontWeight: '700' },
  previewName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  previewSub: { fontSize: 12, color: colors.textSecondary },
  previewRow: { flexDirection: 'row', gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderHairline },
  previewRowLabel: { width: 60, fontSize: 13, color: colors.textSecondary },
  previewRowValue: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },

  hintBox: {
    flexDirection: 'row', gap: spacing.sm, padding: spacing.md,
    backgroundColor: '#E8F3FF', borderRadius: radius.md, alignItems: 'flex-start',
  },
  hintText: { flex: 1, fontSize: 13, color: colors.primaryDark, lineHeight: 18 },

  button: { height: 52, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
