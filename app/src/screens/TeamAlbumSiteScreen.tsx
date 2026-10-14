/**
 * 현장별 앨범 — DESIGN-CANVAS 기준, TEAM_ALBUM_SITE.dc.html (★ v18.48)
 * 단계(전체/시공 전/중/후/기타) · 올린 사람 필터, 3열 사진 격자(60장씩 더 불러오기), 크게 보기(올린 사람·날짜·저장).
 * 오른쪽 위 카메라: 이 현장을 수정할 수 있는 사람(팀장·부팀장·개인 현장 주인)만 사진 올리기.
 * ★ v18.66 — 갤러리에서 여러 장(최대 10장)을 골라 같은 단계로 한꺼번에 올림. 단계 고르기는 안드로이드 Alert가
 *   버튼을 3개까지만 보여줘서(기타·취소가 안 보였음) 아래에서 올라오는 선택 창으로 바꿈.
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
import { pickImages, toPhotoFile } from '../utils/pickImage';
import type { PhotoFile } from '../utils/pickImage';
import { uploadSequentially, showUploadSummary } from '../utils/uploadPhotos';
import { Avatar } from '../components/TeamUi';
import { useLightStatusBarWhile } from '../components/FocusStatusBar';
import { STAGE_LABEL, STAGE_BG } from './TeamAlbumScreen';
import { colors, spacing } from '../theme/designTokens';

const STAGES: (PhotoStage | null)[] = [null, 'before', 'during', 'after', 'other'];
const UPLOAD_STAGES: PhotoStage[] = ['before', 'during', 'after', 'other'];
// ★ v18.66 — 갤러리에서 한 번에 고를 수 있는 사진 수
const PHOTOS_PER_PICK = 10;
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
  // ★ v18.68 — 크게 보기(어두운 남색 화면)가 떠 있는 동안만 밝은 상태바 아이콘
  const lightStatusBar = useLightStatusBarWhile(!!view);
  const [saving, setSaving] = useState(false);
  const shotRef = useRef<any>(null);
  // ★ v18.66 — 단계 고르기를 기다리는 사진들, 올리는 중 진행 상황(2/5), 중복 실행 방지
  const [pendingFiles, setPendingFiles] = useState<PhotoFile[] | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const busyRef = useRef(false);

  const load = useCallback(async (p = 1) => {
    const r = await getTeamAlbumPhotos(teamId, { site_id: siteId, category: stage ?? undefined, uploader: uploader ?? undefined, page: p });
    setPage(r);
    setItems(prev => (p === 1 ? r.items : [...prev, ...r.items]));
  }, [teamId, siteId, stage, uploader]);

  // ★ v18.66 — 올리는 도중 필터를 바꿔도 끝난 뒤엔 "지금" 필터로 새로고침하도록 최신 load를 들고 있음
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);

  useEffect(() => { load(1).catch(() => setPage(null)); }, [load]);

  const more = async () => {
    if (!page || loadingMore) return;
    setLoadingMore(true);
    try { await load(page.page + 1); } finally { setLoadingMore(false); }
  };

  // ★ v18.66 — ① 사진 여러 장 고르기 → ② 단계 선택 창 → ③ 한 장씩 차례로 올리고 끝나면 한 번만 새로고침
  const upload = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const assets = await pickImages(PHOTOS_PER_PICK);
      const files = assets.map(a => toPhotoFile(a)).filter((f): f is PhotoFile => f !== null);
      if (files.length > 0) setPendingFiles(files);
    } finally {
      busyRef.current = false;
    }
  };

  const uploadAs = async (c: PhotoStage) => {
    const files = pendingFiles;
    setPendingFiles(null);
    if (!files || files.length === 0 || busyRef.current) return;
    busyRef.current = true;
    setUploadProgress({ current: 0, total: files.length });
    try {
      const result = await uploadSequentially(
        files,
        f => uploadSitePhoto(siteId, f, c),
        (current, total) => setUploadProgress({ current, total }),
      );
      if (result.done > 0) loadRef.current(1).catch(() => {});
      showUploadSummary(result);
    } finally {
      setUploadProgress(null);
      busyRef.current = false;
    }
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
      await CameraRoll.save(uri, { type: 'photo', album: '현장메이트' });
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
          <Pressable onPress={upload} style={styles.headerBtn} accessibilityLabel="사진 올리기" disabled={!!uploadProgress}>
            {uploadProgress ? <ActivityIndicator color={colors.primaryDark} /> : <Icon name="camera-outline" size={22} color={colors.textPrimary} />}
          </Pressable>
        ) : undefined}
      />
      {/* ★ v18.66 — 여러 장 올리는 중 진행 표시 */}
      {!!uploadProgress && (
        <View style={styles.uploadBanner}>
          <ActivityIndicator size="small" color={colors.primaryDark} />
          <Text style={styles.uploadBannerText}>사진 올리는 중 {uploadProgress.current}/{uploadProgress.total}</Text>
        </View>
      )}
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
              <Pressable key={p.id} onPress={() => { lightStatusBar(); setView(p); }} style={styles.cell}
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

      {/* ★ v18.66 — 올릴 사진의 단계 고르기(고른 사진 전부 같은 단계로) */}
      <Modal visible={!!pendingFiles} animationType="slide" transparent onRequestClose={() => setPendingFiles(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPendingFiles(null)} accessibilityLabel="닫기" />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>어떤 사진인가요?</Text>
          {!!pendingFiles && pendingFiles.length > 1 && (
            <Text style={styles.sheetSub}>고른 사진 {pendingFiles.length}장을 모두 같은 단계로 올려요.</Text>
          )}
          {UPLOAD_STAGES.map(c => (
            <Pressable key={c} style={styles.sheetRow} onPress={() => uploadAs(c)}>
              <View style={[styles.sheetDot, { backgroundColor: STAGE_BG[c] }]} />
              <Text style={styles.sheetRowText}>{STAGE_LABEL[c]}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.sheetCancel} onPress={() => setPendingFiles(null)}>
            <Text style={styles.sheetCancelText}>취소</Text>
          </Pressable>
        </View>
      </Modal>

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
  // ★ v18.66 — 올리는 중 표시 · 단계 선택 창
  uploadBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: spacing.lg, marginBottom: 8, paddingHorizontal: 12, height: 36, borderRadius: 10, backgroundColor: '#E8F3FF' },
  uploadBannerText: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(16,42,86,0.4)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 28 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  sheetSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  sheetDot: { width: 10, height: 10, borderRadius: 5 },
  sheetRowText: { fontSize: 15, color: colors.textPrimary },
  sheetCancel: { marginTop: 12, height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  sheetCancelText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
});
