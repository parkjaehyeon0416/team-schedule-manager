/**
 * 공개 프로필 화면 — DESIGN-CANVAS 기준, PROFILE_PUBLIC.dc.html
 * ★ 디자인엔 별도 "공개 프로필" 웹페이지가 있는 듯하지만, 백엔드엔 명함(BusinessCard) 공개
 *   페이지(/c/{share_code})만 있어서 "공유"는 그 링크를 공유함.
 * ★ "완료 현장"은 시공 완료 집계가 없어 등록된 현장 수로 대체(정직하게 라벨도 "등록 현장").
 * ★ "최근 작업" 3칸은 실제 사진을 모아오는 API가 없어 디자인 원본과 동일한 장식 placeholder로 둠.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Share, Linking, Alert, ScrollView, Image } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../components/AppHeader';
import { getMyBusinessCard, getPublicCardUrl } from '../api/businessCardApi';
import { getMyTeams, getTeamMembers } from '../api/teamApi';
import { getSites } from '../api/siteApi';
import { useAuthStore } from '../store/authStore';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import type { BusinessCard, Team } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';

const AVATAR_COLORS = ['#FFE3C2', '#D6ECFF', '#D9F6F1', '#ECE5FF', '#FFE0E0'];
const AVATAR_FG = ['#B95E00', '#0A6CE0', '#0B8574', '#6B4FD8', '#C03A3E'];

export default function ProfilePublicScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [card, setCard] = useState<BusinessCard | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [myRole, setMyRole] = useState<'lead' | 'member' | null>(null);
  const [siteCount, setSiteCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, teams, sites] = await Promise.all([
        getMyBusinessCard().catch(() => null),
        getMyTeams().catch(() => []),
        getSites().catch(() => []),
      ]);
      setCard(c);
      setSiteCount(sites.length);
      const active = teams.find(t => t.is_active) ?? null;
      setActiveTeam(active);
      if (active && user) {
        const members = await getTeamMembers(active.id).catch(() => []);
        const me = members.find(m => m.id === user.id);
        setMyRole(me && me.role_id <= 2 ? 'lead' : 'member');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !user) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="프로필" />
        <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  const avatarIdx = user.id % AVATAR_COLORS.length;
  const avatarUri = user.avatar_image_path ? `${SERVER_BASE_URL}/storage/${user.avatar_image_path}` : null;
  const workTags = card?.specialty ? card.specialty.split(',').map(s => s.trim()).filter(Boolean) : [];
  const metaLine = [card?.service_area, card?.years_experience ? `경력 ${card.years_experience}년` : null].filter(Boolean).join(' · ');
  const phone = card?.contact_phone ?? user.phone ?? null;

  const handleShare = () => {
    if (!card) {
      Alert.alert('공유 불가', '먼저 명함 정보를 입력해주세요.');
      return;
    }
    Share.share({ message: `[WorkMate] ${card.display_name ?? user.name} 프로필\n${getPublicCardUrl(card.share_code)}` }).catch(() => {});
  };

  const handleCall = () => {
    if (!phone) {
      Alert.alert('연락처 없음', '등록된 연락처가 없습니다.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        leftType="back"
        title="프로필"
        rightContent={
          <Pressable onPress={handleShare} style={styles.headerRightBtn}>
            <Icon name="share-variant" size={20} color={colors.textPrimary} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: AVATAR_COLORS[avatarIdx] }]}>
              <Text style={[styles.avatarFallbackText, { color: AVATAR_FG[avatarIdx] }]}>{user.name.charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.name}>{card?.display_name ?? user.name}</Text>
          {!!metaLine && <Text style={styles.meta}>{metaLine}</Text>}
          {workTags.length > 0 && (
            <View style={styles.tagRow}>
              {workTags.map(t => (
                <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.introCard}>
          <Text style={styles.sectionTitle}>소개</Text>
          <Text style={styles.introText}>{card?.tagline || '아직 소개가 등록되지 않았어요.'}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>소속 팀</Text><Text style={styles.infoValue}>{activeTeam ? `${activeTeam.name}${myRole === 'lead' ? ' (팀장)' : ''}` : '소속된 팀 없음'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>활동 지역</Text><Text style={styles.infoValue}>{card?.service_area ?? '-'}</Text></View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}><Text style={styles.infoLabel}>등록 현장</Text><Text style={styles.infoValue}>{siteCount}곳</Text></View>
        </View>

        <Text style={styles.sectionTitle}>최근 작업</Text>
        <View style={styles.photoGrid}>
          {[0, 1, 2].map(i => (
            <View key={i} style={styles.photoTile}>
              <Icon name="image-multiple-outline" size={22} color="#7F95B2" />
              <Text style={styles.photoTileText}>작업 사진</Text>
            </View>
          ))}
        </View>

        <View style={styles.footerRow}>
          <Pressable style={styles.callBtn} onPress={handleCall}>
            <Icon name="phone-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.callBtnText}>전화하기</Text>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('BusinessCard')}>
            <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.cardBtn}>
              <Icon name="card-account-details-outline" size={18} color="#FFFFFF" />
              <Text style={styles.cardBtnText}>명함 보기</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  headerRightBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  profileCard: { alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 18 },
  avatarImage: { width: 84, height: 84, borderRadius: 42 },
  avatarFallback: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 31, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  meta: { fontSize: 13, color: colors.textSecondary },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  tag: { height: 24, paddingHorizontal: 9, borderRadius: 7, backgroundColor: '#E8F3FF', alignItems: 'center', justifyContent: 'center' },
  tagText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },

  introCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 16, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  introText: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },

  infoCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16 },
  infoRow: { flexDirection: 'row', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  infoLabel: { width: 78, fontSize: 13, color: colors.textSecondary },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textPrimary },

  photoGrid: { flexDirection: 'row', gap: 6 },
  photoTile: { flex: 1, height: 96, borderRadius: 12, backgroundColor: '#E9F1FA', alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoTileText: { fontSize: 11, color: '#7F95B2' },

  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  callBtn: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: '#BFDBFB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  callBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  cardBtn: { height: 48, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  cardBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
