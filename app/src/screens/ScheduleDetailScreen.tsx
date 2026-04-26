// ═══════════════════════════════════════════════════════════════
// 📄 ScheduleDetailScreen.tsx
//   v10.2.1: v9.0 필드 표시 + 수정/삭제
//   ★ v11    — 사진 섹션을 카테고리 기반으로 교체
//   ★ v11.1  — 시공 후 업로드 시 페어 선택 모달 추가
//   ★ v11.1.1 (옵션 B) — 짝 없는 시공 후 사진 안내 + 카드 배지
//   ★ v11.1.1 (옵션 C) — 사후 짝 지정 흐름 (PhotoGrid 길게 누름 → 짝 지정)
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, Chip, Button, Divider, Avatar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // ★ v11.1.2

import {
  getScheduleById,
  deleteSchedule,
  getSchedulePhotos,
  uploadSchedulePhoto,
  deleteSchedulePhoto,
  updateSchedulePhotoPair, // ★ v11.1.1 (옵션 C)
} from '../api/schedulesApi';
import type {
  Schedule,
  PhotoCategory,
  PhotoListResponse,
  SiteFile, // ★ v11.1.1 (옵션 C) — handlePairAssign 시그니처용
} from '../types/api';
import { formatMoney } from '../utils/format';
import PhotoCategoryTabs from '../components/PhotoCategoryTabs';
import PhotoGrid from '../components/PhotoGrid';
import PhotoPairPicker from '../components/PhotoPairPicker';

const ROLE_LABELS: Record<number, string> = {
  1: '관리자',
  2: '팀장',
  3: '팀원',
};

const CATEGORY_LABELS: Record<PhotoCategory, string> = {
  before: '시공 전',
  during: '시공 중',
  after: '시공 후',
  other: '기타',
};
const CATEGORY_EMPTY_TEXT: Record<PhotoCategory, string> = {
  before: '시공 전 사진을 추가해 보세요',
  during: '시공 중 사진을 추가해 보세요',
  after: '시공 후 사진을 추가해 보세요',
  other: '기타 사진을 추가해 보세요',
};

const EMPTY_PHOTOS: PhotoListResponse = {
  before: [],
  during: [],
  after: [],
  other: [],
  counts: { before: 0, during: 0, after: 0, other: 0 },
};

// ★ v11.1 — 갤러리에서 고른 사진을 잠시 보관할 형태
//   (페어 모달이 닫히고 결과가 올 때까지 들고 있어야 함)
interface PendingPhoto {
  uri: string;
  name: string;
  type: string;
}

