/**
 * 공개 프로필 화면 — DESIGN-CANVAS 기준, PROFILE_PUBLIC.dc.html
 * ★ 디자인엔 별도 "공개 프로필" 웹페이지가 있는 듯하지만, 백엔드엔 명함(BusinessCard) 공개
 *   페이지(/c/{share_code})만 있어서 "공유"는 그 링크를 공유함.
 * ★ "완료 현장"은 시공 완료 집계가 없어 등록된 현장 수로 대체(정직하게 라벨도 "등록 현장").
 * ★ v18.68 — "최근 작업"에 가짜 '작업 사진' 칸 3개 대신 공개 명함 웹페이지(/c/{code})와 같은 실제 사진을 보여줌.
 *   GET /api/business-card의 showcase_photos(서버 CardShowcase — 웹페이지와 같은 코드·같은 EXIF 없는 640px 주소).
 *   시공 후만: 정사각 3칸 / 전 · 후 모두: 한 줄에 한 쌍씩 "시공 전"·"시공 후" 표시(웹페이지와 같은 모양).
 *   명함 없음·비공개·사진 공개 안 함·보여줄 사진 없음이면 사진 칸 대신 안내 한 줄.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Share, Linking, Alert, ScrollView, Image, type StyleProp, type ViewStyle } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from '../components/Gradient';
import AppHeader from '../components/AppHeader';
import { getMyBusinessCard, getPublicCardUrl, showcasePhotoUri, type BusinessCardShowcasePhoto, type MyBusinessCard } from '../api/businessCardApi';
import { getMyTeams, getTeamMembers } from '../api/teamApi';
import { getSites } from '../api/siteApi';
import { useAuthStore } from '../store/authStore';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import type { Team } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';
// ★ v18.68 — 아바타 색은 내정보·프로필 수정·팀 화면과 같은 공용 규칙(고른 색 우선, 기본값 #1F3864는 무시)
import { avatarColors } from '../components/TeamUi';

/** ★ v18.68 — 공개 명함 사진 한 칸. 못 불러오면(그 사이 비공개로 바꿈 등) 깨진 그림 대신 아이콘 */
function ShowcaseTile({ photo, label, style }: { photo: BusinessCardShowcasePhoto; label?: string; style: StyleProp<ViewStyle> }) {
  const [failed, setFailed] = useState(false);
  const what = photo.category === 'before' ? '시공 전' : '시공 후';
  return (
    <View style={[styles.photoTile, style]} accessible accessibilityRole="image" accessibilityLabel={`${what} 사진`}>
      {failed ? (
        <Icon name="image-off-outline" size={22} color="#7F95B2" />
      ) : (
        <Image source={{ uri: showcasePhotoUri(photo.url) }} style={styles.photoImage} resizeMode="cover" onError={() => setFailed(true)} />
      )}
      {!!label && (
        <View style={[styles.shotBadge, photo.category === 'after' && styles.shotBadgeAfter]}>
          <Text style={styles.shotBadgeText}>{label}</Text>
        </View>
      )}
    </View>
  );
}

/** ★ v18.68 — 사진 칸 대신 보여줄 안내(사진이 보이면 null) */
function showcaseEmptyText(card: MyBusinessCard | null, photos: BusinessCardShowcasePhoto[]): string | null {
  if (!card) return '명함을 만들면 시공 사진을 함께 보여줄 수 있어요.';
  if (!card.is_public) return '명함이 비공개라 시공 사진도 보이지 않아요.';
  const mode = card.showcase_mode ?? 'none';
  if (mode === 'none') return "현장 사진 공개가 꺼져 있어요. '내 명함'에서 켤 수 있어요.";
  if (photos.length === 0) {
    return mode === 'both' ? '아직 보여줄 시공 전 · 후 사진이 없어요.' : '아직 보여줄 시공 후 사진이 없어요.';
  }
  return null;
}

