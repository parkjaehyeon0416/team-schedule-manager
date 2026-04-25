// ═══════════════════════════════════════════════════════════════
// 📄 ScheduleDetailScreen.tsx (v10.2.1)
//   - v9.0 필드 표시 (공정, 단가, 공수, 경비, 경비 메모)
//   - 수정 버튼 → ScheduleCreateScreen에 scheduleId param 전달
//   - 삭제 버튼 → DELETE /api/schedules/{id}
//   - 사진 업로드 (기존)
//   - 화면 포커스 시 자동 새로고침 (useFocusEffect)
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Text,
  Chip,
  Button,
  Divider,
  Avatar,
  IconButton,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import axios from '../api/axiosInstance';
import { getScheduleById, deleteSchedule } from '../api/schedulesApi';
import type { Schedule } from '../types/api';
import { formatMoney } from '../utils/format';

const ROLE_LABELS: Record<number, string> = {
  1: '관리자',
  2: '팀장',
  3: '팀원',
};

export default function ScheduleDetailScreen({ route }: any) {
  const { id } = route.params;
  const navigation = useNavigation<any>();

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<boolean>(false);

  // ─────────────────────────────────────────────────────────────
  // 화면 포커스 시 자동 새로고침
  //   - 수정 화면 다녀온 후 자동으로 최신 데이터 표시
  // ─────────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      fetchDetail();
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

  // ─── 사진 업로드 ───
  const handlePhotoUpload = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });
    if (!result.assets?.[0]) return;

    const formData = new FormData();
    formData.append('photo', {
      uri: result.assets[0].uri,
      name: result.assets[0].fileName,
      type: result.assets[0].type,
    } as any);

    try {
      await axios.post(`/schedules/${id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('완료', '사진이 업로드되었습니다.');
      fetchDetail();
    } catch (e: any) {
      console.error('사진 업로드 실패:', e);
      Alert.alert(
        '업로드 실패',
        e?.response?.data?.message || '다시 시도해주세요.',
      );
    }
  };

  // ─── ★ 수정 버튼 ───
  const handleEdit = () => {
    // ScheduleCreate를 수정 모드로 진입 (scheduleId param 전달)
    navigation.navigate('ScheduleCreate', { scheduleId: id });
  };

  // ─── ★ 삭제 버튼 ───
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
                {
                  text: '확인',
                  onPress: () => navigation.goBack(),
                },
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

  // ─── 예상 수입 계산 (단가 × 공수) ───
  const expectedIncome =
    schedule.daily_wage && schedule.work_units
      ? parseFloat(schedule.daily_wage) * parseFloat(schedule.work_units)
      : 0;

  return (
    <ScrollView style={styles.container}>
      {/* ── 헤더 (날짜 + 공종 Chip) ── */}
      <View style={styles.header}>
        <Text style={styles.date}>{schedule.date}</Text>
        {schedule.work_type && (
          <Chip style={styles.workTypeChip}>{schedule.work_type}</Chip>
        )}
      </View>

      {/* ── 공정 (v10.2.1 추가) ── */}
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

      {/* ── ★ v10.2.1: 공수/단가/수입 정보 카드 ── */}
      {(schedule.daily_wage || schedule.work_units !== '0.0') && (
        <View style={styles.wageCard}>
          <View style={styles.wageHeader}>
            <Icon name="cash-multiple" size={18} color="#2E75B6" />
            <Text style={styles.wageTitle}>공수/단가 정보</Text>
          </View>

          <View style={styles.wageGrid}>
            {/* 단가 */}
            <View style={styles.wageItem}>
              <Text style={styles.wageLabel}>단가</Text>
              <Text style={styles.wageValue}>
                {schedule.daily_wage
                  ? `${formatMoney(schedule.daily_wage)}원`
                  : '-'}
              </Text>
            </View>
            {/* 공수 */}
            <View style={styles.wageItem}>
              <Text style={styles.wageLabel}>공수</Text>
              <Text style={styles.wageValue}>
                {parseFloat(schedule.work_units).toFixed(1)}공수
              </Text>
            </View>
          </View>

          {/* 예상 수입 (강조) */}
          {expectedIncome > 0 && (
            <View style={styles.expectedBox}>
              <Text style={styles.expectedLabel}>예상 수입</Text>
              <Text style={styles.expectedValue}>
                {formatMoney(expectedIncome)}원
              </Text>
            </View>
          )}

          {/* 경비 */}
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

      {/* ── 사진 ── */}
      <View style={styles.photoHeader}>
        <Text style={styles.section}>
          현장 사진 ({(schedule as any).photos?.length || 0}장)
        </Text>
        <Button mode="outlined" compact onPress={handlePhotoUpload} icon="plus">
          추가
        </Button>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {(schedule as any).photos?.map((p: any) => (
          <Image
            key={p.id}
            source={{ uri: `http://10.0.2.2:8000/storage/${p.file_path}` }}
            style={styles.photo}
          />
        ))}
      </ScrollView>

      {/* ── 메모 ── */}
      {schedule.memo && (
        <>
          <Divider style={styles.divider} />
          <Text style={styles.section}>메모</Text>
          <Text style={styles.memo}>{schedule.memo}</Text>
        </>
      )}

      <Divider style={styles.divider} />

      {/* ── ★ v10.2.1: 수정/삭제 버튼 ── */}
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
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photo: { width: 120, height: 120, borderRadius: 8, marginRight: 8 },
  memo: { fontSize: 14, color: '#555', lineHeight: 22 },

  // ★ v10.2.1: 공수/단가 카드
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
  wageGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
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

  // ★ v10.2.1: 액션 버튼
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: { flex: 1 },
  deleteBtn: {},
});