export default function ScheduleDetailScreen({ route }: any) {
  const { id } = route.params;
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets(); // ★ v11.1.2 — 안전 영역 정보

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<boolean>(false);

  const [photos, setPhotos] = useState<PhotoListResponse>(EMPTY_PHOTOS);
  const [currentCategory, setCurrentCategory] =
    useState<PhotoCategory>('before');

  // ★ v11.1 — 페어 선택 모달 관련 state
  const [pairPickerVisible, setPairPickerVisible] = useState<boolean>(false);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);

  // ★ v11.1.1 (옵션 C) — 페어 모달이 "사후 짝 지정" 모드인지 구분
  //   null    = 신규 업로드 흐름 (PendingPhoto와 함께 사용)
  //   number  = 사후 짝 지정 흐름 (이 photoId의 paired_with_id를 업데이트)
  const [reassignPhotoId, setReassignPhotoId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
      fetchPhotos();
    }, [id]),
  );

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const data = await getScheduleById(id);
      setSchedule(data);
    } catch (e: any) {
      console.error('일정 조회 실패:', e);
      Alert.alert(
        '조회 실패',
        e?.response?.data?.message || '일정 정보를 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async () => {
    try {
      const data = await getSchedulePhotos(id);
      setPhotos(data);
    } catch (e: any) {
      console.error('사진 조회 실패:', e);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // ★ v11.1 — 사진 업로드 흐름 (시공 후일 때 페어 모달 거침)
  // ─────────────────────────────────────────────────────────────
  const handlePhotoUpload = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });
    if (!result.assets?.[0]) return;

    const asset = result.assets[0];
    if (!asset.uri || !asset.fileName || !asset.type) {
      Alert.alert('오류', '사진 정보를 읽을 수 없습니다.');
      return;
    }

    const photo: PendingPhoto = {
      uri: asset.uri,
      name: asset.fileName,
      type: asset.type,
    };

    // ★ v11.1 분기 — 시공 후 사진이면 페어 선택 모달 띄우기
    if (currentCategory === 'after') {
      setPendingPhoto(photo);
      setPairPickerVisible(true);
      return; // 업로드는 모달 결과를 받은 후 진행
    }

    // 시공 전/중/기타는 즉시 업로드
    await doUpload(photo, undefined);
  };

  // ─────────────────────────────────────────────────────────────
  // ★ v11.1 — 실제 업로드 수행
  // ─────────────────────────────────────────────────────────────
  const doUpload = async (photo: PendingPhoto, pairedWithId?: number) => {
    try {
      await uploadSchedulePhoto(
        id,
        photo,
        currentCategory,
        undefined,
        pairedWithId,
      );
      Alert.alert(
        '업로드 완료',
        `[${
          CATEGORY_LABELS[currentCategory]
        }] 카테고리에 사진이 추가되었습니다.${
          pairedWithId ? '\n시공 전 사진과 짝지어졌어요.' : ''
        }`,
      );
      fetchPhotos();
    } catch (e: any) {
      console.error('사진 업로드 실패:', e);
      Alert.alert(
        '업로드 실패',
        e?.response?.data?.message || '다시 시도해주세요.',
      );
    }
  };

  // ─────────────────────────────────────────────────────────────
  // ★ v11.1.1 (옵션 C) — 사후 짝 지정 시작 (PhotoGrid 길게 누름 → 메뉴 → 콜백)
  //   PhotoGrid가 짝 없는 시공 후 사진의 onPairAssign 호출 시 진입
  // ─────────────────────────────────────────────────────────────
  const handlePairAssign = (photo: SiteFile) => {
    setReassignPhotoId(photo.id);
    setPairPickerVisible(true);
  };

  // ─────────────────────────────────────────────────────────────
  // ★ v11.1.1 — 페어 모달 결과 핸들러 (신규 업로드 / 사후 지정 둘 다 처리)
  // ─────────────────────────────────────────────────────────────
  const handlePairSelect = async (pairedWithId: number | null) => {
    setPairPickerVisible(false);

    // ── 분기 1) ★ 사후 짝 지정 모드 (옵션 C) ──
    if (reassignPhotoId !== null) {
      const photoId = reassignPhotoId;
      setReassignPhotoId(null); // 즉시 초기화 (중복 처리 방지)

      try {
        await updateSchedulePhotoPair(id, photoId, pairedWithId);
        Alert.alert(
          '완료',
          pairedWithId ? '짝이 지정되었습니다.' : '짝이 해제되었습니다.',
        );
        fetchPhotos();
      } catch (e: any) {
        console.error('짝 지정 실패:', e);
        Alert.alert(
          '짝 지정 실패',
          e?.response?.data?.message || '다시 시도해주세요.',
        );
      }
      return;
    }

    // ── 분기 2) 신규 업로드 모드 (기존 v11.1 흐름) ──
    if (!pendingPhoto) return;
    const photo = pendingPhoto;
    setPendingPhoto(null);
    await doUpload(photo, pairedWithId ?? undefined);
  };

  // ★ v11.1.1 보강 — 취소 시 두 모드 state 모두 정리
  const handlePairCancel = () => {
    setPairPickerVisible(false);
    setPendingPhoto(null);
    setReassignPhotoId(null);
  };

  // ─────────────────────────────────────────────────────────────
  // 사진 삭제
  // ─────────────────────────────────────────────────────────────
  const handlePhotoDelete = async (photoId: number) => {
    try {
      await deleteSchedulePhoto(id, photoId);
      fetchPhotos();
    } catch (e: any) {
      console.error('사진 삭제 실패:', e);
      Alert.alert(
        '삭제 실패',
        e?.response?.data?.message || '다시 시도해주세요.',
      );
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 비교 화면 이동
  // ─────────────────────────────────────────────────────────────
  const handleComparePress = () => {
    navigation.navigate('PhotoCompare', {
      scheduleId: id,
      siteName: schedule?.site
        ? `${schedule.site.apt_name} ${schedule.site.dong} ${schedule.site.ho}`
        : '현장',
    });
  };

  const handleEdit = () => {
    navigation.navigate('ScheduleCreate', { scheduleId: id });
  };

  const handleDelete = () => {
    Alert.alert(
      '일정 삭제',
      `${schedule?.date} 일정을 삭제하시겠습니까?\n삭제된 일정은 복구할 수 있지만, 사용자에게는 보이지 않습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteSchedule(id);
              Alert.alert('완료', '일정이 삭제되었습니다.', [
                { text: '확인', onPress: () => navigation.goBack() },
              ]);
            } catch (e: any) {
              console.error('일정 삭제 실패:', e);
              Alert.alert(
                '삭제 실패',
                e?.response?.data?.message ||
                  '권한이 없거나 오류가 발생했습니다.',
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (loading || !schedule) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#1F3864" />
        <Text style={styles.loadingText}>불러오는 중...</Text>
      </View>
    );
  }

  const pyeong = schedule.area_m2
    ? (parseFloat(schedule.area_m2) / 3.3).toFixed(1)
    : null;

  const expectedIncome =
    schedule.daily_wage && schedule.work_units
      ? parseFloat(schedule.daily_wage) * parseFloat(schedule.work_units)
      : 0;

  // ★ v11.1 — 비교 가능 조건: 페어가 1개 이상
  const pairedAfterCount = photos.after.filter(p => p.paired_with_id).length;
  const canCompare = pairedAfterCount > 0;

  // ★ v11.1.1 (옵션 B) — 짝 없는 시공 후 사진 개수 (안내 문구용)
  const unpairedAfterCount = photos.after.filter(
    p => p.paired_with_id == null,
  ).length;

  // ★ v11.1 — 이미 짝지어진 시공 전 사진 id 목록
  //   주의: 사후 짝 지정 모드(reassignPhotoId set)일 때는
  //         "내가 가리키는 paired_with_id"는 제외해야 자기 자신을 다시 선택할 수 있음
  //         (현재는 불가하지만 미래 UX 개선 시 활용)
  const alreadyPairedBeforeIds = photos.after
    .filter(p => p.paired_with_id != null)
    .map(p => p.paired_with_id as number);

  const totalPhotos =
    photos.counts.before +
    photos.counts.during +
    photos.counts.after +
    photos.counts.other;

  return (
    <>
      <ScrollView style={styles.container}>
        {/* ── 헤더 ── */}
        <View style={styles.header}>
          <Text style={styles.date}>{schedule.date}</Text>
          {schedule.work_type && (
            <Chip style={styles.workTypeChip}>{schedule.work_type}</Chip>
          )}
        </View>

        {/* ── 공정 ── */}
        {schedule.work_type_relation && (
          <View style={styles.row}>
            <View
              style={[
                styles.dot,
                { backgroundColor: schedule.work_type_relation.color },
              ]}
            />
            <Text style={styles.workTypeText}>
              {schedule.work_type_relation.name}
            </Text>
          </View>
        )}

        {/* ── 지역 / 평수 ── */}
        {schedule.district && (
          <View style={styles.row}>
            <Icon name="map-marker" size={16} color="#666" />
            <Text style={styles.infoText}>{schedule.district}</Text>
          </View>
        )}
        {pyeong && (
          <View style={styles.row}>
            <Icon name="ruler-square" size={16} color="#666" />
            <Text style={styles.infoText}>
              {pyeong}평 ({schedule.area_m2}㎡)
            </Text>
          </View>
        )}

        <Divider style={styles.divider} />

        {/* ── 공수/단가/수입 카드 ── */}
        {(schedule.daily_wage || schedule.work_units !== '0.0') && (
          <View style={styles.wageCard}>
            <View style={styles.wageHeader}>
              <Icon name="cash-multiple" size={18} color="#2E75B6" />
              <Text style={styles.wageTitle}>공수/단가 정보</Text>
            </View>

            <View style={styles.wageGrid}>
              <View style={styles.wageItem}>
                <Text style={styles.wageLabel}>단가</Text>
                <Text style={styles.wageValue}>
                  {schedule.daily_wage
                    ? `${formatMoney(schedule.daily_wage)}원`
                    : '-'}
                </Text>
              </View>
              <View style={styles.wageItem}>
                <Text style={styles.wageLabel}>공수</Text>
                <Text style={styles.wageValue}>
                  {parseFloat(schedule.work_units).toFixed(1)}공수
                </Text>
              </View>
            </View>

            {expectedIncome > 0 && (
              <View style={styles.expectedBox}>
                <Text style={styles.expectedLabel}>예상 수입</Text>
                <Text style={styles.expectedValue}>
                  {formatMoney(expectedIncome)}원
                </Text>
              </View>
            )}

            {schedule.expenses && parseFloat(schedule.expenses) > 0 && (
              <View style={styles.expenseRow}>
                <View style={styles.row}>
                  <Icon name="receipt" size={14} color="#888" />
                  <Text style={styles.expenseLabel}>경비</Text>
                </View>
                <Text style={styles.expenseValue}>
                  {formatMoney(schedule.expenses)}원
                </Text>
              </View>
            )}
            {schedule.expenses_memo && (
              <Text style={styles.expensesMemo}>
                "{schedule.expenses_memo}"
              </Text>
            )}
          </View>
        )}

        {schedule.daily_wage && <Divider style={styles.divider} />}

        {/* ── 투입 인원 ── */}
        <Text style={styles.section}>
          투입 인원 ({schedule.users?.length || 0}명)
        </Text>
        {schedule.users?.map((u: any) => (
          <View key={u.id} style={styles.member}>
            <Avatar.Text size={32} label={u.name?.[0] || '?'} />
            <Text style={styles.memberName}>{u.name}</Text>
            {u.role_id && (
              <Text style={styles.roleText}>
                · {ROLE_LABELS[u.role_id] || '사용자'}
              </Text>
            )}
          </View>
        ))}

        <Divider style={styles.divider} />

        {/* ── 사진 섹션 ── */}
        <View style={styles.photoHeader}>
          <Text style={styles.section}>현장 사진 ({totalPhotos}장)</Text>
          <View style={styles.photoActions}>
            {canCompare && (
              <Button
                mode="outlined"
                compact
                icon="compare-horizontal"
                onPress={handleComparePress}
              >
                비교 ({pairedAfterCount})
              </Button>
            )}
            <Button
              mode="outlined"
              compact
              onPress={handlePhotoUpload}
              icon="plus"
            >
              추가
            </Button>
          </View>
        </View>

        {/* ★ v11.1.1 (옵션 B) — 미매칭 시공 후 사진 안내 */}
        {unpairedAfterCount > 0 && (
          <View style={styles.unpairedNotice}>
            <Icon name="information-outline" size={14} color="#D32F2F" />
            <Text style={styles.unpairedNoticeText}>
              짝 없는 시공 후 사진 {unpairedAfterCount}장은 비교 화면에 표시되지
              않아요. 사진을 길게 눌러 짝을 지정할 수 있어요.
            </Text>
          </View>
        )}

        <View style={styles.photoSectionWrapper}>
          <PhotoCategoryTabs
            current={currentCategory}
            counts={photos.counts}
            onChange={setCurrentCategory}
          />
          <PhotoGrid
            photos={photos[currentCategory]}
            onDelete={handlePhotoDelete}
            onPairAssign={handlePairAssign} // ★ v11.1.1 (옵션 C)
            emptyText={CATEGORY_EMPTY_TEXT[currentCategory]}
          />
        </View>

        {/* ── 메모 ── */}
        {schedule.memo && (
          <>
            <Divider style={styles.divider} />
            <Text style={styles.section}>메모</Text>
            <Text style={styles.memo}>{schedule.memo}</Text>
          </>
        )}

        <Divider style={styles.divider} />

        {/* ── 수정/삭제 버튼 ── */}
        <View style={styles.actionRow}>
          <Button
            mode="outlined"
            icon="pencil"
            onPress={handleEdit}
            style={styles.actionBtn}
            disabled={deleting}
          >
            수정
          </Button>
          <Button
            mode="contained"
            icon="delete"
            onPress={handleDelete}
            style={[styles.actionBtn, styles.deleteBtn]}
            buttonColor="#D32F2F"
            loading={deleting}
            disabled={deleting}
          >
            삭제
          </Button>
        </View>

        {/* ★ v11.1.2 — 변경 */}
        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>

      {/* ★ v11.1 — 페어 선택 모달 (ScrollView 밖에 배치) */}
      <PhotoPairPicker
        visible={pairPickerVisible}
        beforePhotos={photos.before}
        alreadyPairedIds={alreadyPairedBeforeIds}
        onSelect={handlePairSelect}
        onCancel={handlePairCancel}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
  },
  loadingText: { color: '#888', fontSize: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  date: { fontSize: 20, fontWeight: 'bold', color: '#1F3864' },
  workTypeChip: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  workTypeText: { fontSize: 16, fontWeight: '600', color: '#333' },
  infoText: { fontSize: 14, color: '#555' },
  divider: { marginVertical: 14 },
  section: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F3864',
    marginBottom: 10,
  },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  memberName: { fontSize: 15, color: '#333', fontWeight: '500' },
  roleText: { fontSize: 12, color: '#999' },

  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  photoSectionWrapper: {
    marginHorizontal: -16,
    marginBottom: 8,
  },

  memo: { fontSize: 14, color: '#555', lineHeight: 22 },

  wageCard: {
    backgroundColor: '#F5F8FB',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E8F0',
  },
  wageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  wageTitle: { fontSize: 14, fontWeight: '600', color: '#2E75B6' },
  wageGrid: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  wageItem: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 6,
  },
  wageLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  wageValue: { fontSize: 16, fontWeight: '600', color: '#222' },
  expectedBox: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expectedLabel: { fontSize: 13, color: '#1976D2', fontWeight: '500' },
  expectedValue: { fontSize: 17, color: '#1976D2', fontWeight: 'bold' },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  expenseLabel: { fontSize: 13, color: '#666' },
  expenseValue: { fontSize: 15, color: '#D32F2F', fontWeight: '600' },
  expensesMemo: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 4,
  },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { flex: 1 },
  deleteBtn: {},

  // ★ v11.1.1 (옵션 B) — 미매칭 안내 문구
  unpairedNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start', // 두 줄 텍스트도 상단 정렬되게
    gap: 6,
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 2,
  },
  unpairedNoticeText: {
    fontSize: 12,
    color: '#D32F2F',
    flex: 1,
    lineHeight: 18, // 한국어 두 줄 시 가독성
  },
});
