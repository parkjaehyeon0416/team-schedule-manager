/**
 * 현장별 앨범 — DESIGN-CANVAS 기준, TEAM_ALBUM_SITE.dc.html (★ v18.48)
 * 단계(전체/시공 전/중/후/기타) · 올린 사람 필터, 3열 사진 격자(60장씩 더 불러오기), 크게 보기(올린 사람·날짜·저장).
 * 오른쪽 위 카메라: 이 현장을 수정할 수 있는 사람(팀장·부팀장·개인 현장 주인)만 사진 올리기.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image, Modal, Alert, Platform, PermissionsAndroid, Dimensions } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ViewShot from 'react-native-view-shot';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import dayjs from 'dayjs';
import AppHeader from '../components/AppHeader';
import { getTeamAlbumPhotos } from '../api/teamApi';
import type { AlbumPhoto, AlbumPhotoPage, PhotoStage } from '../api/teamApi';
import { uploadSitePhoto } from '../api/siteApi';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import { pickImage } from '../utils/pickImage';
import { Avatar } from '../components/TeamUi';
import { STAGE_LABEL, STAGE_BG } from './TeamAlbumScreen';
import { colors, spacing } from '../theme/designTokens';
import { isPlanLocked } from '../utils/planLock';

const STAGES: (PhotoStage | null)[] = [null, 'before', 'during', 'after', 'other'];
const SIDE = (Dimensions.get('window').width - 6) / 3;

export default function TeamAlbumSiteScreen() {
  const route = useRoute<any>();
  const { teamId, siteId } = route.params as { teamId: number; siteId: number };
  const [stage, setStage] = useState<PhotoStage | null>(null);
  const [uploader, setUploader] = useState<number | null>(null);
  const [page, setPage] = useState<AlbumPhotoPage | null>(null);
  const [items, setItems] = useState<AlbumPhoto[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [view, setView] = useState<AlbumPhoto | null>(null);
  const [saving, setSaving] = useState(false);
  const shotRef = useRef<any>(null);

  const load = useCallback(async (p = 1) => {
    const r = await getTeamAlbumPhotos(teamId, { site_id: siteId, category: stage ?? undefined, uploader: uploader ?? undefined, page: p });
    setPage(r);
    setItems(prev => (p === 1 ? r.items : [...prev, ...r.items]));
  }, [teamId, siteId, stage, uploader]);

  useEffect(() => { load(1).catch(() => setPage(null)); }, [load]);

  const more = async () => {
    if (!page || loadingMore) return;
    setLoadingMore(true);
    try { await load(page.page + 1); } finally { setLoadingMore(false); }
  };

  const upload = async () => {
    const asset = await pickImage();
    if (!asset?.uri || !asset.fileName || !asset.type) return;
    Alert.alert('어떤 사진인가요?', undefined, [
      ...(['before', 'during', 'after', 'other'] as PhotoStage[]).map(c => ({
        text: STAGE_LABEL[c],
        onPress: async () => {
          try {
            await uploadSitePhoto(siteId, { uri: asset.uri!, name: asset.fileName!, type: asset.type! }, c);
            load(1);
          } catch (e: any) {
            if (!isPlanLocked(e)) Alert.alert('업로드 실패', e?.response?.data?.message || '다시 시도해주세요.');
          }
        },
      })),
      { text: '취소', style: 'cancel' as const },
    ]);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (Platform.OS === 'android' && Platform.Version < 29) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('권한 필요', '사진 저장을 위해 저장소 접근 권한이 필요합니다.');
          return;
        }
      }
      const uri = await shotRef.current?.capture?.();
      if (!uri) throw new Error('capture failed');
      await CameraRoll.save(uri, { type: 'photo', album: 'WorkMate' });
      Alert.alert('저장 완료', '사진을 갤러리에 저장했어요.');
    } catch {
      Alert.alert('저장 실패', '사진을 저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  const chip = (label: string, on: boolean, dark: boolean, onPress: () => void, key: string) => (
    <Pressable key={key} onPress={onPress} accessibilityState={{ selected: on }}
      style={[styles.chip, on && (dark ? styles.chipDarkOn : styles.chipOn)]}>
      <Text style={[styles.chipText, on && { color: dark ? '#FFFFFF' : colors.primaryDark }]}>{label}</Text>
    </Pressable>
  );

  const site = page?.site;

  return (
    <View style={styles.screen}>
      <AppHeader
        leftType="back"
        title="현장 앨범"
        rightContent={site?.can_upload ? (
          <Pressable onPress={upload} style={styles.headerBtn} accessibilityLabel="사진 올리기">
            <Icon name="camera-outline" size={22} color={colors.textPrimary} />
          </Pressable>
        ) : undefined}
      />
      {!page ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={{ gap: 2 }}>
            <Text style={styles.title}>{site?.name ?? '현장'}</Text>
            <Text style={styles.muted}>{[site?.address, `사진 ${page.total}장`].filter(Boolean).join(' · ')}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.bleed}>
            {STAGES.map(s => chip(s ? STAGE_LABEL[s] : '전체', stage === s, false, () => setStage(s), s ?? 'all'))}
          </ScrollView>
          {page.uploaders.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.bleed}>
              {chip('모든 사람', uploader === null, true, () => setUploader(null), 'all')}
              {page.uploaders.map(u => chip(u.name, uploader === u.id, true, () => setUploader(u.id), String(u.id)))}
            </ScrollView>
          )}
          <View style={[styles.grid, styles.bleed]}>
            {items.map(p => (
              <Pressable key={p.id} onPress={() => setView(p)} style={styles.cell}
                accessibilityLabel={`${STAGE_LABEL[p.category]} 사진 · ${p.uploader?.name ?? ''} · ${dayjs(p.created_at).format('M월 D일')}`}>
                <Image source={{ uri: `${SERVER_BASE_URL}${p.url}` }} style={styles.cellImg} />
                <View style={[styles.stageTag, { backgroundColor: STAGE_BG[p.category] }]}>
                  <Text style={styles.stageText}>{STAGE_LABEL[p.category]}</Text>
                </View>
              </Pressable>
            ))}
          </View>
          {items.length === 0 && <Text style={styles.none}>조건에 맞는 사진이 없어요.</Text>}
          {page.page < page.pages && (
            <Pressable style={styles.moreBtn} onPress={more} disabled={loadingMore}>
              {loadingMore ? <ActivityIndicator color={colors.primaryDark} /> : <Text style={styles.moreText}>사진 더 불러오기 (60장씩)</Text>}
            </Pressable>
          )}
        </ScrollView>
      )}

      <Modal visible={!!view} animationType="fade" onRequestClose={() => setView(null)} statusBarTranslucent>
        {view && (
          <View style={styles.viewer} accessibilityViewIsModal>
            <View style={styles.viewerTop}>
              <View style={[styles.viewerStage, { backgroundColor: STAGE_BG[view.category] }]}>
                <Text style={styles.viewerStageText}>{STAGE_LABEL[view.category]}</Text>
              </View>
              <Pressable onPress={() => setView(null)} accessibilityLabel="닫기" style={styles.headerBtn}>
                <Icon name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
            <View style={styles.viewerBody}>
              <ViewShot ref={shotRef} options={{ format: 'jpg', quality: 0.95 }} style={{ width: '100%' }}>
                <Image source={{ uri: `${SERVER_BASE_URL}${view.url}` }} style={styles.viewerImg} resizeMode="contain" />
              </ViewShot>
            </View>
            <View style={styles.viewerFoot}>
              <Avatar id={view.uploader?.id ?? 0} name={view.uploader?.name ?? '?'} color={view.uploader?.avatar_color} image={view.uploader?.avatar_image_path} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.viewerName}>{view.uploader?.name ?? '알 수 없음'}</Text>
                <Text style={styles.viewerSub}>{dayjs(view.created_at).format('M월 D일')} 올림 · {view.site.name}</Text>
              </View>
              <Pressable onPress={save} style={styles.saveBtn} accessibilityLabel="사진 저장" disabled={saving}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Icon name="tray-arrow-down" size={20} color="#FFFFFF" />}
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: spacing.xl, gap: 12 },
  bleed: { marginHorizontal: -spacing.lg },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  muted: { fontSize: 12, color: colors.textSecondary },
  chipRow: { gap: 6, paddingHorizontal: spacing.lg, paddingBottom: 2 },
  chip: { height: 34, paddingHorizontal: 13, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  chipOn: { backgroundColor: '#E8F3FF', borderColor: '#7DBBFF' },
  chipDarkOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  cell: { width: SIDE, height: SIDE, backgroundColor: '#E9F1FA' },
  cellImg: { width: '100%', height: '100%' },
  stageTag: { position: 'absolute', left: 5, top: 5, height: 17, paddingHorizontal: 5, borderRadius: 4, justifyContent: 'center' },
  stageText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  none: { padding: 40, textAlign: 'center', color: colors.textSecondary, fontSize: 14 },
  moreBtn: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFB', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  moreText: { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
  viewer: { flex: 1, backgroundColor: '#0B1426' },
  viewerTop: { marginTop: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 8 },
  viewerStage: { height: 24, paddingHorizontal: 9, borderRadius: 6, justifyContent: 'center' },
  viewerStageText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  viewerBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 20 },
  viewerImg: { width: '100%', aspectRatio: 3 / 4, backgroundColor: '#0B1426' },
  viewerFoot: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 40, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)' },
  viewerName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  viewerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  saveBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
});
