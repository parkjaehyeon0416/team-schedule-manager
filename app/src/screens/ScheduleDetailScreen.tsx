// ═══════════════════════════════════════════════════════════════
// 📄 ScheduleDetailScreen.tsx — DESIGN-CANVAS 기준, SCHEDULE_DETAIL.dc.html
//   ★ 디자인은 사진을 2칸짜리 단순 그리드로 보여주지만, 기존에 이미 구현돼 있던
//     카테고리별(시공전/중/후/기타) 사진 관리 + 짝 지정 + 비교 화면 기능은 디자인보다
//     훨씬 많은 실제 기능이라 그대로 유지하고 외곽 스타일만 디자인에 맞춤.
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import { launchImageLibrary } from 'react-native-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';

import {
  getScheduleById,
  deleteSchedule,
  getSchedulePhotos,
  uploadSchedulePhoto,
  deleteSchedulePhoto,
  updateSchedulePhotoPair,
} from '../api/schedulesApi';
import { getMyTeams } from '../api/teamApi';
import type { Schedule, PhotoCategory, PhotoListResponse, SiteFile, Team } from '../types/api';
import { formatMoney } from '../utils/format';
import PhotoCategoryTabs from '../components/PhotoCategoryTabs';
import PhotoGrid from '../components/PhotoGrid';
import PhotoPairPicker from '../components/PhotoPairPicker';
import AppHeader from '../components/AppHeader';
import { scheduleAddress, scheduleLocationLabel } from '../utils/scheduleLocation';
import { colors, radius, spacing } from '../theme/designTokens';

const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];
const AVATAR_BG = ['#FFE3C2', '#D6ECFF', '#D9F6F1', '#ECE5FF', '#FFE0E0'];
const AVATAR_FG = ['#B95E00', '#0A6CE0', '#0B8574', '#6B4FD8', '#C03A3E'];
const REMINDER_TIME_LABEL: Record<string, string> = {
  day_before_20: '하루 전 오후 8시',
  day_before_09: '당일 오전 9시',
  hour_before_1: '시작 1시간 전',
  none: '알림 없음',
};

const CATEGORY_EMPTY_TEXT: Record<PhotoCategory, string> = {
  before: '시공 전 사진을 추가해 보세요',
  during: '시공 중 사진을 추가해 보세요',
  after: '시공 후 사진을 추가해 보세요',
  other: '기타 사진을 추가해 보세요',
};

const EMPTY_PHOTOS: PhotoListResponse = {
  before: [], during: [], after: [], other: [],
  counts: { before: 0, during: 0, after: 0, other: 0 },
};

interface PendingPhoto { uri: string; name: string; type: string }

