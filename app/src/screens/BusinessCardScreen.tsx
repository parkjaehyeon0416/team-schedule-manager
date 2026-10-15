/**
 * 내 명함 화면 — DESIGN-CANVAS 기준, BUSINESS_CARD.dc.html
 * 2026-10-02: "이미지 저장"을 `react-native-view-shot`(캡처) + `@react-native-camera-roll/camera-roll`
 *   (갤러리 저장) 신규 설치로 실제 구현함.
 * ★ 디자인 원본엔 QR(스캔하면 공개 프로필로 연결)이 있었지만, 실제로는 "명함 공유" 버튼으로
 *   보낸 링크를 받은 사람이 그냥 눌러서 보면 되는 거라 QR 스캔이 필요한 상황이 아예 없음
 *   (QR은 같은 자리에서 서로 다른 두 폰으로 주고받을 때나 의미가 있는데, 공유 버튼과 같이 있으니
 *   헷갈린다는 피드백을 받아 제거함).
 * ★ v18.68 — BUSINESS_CARD / BUSINESS_CARD_PUBLIC 디자인: "명함 공개" 스위치 + "현장 사진 공개"
 *   (공개 안 함 / 시공 후만 / 전 · 후 모두). 비공개면 사진 선택·카카오톡·문자·링크 복사·공개 프로필이
 *   막히고 이미지 저장만 가능. 바꾸면 화면부터 바로 바뀌고(낙관적 갱신) 실패하면 되돌린 뒤 서버 메시지.
 *   QR이 없으니 상태 문구의 "QR과 "는 뺐고, 디자인의 QR 위 "비공개" 표시는 카드 오른쪽 아래 배지로 옮김
 *   (배지는 캡처 영역 밖이라 저장 이미지엔 안 찍힘).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Share, ScrollView, Platform, PermissionsAndroid } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from '../components/Gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import AppHeader from '../components/AppHeader';
import { getMyBusinessCard, getPublicCardUrl, updateBusinessCardVisibility } from '../api/businessCardApi';
import { getMyTeams } from '../api/teamApi';
import { useAuthStore } from '../store/authStore';
import type { BusinessCard, BusinessCardShowcaseMode, Team } from '../types/api';
import { colors, radius, shadow, spacing } from '../theme/designTokens';

const SHOWCASE_OPTIONS: { value: BusinessCardShowcaseMode; label: string; desc: string }[] = [
  { value: 'none', label: '공개 안 함', desc: '공개 프로필에 현장 사진을 보여주지 않아요' },
  { value: 'after', label: '시공 후만', desc: '완성된 모습(시공 후 사진)만 보여줘요' },
  { value: 'both', label: '전 · 후 모두', desc: '시공 전 · 후 사진을 나란히 보여줘요' },
];

type VisibilityPatch = { is_public?: boolean; showcase_mode?: BusinessCardShowcaseMode };

export default function BusinessCardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [card, setCard] = useState<BusinessCard | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const cardShotRef = useRef<ViewShotRef>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updatingRef = useRef(false);
  const mountedRef = useRef(true);
  // 공개 설정 저장(PUT)이 끝날 때마다 1씩 올림 — 그 전에 시작한 불러오기(GET)의 공개 값은 옛 값일 수 있어서 구분용
  const visibilityVersionRef = useRef(0);

  const load = useCallback(() => {
    setLoading(true);
    const startVersion = visibilityVersionRef.current;
    Promise.all([getMyBusinessCard().catch(() => null), getMyTeams().catch(() => [])])
      .then(([c, teams]) => {
        if (!mountedRef.current) return;
        const visibilityStale = updatingRef.current || visibilityVersionRef.current !== startVersion;
        if (visibilityStale) {
          // 공개 설정 저장이 진행 중이거나 그 사이 끝났으면 공개 값(is_public·showcase_mode)은 저장 결과를 유지하고 나머지만 새로 반영
          setCard(cur => (cur && c ? { ...c, is_public: cur.is_public, showcase_mode: cur.showcase_mode } : cur ?? c));
        } else {
          setCard(c);
        }
        setActiveTeam(teams.find(t => t.is_active) ?? null);
      })
      .finally(() => { if (mountedRef.current) setLoading(false); });
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = (msg: string, error = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, error });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  /** 공개 여부 / 현장 사진 공개 범위 바꾸기 — 화면 먼저 바꾸고, 실패하면 바꾼 항목만 되돌림 */
  const updateVisibility = async (patch: VisibilityPatch, successMsg: string) => {
    if (!card || updatingRef.current) return;
    updatingRef.current = true;
    const prev: VisibilityPatch = {};
    if (patch.is_public !== undefined) prev.is_public = card.is_public;
    if (patch.showcase_mode !== undefined) prev.showcase_mode = card.showcase_mode ?? 'none';
    setCard(c => (c ? { ...c, ...patch } : c));
    try {
      const saved = await updateBusinessCardVisibility(patch);
      if (!mountedRef.current) return;
      // 성공 응답이면 서버 값을 믿음(계약상 PUT은 showcase_mode가 든 명함 전체를 돌려줌).
      // 사진 공개를 보냈는데 응답에 그 값이 없거나 다르면 서버가 저장하지 않은 것
      // (v18.68 이전 백엔드는 모르는 showcase_mode를 조용히 버리고 200을 돌려줌) → 성공 토스트 대신 오류로 알림
      const showcaseNotSaved = patch.showcase_mode !== undefined && saved?.showcase_mode !== patch.showcase_mode;
      setCard(c => {
        if (!saved) return showcaseNotSaved && c ? { ...c, ...prev } : c;
        return { ...saved, showcase_mode: saved.showcase_mode ?? 'none' };
      });
      if (showcaseNotSaved) {
        showToast('현장 사진 공개 설정을 저장하지 못했어요. 다시 시도해주세요.', true);
      } else {
        showToast(successMsg);
      }
    } catch (e: any) {
      if (!mountedRef.current) return;
      setCard(c => (c ? { ...c, ...prev } : c));
      showToast(e?.response?.data?.message ?? '명함 공개 설정을 바꾸지 못했어요. 다시 시도해주세요.', true);
    } finally {
      updatingRef.current = false;
      visibilityVersionRef.current += 1;
    }
  };

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

  const isPublic = !!card.is_public;
  const showcase: BusinessCardShowcaseMode = card.showcase_mode ?? 'none';
  const specialtyLabel = card.specialty ? card.specialty.split(',').map(s => s.trim()).filter(Boolean).join(' · ') : '전문 분야 미입력';
  const locationLabel = [card.service_area, activeTeam?.name].filter(Boolean).join(' · ') || '활동 지역 미입력';
  const shareUrl = getPublicCardUrl(card.share_code);
  const shareMessage = `[현장메이트] ${card.display_name ?? user.name} 명함\n${specialtyLabel}\n${card.contact_phone ?? ''}\n${shareUrl}`;

  const togglePublic = () => {
    const next = !isPublic;
    updateVisibility({ is_public: next }, next ? '명함을 공개했어요' : '명함을 비공개로 바꿨어요');
  };
  const pickShowcase = (value: BusinessCardShowcaseMode, label: string) => {
    if (!isPublic || value === showcase) return;
    updateVisibility({ showcase_mode: value }, `현장 사진 공개를 '${label}'(으)로 바꿨어요`);
  };

  // ★ v18.68 — RN7은 navigate가 이전 화면으로 돌아가지 않고 새로 쌓음 → 프로필 화면에서 왔으면 그 화면으로 돌아감
  //   (ProfilePublic의 openCard와 반대 방향 같은 처리 — 내정보 → 프로필 → 명함 → 프로필이 두 겹 쌓이던 것)
  const openProfilePublic = () => {
    const routes: { name: string }[] = navigation.getState()?.routes ?? [];
    if (routes.some(r => r.name === 'ProfilePublic')) navigation.popTo('ProfilePublic');
    else navigation.navigate('ProfilePublic');
  };

  const handleShare = () => {
    if (!isPublic) return;
    Share.share({ message: shareMessage }).catch(() => {});
  };
  const handleCopyLink = () => {
    if (!isPublic) return;
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
    } catch {
      Alert.alert('저장 실패', '명함 이미지 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const shareTargets = [
    { key: 'kakao', label: '카카오톡', icon: 'chat-outline', bgStyle: styles.shareIconKakao, fg: colors.accentDark, onPress: handleShare },
    { key: 'sms', label: '문자', icon: 'message-text-outline', bgStyle: styles.shareIconSms, fg: colors.secondary, onPress: handleShare },
    { key: 'link', label: '링크 복사', icon: 'link-variant', bgStyle: styles.shareIconLink, fg: colors.primaryDark, onPress: handleCopyLink },
  ];

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="내 명함" />
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <ViewShot ref={cardShotRef} options={{ format: 'png', quality: 1 }}>
            <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardNameCol}>
                  <Text style={styles.cardName}>{card.display_name ?? user.name}</Text>
                  <Text style={styles.cardSpecialty}>{specialtyLabel}</Text>
                </View>
                <View style={styles.brandRow}>
                  <Icon name="home-city-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.brandText}>현장메이트</Text>
                </View>
              </View>
              <View style={[styles.cardInfoCol, !isPublic && styles.cardInfoWithBadge]}>
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
          {!isPublic && (
            <View style={styles.privateBadge} accessible accessibilityLabel="비공개 명함이에요">
              <Icon name="lock-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.privateBadgeText}>비공개</Text>
            </View>
          )}
        </View>

        {/* 명함 공개 · 현장 사진 공개 */}
        <View style={styles.settingsCard}>
          <View style={styles.publicRow}>
            <View style={styles.publicText}>
              <Text style={styles.publicTitle}>명함 공개</Text>
              <Text style={[styles.publicState, isPublic ? styles.publicStateOn : styles.publicStateOff]}>
                {isPublic ? '공개 중 · 링크로 누구나 볼 수 있어요' : '비공개 · 나만 볼 수 있어요'}
              </Text>
            </View>
            <Pressable
              onPress={togglePublic}
              hitSlop={8}
              accessibilityRole="switch"
              accessibilityLabel="명함 공개"
              accessibilityState={{ checked: isPublic }}
              style={[styles.switchTrack, isPublic ? styles.switchTrackOn : styles.switchTrackOff]}>
              <View style={styles.switchKnob} />
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.showcaseHead}>
            <Text style={styles.showcaseTitle}>현장 사진 공개</Text>
            <Text style={styles.showcaseSub}>공개 프로필 아래에 보여줄 사진을 골라요</Text>
          </View>

          <View accessibilityRole="radiogroup" accessibilityLabel="현장 사진 공개" style={[styles.radioGroup, !isPublic && styles.radioGroupDim]}>
            {SHOWCASE_OPTIONS.map(o => {
              const on = showcase === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => pickShowcase(o.value, o.label)}
                  disabled={!isPublic}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on, disabled: !isPublic }}
                  style={[styles.radioRow, on ? styles.radioRowOn : styles.radioRowOff]}>
                  <View style={on ? styles.radioDotOn : styles.radioDotOff} />
                  <View style={styles.radioText}>
                    <Text style={styles.radioLabel}>{o.label}</Text>
                    <Text style={styles.radioDesc}>{o.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {!isPublic && (
            <View style={styles.lockNote}>
              <Icon name="lock-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.lockNoteText}>명함을 공개하면 고를 수 있어요</Text>
            </View>
          )}
          <Text style={styles.privacyNote}>고객 이름 · 주소 같은 현장 정보는 공개되지 않아요.</Text>
        </View>

        {/* 명함 공유 */}
        <View style={styles.shareSection}>
          <Text style={styles.sectionTitle}>명함 공유</Text>
          <View style={styles.shareRow}>
            {shareTargets.map(t => (
              <Pressable
                key={t.key}
                style={styles.shareItem}
                onPress={t.onPress}
                disabled={!isPublic}
                accessibilityRole="button"
                accessibilityState={{ disabled: !isPublic }}>
                <View style={[styles.shareIcon, isPublic ? t.bgStyle : styles.shareIconGray]}>
                  <Icon name={t.icon} size={22} color={isPublic ? t.fg : colors.textSecondary} />
                </View>
                <Text style={[styles.shareLabel, !isPublic && styles.shareLabelDisabled]}>{t.label}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.shareItem} onPress={handleSaveImage} disabled={saving} accessibilityRole="button">
              <View style={[styles.shareIcon, styles.shareIconGray]}>
                {saving ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <Icon name="tray-arrow-down" size={22} color={colors.textSecondary} />}
              </View>
              <Text style={styles.shareLabel}>이미지 저장</Text>
            </Pressable>
          </View>
          {!isPublic && <Text style={styles.shareNote}>비공개일 때는 이미지 저장만 할 수 있어요</Text>}
        </View>

        <View style={styles.footerRow}>
          <Pressable style={styles.editBtn} onPress={() => navigation.navigate('ProfileEdit')}>
            <Icon name="pencil-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.editBtnText}>명함 수정</Text>
          </Pressable>
          {isPublic ? (
            <Pressable style={styles.flex1} onPress={openProfilePublic}>
              <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.publicBtn}>
                <Icon name="eye-outline" size={18} color="#FFFFFF" />
                <Text style={styles.publicBtnText}>공개 프로필</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <View
              style={[styles.publicBtn, styles.publicBtnDisabled]}
              accessible
              accessibilityRole="button"
              accessibilityLabel="공개 프로필"
              accessibilityHint="명함을 공개하면 볼 수 있어요"
              accessibilityState={{ disabled: true }}>
              <Icon name="lock-outline" size={18} color="#FFFFFF" />
              <Text style={styles.publicBtnText}>공개 프로필</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {!!toast && (
        <Pressable onPress={() => setToast(null)} style={styles.toast} accessibilityLiveRegion="polite">
          <View style={[styles.toastDot, toast.error && styles.toastDotError]}>
            <Icon name={toast.error ? 'exclamation-thick' : 'check'} size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.toastText}>{toast.msg}</Text>
        </Pressable>
      )}
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
  cardNameCol: { gap: 4 },
  cardInfoCol: { gap: 6 },
  cardInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardInfoText: { fontSize: 13, color: '#FFFFFF' },
  // 비공개 배지(카드 오른쪽 아래)와 긴 연락처가 겹치지 않게 비워 둠
  cardInfoWithBadge: { paddingRight: 84 },
  privateBadge: {
    position: 'absolute', right: 22, bottom: 22, flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.88)',
  },
  privateBadgeText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },

  settingsCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg,
    padding: 16, gap: 12, ...shadow.card,
  },
  publicRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  publicText: { flex: 1, gap: 3 },
  publicTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  publicState: { fontSize: 12, fontWeight: '600' },
  publicStateOn: { color: '#0B8574' },
  publicStateOff: { color: colors.textSecondary },
  switchTrack: { width: 50, height: 30, borderRadius: 15, padding: 3, flexDirection: 'row', alignItems: 'center' },
  switchTrackOn: { backgroundColor: colors.primary, justifyContent: 'flex-end' },
  switchTrackOff: { backgroundColor: '#D5DFEB', justifyContent: 'flex-start' },
  switchKnob: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF',
    shadowColor: '#000000', shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  divider: { height: 1, backgroundColor: colors.borderHairline },
  showcaseHead: { gap: 2 },
  showcaseTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  showcaseSub: { fontSize: 12, color: colors.textSecondary },
  radioGroup: { gap: 8 },
  radioGroupDim: { opacity: 0.45 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  radioRowOn: { borderColor: '#7DBBFF', backgroundColor: '#F3F9FF' },
  radioRowOff: { borderColor: colors.border, backgroundColor: colors.surface },
  radioDotOn: { width: 20, height: 20, borderRadius: 10, borderWidth: 6, borderColor: colors.primary },
  radioDotOff: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#C5D5E8' },
  radioText: { flex: 1, gap: 2 },
  radioLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  radioDesc: { fontSize: 12, color: colors.textSecondary },
  lockNote: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockNoteText: { fontSize: 12, color: colors.textSecondary },
  privacyNote: { fontSize: 12, color: colors.muted, lineHeight: 18 },

  shareSection: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  shareRow: { flexDirection: 'row' },
  shareItem: { flex: 1, alignItems: 'center', gap: 6 },
  shareIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  shareIconKakao: { backgroundColor: colors.warningBg },
  shareIconSms: { backgroundColor: colors.successBg },
  shareIconLink: { backgroundColor: '#E8F3FF' },
  shareIconGray: { backgroundColor: '#EEF2F7' },
  shareLabel: { fontSize: 12, color: colors.textPrimary },
  shareLabelDisabled: { color: '#A9B6C8' },
  shareNote: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },

  flex1: { flex: 1 },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  editBtn: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: '#BFDBFB', backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  editBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  publicBtn: { height: 48, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  publicBtnDisabled: { flex: 1, backgroundColor: '#DCE9F8' },
  publicBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  toast: {
    position: 'absolute', left: 16, right: 16, bottom: 24, zIndex: 25, paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: 12, backgroundColor: 'rgba(16,42,86,0.94)', flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  toastDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#2CC4B2', alignItems: 'center', justifyContent: 'center' },
  toastDotError: { backgroundColor: colors.danger },
  toastText: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
