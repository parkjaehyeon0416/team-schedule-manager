/**
 * 내 명함 화면 — DESIGN-CANVAS 기준, BUSINESS_CARD.dc.html
 * 2026-10-02: "이미지 저장"을 `react-native-view-shot`(캡처) + `@react-native-camera-roll/camera-roll`
 *   (갤러리 저장) 신규 설치로 실제 구현함.
 * ★ 디자인 원본엔 QR(스캔하면 공개 프로필로 연결)이 있었지만, 실제로는 "명함 공유" 버튼으로
 *   보낸 링크를 받은 사람이 그냥 눌러서 보면 되는 거라 QR 스캔이 필요한 상황이 아예 없음
 *   (QR은 같은 자리에서 서로 다른 두 폰으로 주고받을 때나 의미가 있는데, 공유 버튼과 같이 있으니
 *   헷갈린다는 피드백을 받아 제거함).
 */
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Share, ScrollView, Platform, PermissionsAndroid } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import AppHeader from '../components/AppHeader';
import { getMyBusinessCard, getPublicCardUrl } from '../api/businessCardApi';
import { getMyTeams } from '../api/teamApi';
import { useAuthStore } from '../store/authStore';
import type { BusinessCard, Team } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';

export default function BusinessCardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [card, setCard] = useState<BusinessCard | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const cardShotRef = useRef<ViewShotRef>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getMyBusinessCard().catch(() => null), getMyTeams().catch(() => [])])
      .then(([c, teams]) => {
        setCard(c);
        setActiveTeam(teams.find(t => t.is_active) ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="내 명함" />
        <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  if (!card || !user) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="내 명함" />
        <View style={styles.content}>
          <View style={styles.emptyBox}>
            <Icon name="card-account-details-outline" size={40} color={colors.muted} />
            <Text style={styles.emptyText}>아직 명함 정보가 없어요.{'\n'}프로필 설정에서 정보를 입력하면 명함이 만들어져요.</Text>
            <Pressable onPress={() => navigation.navigate('ProfileEdit')}>
              <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>명함 만들기</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const specialtyLabel = card.specialty ? card.specialty.split(',').map(s => s.trim()).filter(Boolean).join(' · ') : '전문 분야 미입력';
  const locationLabel = [card.service_area, activeTeam?.name].filter(Boolean).join(' · ') || '활동 지역 미입력';
  const shareUrl = getPublicCardUrl(card.share_code);
  const shareMessage = `[현장메이트] ${card.display_name ?? user.name} 명함\n${specialtyLabel}\n${card.contact_phone ?? ''}\n${shareUrl}`;

  const handleShare = () => Share.share({ message: shareMessage }).catch(() => {});
  const handleCopyLink = () => {
    Clipboard.setString(shareUrl);
    Alert.alert('복사 완료', '명함 링크가 복사되었습니다.');
  };
  const handleSaveImage = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (Platform.OS === 'android' && Platform.Version < 29) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('권한 필요', '이미지 저장을 위해 저장소 접근 권한이 필요합니다.');
          return;
        }
      }
      const uri = await cardShotRef.current?.capture?.();
      if (!uri) throw new Error('capture failed');
      await CameraRoll.save(uri, { type: 'photo', album: '현장메이트' });
      Alert.alert('저장 완료', '명함 이미지가 갤러리에 저장되었습니다.');
    } catch (e) {
      Alert.alert('저장 실패', '명함 이미지 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="내 명함" />
      <ScrollView contentContainerStyle={styles.content}>
        <ViewShot ref={cardShotRef} options={{ format: 'png', quality: 1 }}>
          <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.card}>
            <View style={styles.cardTopRow}>
              <View style={{ gap: 4 }}>
                <Text style={styles.cardName}>{card.display_name ?? user.name}</Text>
                <Text style={styles.cardSpecialty}>{specialtyLabel}</Text>
              </View>
              <View style={styles.brandRow}>
                <Icon name="home-city-outline" size={18} color="#FFFFFF" />
                <Text style={styles.brandText}>현장메이트</Text>
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <View style={styles.cardInfoRow}>
                <Icon name="cellphone" size={14} color="#FFFFFF" />
                <Text style={styles.cardInfoText}>{card.contact_phone ?? user.phone ?? '연락처 미입력'}</Text>
              </View>
              <View style={styles.cardInfoRow}>
                <Icon name="email-outline" size={14} color="#FFFFFF" />
                <Text style={styles.cardInfoText}>{user.email}</Text>
              </View>
              <View style={styles.cardInfoRow}>
                <Icon name="map-marker-outline" size={14} color="#FFFFFF" />
                <Text style={styles.cardInfoText}>{locationLabel}</Text>
              </View>
            </View>
          </LinearGradient>
        </ViewShot>

        <Text style={styles.sectionTitle}>명함 공유</Text>
        <View style={styles.shareRow}>
          <Pressable style={styles.shareItem} onPress={handleShare}>
            <View style={[styles.shareIcon, { backgroundColor: colors.warningBg }]}><Icon name="chat-outline" size={22} color={colors.accentDark} /></View>
            <Text style={styles.shareLabel}>카카오톡</Text>
          </Pressable>
          <Pressable style={styles.shareItem} onPress={handleShare}>
            <View style={[styles.shareIcon, { backgroundColor: colors.successBg }]}><Icon name="message-text-outline" size={22} color={colors.secondary} /></View>
            <Text style={styles.shareLabel}>문자</Text>
          </Pressable>
          <Pressable style={styles.shareItem} onPress={handleCopyLink}>
            <View style={[styles.shareIcon, { backgroundColor: '#E8F3FF' }]}><Icon name="link-variant" size={22} color={colors.primaryDark} /></View>
            <Text style={styles.shareLabel}>링크 복사</Text>
          </Pressable>
          <Pressable style={styles.shareItem} onPress={handleSaveImage} disabled={saving}>
            <View style={[styles.shareIcon, { backgroundColor: '#EEF2F7' }]}>
              {saving ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <Icon name="tray-arrow-down" size={22} color={colors.textSecondary} />}
            </View>
            <Text style={styles.shareLabel}>이미지 저장</Text>
          </Pressable>
        </View>

        <View style={styles.footerRow}>
          <Pressable style={styles.editBtn} onPress={() => navigation.navigate('ProfileEdit')}>
            <Icon name="pencil-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.editBtnText}>명함 수정</Text>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('ProfilePublic')}>
            <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.publicBtn}>
              <Icon name="eye-outline" size={18} color="#FFFFFF" />
              <Text style={styles.publicBtnText}>공개 프로필</Text>
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

  emptyBox: { alignItems: 'center', gap: 14, padding: 28, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, marginTop: spacing.xl },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { height: 48, paddingHorizontal: 24, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  card: { borderRadius: 20, padding: 22, gap: 18 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  cardSpecialty: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  cardInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardInfoText: { fontSize: 13, color: '#FFFFFF' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  shareRow: { flexDirection: 'row', justifyContent: 'space-around' },
  shareItem: { alignItems: 'center', gap: 6 },
  shareIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  shareLabel: { fontSize: 12, color: colors.textPrimary },

  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  editBtn: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: '#BFDBFB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  editBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  publicBtn: { height: 48, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  publicBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