export default function ScheduleDetailScreen({ route }: any) {
  const { id } = route.params;
  const navigation = useNavigation<any>();

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [photos, setPhotos] = useState<PhotoListResponse>(EMPTY_PHOTOS);
  const [currentCategory, setCurrentCategory] = useState<PhotoCategory>('before');

  const [pairPickerVisible, setPairPickerVisible] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [reassignPhotoId, setReassignPhotoId] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    fetchDetail();
    fetchPhotos();
  }, [id]));

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const data = await getScheduleById(id);
      setSchedule(data);
      if (data.team_id) {
        const teams = await getMyTeams().catch(() => []);
        setTeam(teams.find(t => t.id === data.team_id) ?? null);
      } else {
        setTeam(null);
      }
    } catch (e: any) {
      Alert.alert('조회 실패', e?.response?.data?.message || '일정 정보를 불러오지 못했습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async () => {
    try {
      setPhotos(await getSchedulePhotos(id));
    } catch {}
  };

  const handlePhotoUpload = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, maxWidth: 1600, maxHeight: 1600 });
    if (!result.assets?.[0]) return;
    const asset = result.assets[0];
    if (!asset.uri || !asset.fileName || !asset.type) {
      Alert.alert('오류', '사진 정보를 읽을 수 없습니다.');
      return;
    }
    const photo: PendingPhoto = { uri: asset.uri, name: asset.fileName, type: asset.type };
    if (currentCategory === 'after') {
      setPendingPhoto(photo);
      setPairPickerVisible(true);
      return;
    }
    await doUpload(photo, undefined);
  };

  const doUpload = async (photo: PendingPhoto, pairedWithId?: number) => {
    try {
      await uploadSchedulePhoto(id, photo, currentCategory, undefined, pairedWithId);
      fetchPhotos();
    } catch (e: any) {
      Alert.alert('업로드 실패', e?.response?.data?.message || '다시 시도해주세요.');
    }
  };

  const handlePairAssign = (photo: SiteFile) => {
    setReassignPhotoId(photo.id);
    setPairPickerVisible(true);
  };

  const handlePairSelect = async (pairedWithId: number | null) => {
    setPairPickerVisible(false);
    if (reassignPhotoId !== null) {
      const photoId = reassignPhotoId;
      setReassignPhotoId(null);
      try {
        await updateSchedulePhotoPair(id, photoId, pairedWithId);
        fetchPhotos();
      } catch (e: any) {
        Alert.alert('짝 지정 실패', e?.response?.data?.message || '다시 시도해주세요.');
      }
      return;
    }
    if (!pendingPhoto) return;
    const photo = pendingPhoto;
    setPendingPhoto(null);
    await doUpload(photo, pairedWithId ?? undefined);
  };

  const handlePairCancel = () => {
    setPairPickerVisible(false);
    setPendingPhoto(null);
    setReassignPhotoId(null);
  };

  const handlePhotoDelete = async (photoId: number) => {
    try {
      await deleteSchedulePhoto(id, photoId);
      fetchPhotos();
    } catch (e: any) {
      Alert.alert('삭제 실패', e?.response?.data?.message || '다시 시도해주세요.');
    }
  };

  const handleComparePress = () => {
    navigation.navigate('PhotoCompare', {
      scheduleId: id,
      siteName: (schedule && scheduleLocationLabel(schedule)) || '현장',
    });
  };

  const handleCopyAddress = () => {
    if (!schedule) return;
    const addr = scheduleAddress(schedule);
    if (!addr) return;
    Clipboard.setString([addr, schedule.address_detail].filter(Boolean).join(' '));
    Alert.alert('복사 완료', '주소가 복사되었습니다.');
  };

  const handleDelete = () => {
    setMenuOpen(false);
    Alert.alert('일정 삭제', '이 일정을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteSchedule(id);
            navigation.navigate('MainTabs', { screen: 'Schedule' });
          } catch (e: any) {
            Alert.alert('삭제 실패', e?.response?.data?.message || '권한이 없거나 오류가 발생했습니다.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading || !schedule) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="일정 상세" />
        <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  const pairedAfterCount = photos.after.filter(p => p.paired_with_id).length;
  const canCompare = pairedAfterCount > 0;
  const unpairedAfterCount = photos.after.filter(p => p.paired_with_id == null).length;
  const alreadyPairedBeforeIds = photos.after.filter(p => p.paired_with_id != null).map(p => p.paired_with_id as number);
  const totalPhotos = photos.counts.before + photos.counts.during + photos.counts.after + photos.counts.other;

  const titleText = schedule.title || schedule.work_type_relation?.name || schedule.memo || '일정';
  const siteLabel = scheduleLocationLabel(schedule);
  const fullAddress = scheduleAddress(schedule);
  const timeLabel = schedule.start_time && schedule.end_time
    ? `${schedule.start_time.slice(0, 5)} - ${schedule.end_time.slice(0, 5)} (${dayjs(`2000-01-01T${schedule.end_time}`).diff(dayjs(`2000-01-01T${schedule.start_time}`), 'hour', true)}시간)`
    : null;

  return (
    <View style={styles.screen}>
      <AppHeader
        leftType="back"
        title="일정 상세"
        rightContent={
          <Pressable onPress={() => setMenuOpen(v => !v)} style={styles.headerRightBtn}>
            <Icon name="dots-horizontal" size={22} color={colors.textPrimary} />
          </Pressable>
        }
      />
      {menuOpen && (
        <View style={styles.menuBox}>
          <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); navigation.navigate('ScheduleReports', { scheduleId: id }); }}>
            <Text style={styles.menuItemText}>자동 보고서 관리</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={handleDelete}>
            <Text style={[styles.menuItemText, { color: colors.danger }]}>삭제</Text>
          </Pressable>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={[styles.badge, { backgroundColor: schedule.team_id ? '#FFF2E2' : '#E8F3FF' }]}>
            <Text style={[styles.badgeText, { color: schedule.team_id ? '#B95E00' : colors.primaryDark }]}>{schedule.team_id ? '팀 일정' : '개인 일정'}</Text>
          </View>
          <Text style={styles.title}>{titleText}</Text>
          <View style={styles.infoRow}>
            <Icon name="calendar-month-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.infoText}>{dayjs(schedule.date).format('YYYY년 M월 D일')} ({WEEKDAY_LABEL[dayjs(schedule.date).day()]})</Text>
          </View>
          {!!timeLabel && (
            <View style={styles.infoRow}>
              <Icon name="clock-outline" size={18} color={colors.primaryDark} />
              <Text style={styles.infoText}>{timeLabel}</Text>
            </View>
          )}
          {!!siteLabel && (
            <Pressable style={styles.infoRow} onPress={handleCopyAddress}>
              <Icon name="map-marker-outline" size={18} color={colors.primaryDark} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoText}>{siteLabel}</Text>
                {!!fullAddress && fullAddress !== siteLabel && <Text style={styles.addressSub}>{fullAddress}</Text>}
              </View>
              {!!fullAddress && <Icon name="content-copy" size={14} color={colors.muted} />}
            </Pressable>
          )}
          {!!team && (
            <>
              <Pressable style={styles.infoRow} onPress={() => navigation.navigate('TeamDetail', { teamId: team.id })}>
                <Icon name="account-group-outline" size={18} color={colors.primaryDark} />
                <Text style={[styles.infoText, { fontWeight: '700' }]}>{team.name}{schedule.users?.length ? ` (${schedule.users.length}명)` : ''}</Text>
              </Pressable>
              {!!schedule.users?.length && (
                <View style={styles.avatarRow}>
                  {schedule.users.map((u, i) => (
                    <View key={u.id} style={[styles.avatar, { backgroundColor: AVATAR_BG[i % AVATAR_BG.length], marginLeft: i === 0 ? 0 : -8 }]}>
                      <Text style={[styles.avatarText, { color: AVATAR_FG[i % AVATAR_FG.length] }]}>{u.name.charAt(0)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>작업 정보</Text>
          <View style={styles.row}><Text style={styles.rowLabel}>공정</Text><Text style={styles.rowValue}>{schedule.work_type_relation?.name ?? schedule.work_type ?? '-'}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>공수</Text><Text style={styles.rowValue}>{parseFloat(schedule.work_units).toFixed(1)}공수</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>단가</Text><Text style={styles.rowValue}>{schedule.daily_wage ? `${formatMoney(schedule.daily_wage)}원` : '-'}</Text></View>
          {Number(schedule.expenses) > 0 && (
            <View style={styles.row}><Text style={styles.rowLabel}>경비</Text><Text style={styles.rowValue}>{formatMoney(schedule.expenses)}원{schedule.expenses_memo ? ` (${schedule.expenses_memo})` : ''}</Text></View>
          )}
          {!!siteLabel && (schedule.site_id ? (
            <Pressable style={styles.row} onPress={() => navigation.navigate('SiteDetail', { siteId: schedule.site_id })}>
              <Text style={styles.rowLabel}>현장</Text>
              <Text style={[styles.rowValue, styles.rowLink]}>{siteLabel} ›</Text>
            </Pressable>
          ) : (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>현장</Text>
              <Text style={styles.rowValue}>{siteLabel}</Text>
            </View>
          ))}
          <View style={[styles.row, { borderBottomWidth: 0 }]}><Text style={styles.rowLabel}>알림</Text><Text style={styles.rowValue}>{REMINDER_TIME_LABEL[schedule.reminder_time ?? ''] ?? '하루 전 오후 8시'}</Text></View>
        </View>

        {!!schedule.memo && (
          <View style={styles.memoCard}>
            <Text style={styles.memoTitle}>메모</Text>
            <Text style={styles.memoText}>{schedule.memo}</Text>
          </View>
        )}

        <View style={styles.photoHeaderRow}>
          <Text style={styles.sectionTitle}>현장 사진 ({totalPhotos}장)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {canCompare && (
              <Pressable style={styles.photoActionBtn} onPress={handleComparePress}>
                <Icon name="compare-horizontal" size={14} color={colors.primaryDark} />
                <Text style={styles.photoActionBtnText}>비교</Text>
              </Pressable>
            )}
            <Pressable style={styles.photoActionBtn} onPress={handlePhotoUpload}>
              <Icon name="plus" size={14} color={colors.primaryDark} />
              <Text style={styles.photoActionBtnText}>추가</Text>
            </Pressable>
          </View>
        </View>

        {unpairedAfterCount > 0 && (
          <View style={styles.unpairedNotice}>
            <Icon name="information-outline" size={14} color={colors.danger} />
            <Text style={styles.unpairedNoticeText}>짝 없는 시공 후 사진 {unpairedAfterCount}장은 비교 화면에 표시되지 않아요. 사진을 길게 눌러 짝을 지정할 수 있어요.</Text>
          </View>
        )}

        <View style={styles.photoCard}>
          <PhotoCategoryTabs current={currentCategory} counts={photos.counts} onChange={setCurrentCategory} />
          <PhotoGrid
            photos={photos[currentCategory]}
            onDelete={handlePhotoDelete}
            onPairAssign={handlePairAssign}
            emptyText={CATEGORY_EMPTY_TEXT[currentCategory]}
          />
        </View>

        <View style={styles.footerRow}>
          <Pressable style={styles.editBtn} onPress={() => navigation.navigate('ScheduleCreate', { scheduleId: id })}>
            <Text style={styles.editBtnText}>수정</Text>
          </Pressable>
          <Pressable style={styles.deleteBtn} onPress={handleDelete} disabled={deleting}>
            {deleting ? <ActivityIndicator color={colors.danger} /> : <Text style={styles.deleteBtnText}>삭제</Text>}
          </Pressable>
        </View>
      </ScrollView>

      <PhotoPairPicker
        visible={pairPickerVisible}
        beforePhotos={photos.before}
        alreadyPairedIds={alreadyPairedBeforeIds}
        onSelect={handlePairSelect}
        onCancel={handlePairCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },

  headerRightBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  menuBox: { position: 'absolute', top: 54, right: 14, zIndex: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderCard, paddingVertical: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  menuItem: { paddingVertical: 12, paddingHorizontal: 18 },
  menuItemText: { fontSize: 14, color: colors.textPrimary },

  headerCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 18, gap: 10 },
  badge: { alignSelf: 'flex-start', height: 24, paddingHorizontal: 9, borderRadius: 7, justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 21, fontWeight: '800', color: colors.textPrimary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  addressSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  avatarRow: { flexDirection: 'row', paddingLeft: 28 },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '700' },

  infoCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 16, gap: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  rowLabel: { width: 60, fontSize: 13, color: colors.textSecondary },
  rowValue: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  rowLink: { fontWeight: '700', color: colors.primaryDark },

  memoCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 16, gap: 6 },
  memoTitle: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  memoText: { fontSize: 14, color: colors.textPrimary, lineHeight: 21 },

  photoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photoActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: '#BFDBFB' },
  photoActionBtnText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  unpairedNotice: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  unpairedNoticeText: { flex: 1, fontSize: 12, color: colors.danger, lineHeight: 17 },
  photoCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 12, gap: 8 },

  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  editBtn: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: '#BFDBFB', alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  deleteBtn: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.dangerBorder, backgroundColor: colors.dangerBg, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: colors.danger },
});