export default function ProfilePublicScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [card, setCard] = useState<MyBusinessCard | null>(null);
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

  const [avatarBg, avatarFg] = avatarColors(user.id, user.avatar_color);
  const avatarUri = user.avatar_image_path ? `${SERVER_BASE_URL}/storage/${user.avatar_image_path}` : null;
  const workTags = card?.specialty ? card.specialty.split(',').map(s => s.trim()).filter(Boolean) : [];
  const metaLine = [card?.service_area, card?.years_experience ? `경력 ${card.years_experience}년` : null].filter(Boolean).join(' · ');
  const phone = card?.contact_phone ?? user.phone ?? null;
  // ★ v18.68 — 공개 명함 웹페이지에 지금 보이는 사진(서버가 비공개·사진 공개 안 함이면 빈 배열로 줌)
  const photos = card?.is_public ? card.showcase_photos ?? [] : [];
  const photoEmpty = showcaseEmptyText(card, photos);
  const isPairs = photos.some(p => p.category === 'before');
  const pairs = isPairs
    ? Object.values(
        photos.reduce<Record<number, { before?: BusinessCardShowcasePhoto; after?: BusinessCardShowcasePhoto }>>((acc, p) => {
          const k = p.pair_index ?? 0;
          acc[k] = { ...acc[k], [p.category]: p };
          return acc;
        }, {}),
      )
    : [];

  const handleShare = () => {
    if (!card) {
      Alert.alert('공유 불가', '먼저 명함 정보를 입력해주세요.');
      return;
    }
    Share.share({ message: `[현장메이트] ${card.display_name ?? user.name} 프로필\n${getPublicCardUrl(card.share_code)}` }).catch(() => {});
  };

  // ★ v18.68 — RN7은 navigate가 이전 화면으로 돌아가지 않고 새로 쌓음 → 명함 화면에서 왔으면 그 화면으로 돌아감(명함 ↔ 프로필 무한 쌓임 방지)
  const openCard = () => {
    const routes: { name: string }[] = navigation.getState()?.routes ?? [];
    if (routes.some(r => r.name === 'BusinessCard')) navigation.popTo('BusinessCard');
    else navigation.navigate('BusinessCard');
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
            <View style={[styles.avatarFallback, { backgroundColor: avatarBg }]}>
              <Text style={[styles.avatarFallbackText, { color: avatarFg }]}>{user.name.charAt(0)}</Text>
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
        {/* ★ v18.68 — 공개 명함 웹페이지와 같은 실제 사진(가짜 '작업 사진' 칸 없음) */}
        {photoEmpty ? (
          <View style={styles.photoEmpty}>
            <Icon name="image-multiple-outline" size={18} color="#7F95B2" />
            <Text style={styles.photoEmptyText}>{photoEmpty}</Text>
          </View>
        ) : isPairs ? (
          <View style={styles.pairList}>
            {pairs.map((pr, i) => (
              <View key={pr.after?.url ?? pr.before?.url ?? i} style={styles.photoGrid}>
                {pr.before ? <ShowcaseTile photo={pr.before} label="시공 전" style={styles.pairTile} /> : <View style={[styles.pairTile, styles.photoGhost]} />}
                {pr.after ? <ShowcaseTile photo={pr.after} label="시공 후" style={styles.pairTile} /> : <View style={[styles.pairTile, styles.photoGhost]} />}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.photoGrid}>
            {[0, 1, 2].map(i => (photos[i]
              ? <ShowcaseTile key={photos[i].url} photo={photos[i]} style={styles.squareTile} />
              : <View key={`ghost-${i}`} style={[styles.squareTile, styles.photoGhost]} />))}
          </View>
        )}

        <View style={styles.footerRow}>
          <Pressable style={styles.callBtn} onPress={handleCall}>
            <Icon name="phone-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.callBtnText}>전화하기</Text>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={openCard}>
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

  // ★ v18.68 — 실제 사진: 시공 후만은 정사각 3칸, 전 · 후는 4:3 두 칸씩(웹페이지와 같은 비율·라벨 색)
  photoGrid: { flexDirection: 'row', gap: 6 },
  pairList: { gap: 8 },
  photoTile: { borderRadius: 12, backgroundColor: '#E9F1FA', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  squareTile: { flex: 1, aspectRatio: 1 },
  pairTile: { flex: 1, aspectRatio: 4 / 3 },
  photoGhost: { backgroundColor: 'transparent' },
  photoImage: { width: '100%', height: '100%' },
  shotBadge: { position: 'absolute', left: 6, top: 6, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, backgroundColor: 'rgba(16, 42, 86, 0.72)' },
  shotBadgeAfter: { backgroundColor: 'rgba(10, 108, 224, 0.88)' },
  shotBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  photoEmpty: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 14 },
  photoEmptyText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  callBtn: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: '#BFDBFB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  callBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  cardBtn: { height: 48, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  cardBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
