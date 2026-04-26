// ═══════════════════════════════════════════════════════════════
// 📄 ScheduleDetailScreen.tsx
//   v10.2.1: v9.0 필드 표시 + 수정/삭제
//   ★ v11: 사진 섹션을 카테고리 기반으로 교체
//          (PhotoCategoryTabs + PhotoGrid + 비교 버튼)
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

import {
  getScheduleById,
  deleteSchedule,
  // ★ v11
  getSchedulePhotos,
  uploadSchedulePhoto,
  deleteSchedulePhoto,
} from '../api/schedulesApi';
import type { Schedule, PhotoCategory, PhotoListResponse } from '../types/api';
import { formatMoney } from '../utils/format';
import PhotoCategoryTabs from '../components/PhotoCategoryTabs';
import PhotoGrid from '../components/PhotoGrid';

const ROLE_LABELS: Record<number, string> = {
  1: '관리자',
  2: '팀장',
  3: '팀원',
};

// ★ v11 — 카테고리별 라벨 / 빈 상태 문구 매핑
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

// ★ v11 — 사진 빈 응답의 초기값 (state 기본값)
const EMPTY_PHOTOS: PhotoListResponse = {
  before: [],
  during: [],
  after: [],
  other: [],
  counts: { before: 0, during: 0, after: 0, other: 0 },
};

export default function ScheduleDetailScreen({ route }: any) {
  const { id } = route.params;
  const navigation = useNavigation<any>();

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<boolean>(false);

  // ★ v11 — 사진 state
  const [photos, setPhotos] = useState<PhotoListResponse>(EMPTY_PHOTOS);
  const [currentCategory, setCurrentCategory] =
    useState<PhotoCategory>('before');

  // ─────────────────────────────────────────────────────────────
  // 화면 포커스 시 자동 새로고침
  // ─────────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      fetchDetail();
      fetchPhotos(); // ★ v11
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

  // ★ v11 — 사진 목록 조회
  const fetchPhotos = async () => {
    try {
      const data = await getSchedulePhotos(id);
      setPhotos(data);
    } catch (e: any) {
      console.error('사진 조회 실패:', e);
      // 사진 조회 실패는 화면 전체를 막지 않음 — 콘솔에만 기록
    }
  };

  // ★ v11 — 사진 업로드 (현재 활성 탭의 카테고리로 자동 분류)
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

    try {
      await uploadSchedulePhoto(
        id,
        {
          uri: asset.uri,
          name: asset.fileName,
          type: asset.type,
        },
        currentCategory, // 현재 선택된 탭의 카테고리로 업로드
      );
      Alert.alert(
        '업로드 완료',
        `[${CATEGORY_LABELS[currentCategory]}] 카테고리에 사진이 추가되었습니다.`,
      );
      fetchPhotos(); // 목록 갱신
    } catch (e: any) {
      console.error('사진 업로드 실패:', e);
      Alert.alert(
        '업로드 실패',
        e?.response?.data?.message || '다시 시도해주세요.',
      );
    }
  };

  // ★ v11 — 사진 삭제 (PhotoGrid의 onDelete 콜백)
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

  // ★ v11 — 비교 보기 화면 이동 (시공 전·후 사진 모두 있을 때만 노출)
  const handleComparePress = () => {
    navigation.navigate('PhotoCompare', {
      scheduleId: id,
      siteName: schedule?.site
        ? `${schedule.site.apt_name} ${schedule.site.dong} ${schedule.site.ho}`
        : '현장',
    });
  };

  // ─── 수정 버튼 ───
  const handleEdit = () => {
    navigation.navigate('ScheduleCreate', { scheduleId: id });
  };

  // ─── 삭제 버튼 ───
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

  // ─── 로딩 ───
  if (loading || !schedule) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#1F3864" />
        <Text style={styles.loadingText}>불러오는 중...</Text>
      </View>
    );
  }

  // ─── 평수 계산 ───
  const pyeong = schedule.area_m2
    ? (parseFloat(schedule.area_m2) / 3.3).toFixed(1)
    : null;

  // ─── 예상 수입 계산 ───
  const expectedIncome =
    schedule.daily_wage && schedule.work_units
      ? parseFloat(schedule.daily_wage) * parseFloat(schedule.work_units)
      : 0;

  // ★ v11 — 비교 버튼 노출 조건: 전·후 사진 둘 다 1장 이상
  const canCompare = photos.counts.before > 0 && photos.counts.after > 0;

  // ★ v11 — 전체 사진 수 (헤더 표시용)
  const totalPhotos =
    photos.counts.before +
    photos.counts.during +
    photos.counts.after +
    photos.counts.other;

  return (
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
            <Text style={styles.expensesMemo}>"{schedule.expenses_memo}"</Text>
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

      {/* ── ★ v11: 사진 섹션 (카테고리 + 그리드) ── */}
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
              비교
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

      {/* 부모 padding 16을 상쇄해서 탭/그리드를 화면 가로 전체에 펼침 */}
      <View style={styles.photoSectionWrapper}>
        <PhotoCategoryTabs
          current={currentCategory}
          counts={photos.counts}
          onChange={setCurrentCategory}
        />
        <PhotoGrid
          photos={photos[currentCategory]}
          onDelete={handlePhotoDelete}
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

      <View style={{ height: 40 }} />
    </ScrollView>
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

  // ★ v11: 사진 섹션
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
  // 부모 container의 padding: 16 을 상쇄해서 탭이 화면 가로 끝까지 닿게
  photoSectionWrapper: {
    marginHorizontal: -16,
    marginBottom: 8,
  },

  memo: { fontSize: 14, color: '#555', lineHeight: 22 },

  // 공수/단가 카드
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

  // 액션 버튼
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { flex: 1 },
  deleteBtn: {},
});
