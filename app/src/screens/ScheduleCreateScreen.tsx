// ═══════════════════════════════════════════════════════════════
// 📄 ScheduleCreateScreen.tsx (완성본)
//   - 아이콘 표시
//   - DatePicker 네이티브
//   - 팀원 Chip 다중 선택
//   - 실제 API 저장 + 화면 복귀
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text, TextInput, Button, Divider, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from '../api/axiosInstance';
import dayjs from 'dayjs';

// ─── 타입 정의 ───
type WorkType = '도배' | '타일' | '필름';

interface TeamMember {
  id: number;
  name: string;
  role_id: number;
}

const WORK_TYPE_COLORS: Record<WorkType, string> = {
  도배: '#2E75B6',
  타일: '#E67E22',
  필름: '#27AE60',
};

const ROLE_LABELS: Record<number, string> = {
  1: '관리자',
  2: '팀장',
  3: '팀원',
};

export default function ScheduleCreateScreen({ navigation, route }: any) {
  // ─── 폼 상태 ───
  const [date, setDate] = useState<Date>(
    route.params?.date ? new Date(route.params.date) : new Date(),
  );
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [workType, setWorkType] = useState<WorkType | null>(null);
  const [district, setDistrict] = useState<string>('');
  const [areaM2, setAreaM2] = useState<string>('');
  const [memo, setMemo] = useState<string>('');

  // ─── 팀원 관련 ───
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(true);

  // ─── 저장 중 상태 ───
  const [saving, setSaving] = useState<boolean>(false);

  // ─── 팀원 목록 가져오기 ───
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoadingMembers(true);
        const res = await axios.get('/team/members');
        setMembers(res.data?.data || []);
      } catch (e: any) {
        console.error('팀원 목록 조회 실패:', e);
        Alert.alert(
          '조회 실패',
          e?.response?.data?.message || '팀원 목록을 불러오지 못했습니다.',
        );
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, []);

  // ─── 날짜 변경 ───
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  // ─── 팀원 토글 ───
  const toggleMember = (userId: number) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId],
    );
  };

  // ─── 저장 버튼 ───
  const handleSave = async () => {
    if (!workType) {
      Alert.alert('입력 오류', '공종을 선택해주세요.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        date: dayjs(date).format('YYYY-MM-DD'),
        work_type: workType,
        district: district.trim() || null,
        area_m2: areaM2 ? parseFloat(areaM2) : null,
        memo: memo.trim() || null,
        user_ids: selectedUserIds,
      };

      console.log('📤 등록 요청:', JSON.stringify(payload, null, 2));

      const res = await axios.post('/schedules', payload);

      console.log('✅ 등록 성공:', res.data);

      Alert.alert('등록 완료', '일정이 등록되었습니다.', [
        {
          text: '확인',
          onPress: () => navigation.goBack(), // 이전 화면(캘린더)으로 돌아감
        },
      ]);
    } catch (e: any) {
      console.error('❌ 등록 실패:', e?.response?.data || e);

      if (e?.response?.status === 422) {
        const errors = e?.response?.data?.errors || {};
        const firstError = Object.values(errors)[0] as string[] | undefined;
        Alert.alert('입력 오류', firstError?.[0] || '입력값을 확인해주세요.');
      } else if (e?.response?.status === 403) {
        Alert.alert('권한 없음', '일정 등록 권한이 없습니다. (팀장 이상)');
      } else {
        Alert.alert(
          '등록 실패',
          e?.response?.data?.message || '일정 등록에 실패했습니다.',
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* ── 1) 날짜 ── */}
      <View style={styles.labelRow}>
        <Icon name="calendar" size={18} color="#2E75B6" />
        <Text style={styles.label}>날짜 *</Text>
      </View>
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={styles.dateButton}
        disabled={saving}
      >
        <Text style={styles.dateButtonText}>
          {dayjs(date).format('YYYY년 MM월 DD일 (ddd)')}
        </Text>
        <Icon name="calendar-edit" size={20} color="#2E75B6" />
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleDateChange}
          locale="ko-KR"
        />
      )}

      <Divider style={styles.divider} />

      {/* ── 2) 공종 ── */}
      <View style={styles.labelRow}>
        <Icon name="palette" size={18} color="#2E75B6" />
        <Text style={styles.label}>공종 *</Text>
      </View>
      <View style={styles.workTypeRow}>
        {(['도배', '타일', '필름'] as WorkType[]).map(type => (
          <TouchableOpacity
            key={type}
            onPress={() => setWorkType(type)}
            style={[
              styles.workTypeBtn,
              workType === type && {
                backgroundColor: WORK_TYPE_COLORS[type],
                borderColor: WORK_TYPE_COLORS[type],
              },
            ]}
            disabled={saving}
          >
            <Text
              style={[
                styles.workTypeText,
                workType === type && styles.workTypeTextActive,
              ]}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Divider style={styles.divider} />

      {/* ── 3) 지역 ── */}
      <View style={styles.labelRow}>
        <Icon name="map-marker" size={18} color="#2E75B6" />
        <Text style={styles.label}>지역</Text>
      </View>
      <TextInput
        mode="outlined"
        value={district}
        onChangeText={setDistrict}
        placeholder="예: 강남구"
        style={styles.input}
        disabled={saving}
      />

      <Divider style={styles.divider} />

      {/* ── 4) 평수 ── */}
      <View style={styles.labelRow}>
        <Icon name="ruler-square" size={18} color="#2E75B6" />
        <Text style={styles.label}>평수 (㎡)</Text>
      </View>
      <TextInput
        mode="outlined"
        value={areaM2}
        onChangeText={setAreaM2}
        placeholder="예: 23.5"
        keyboardType="numeric"
        style={styles.input}
        disabled={saving}
      />

      <Divider style={styles.divider} />

      {/* ── 5) 메모 ── */}
      <View style={styles.labelRow}>
        <Icon name="note-text" size={18} color="#2E75B6" />
        <Text style={styles.label}>메모</Text>
      </View>
      <TextInput
        mode="outlined"
        value={memo}
        onChangeText={setMemo}
        placeholder="특이사항이 있다면 입력해주세요"
        multiline
        numberOfLines={4}
        style={[styles.input, styles.memoInput]}
        disabled={saving}
      />

      <Divider style={styles.divider} />

      {/* ── 6) 투입 인원 ── */}
      <View style={styles.labelRow}>
        <Icon name="account-group" size={18} color="#2E75B6" />
        <Text style={styles.label}>
          투입 인원
          {selectedUserIds.length > 0 && (
            <Text style={styles.selectedCount}>
              {' '}
              ({selectedUserIds.length}명 선택)
            </Text>
          )}
        </Text>
      </View>

      {loadingMembers ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#2E75B6" />
          <Text style={styles.loadingText}>팀원 목록을 불러오는 중...</Text>
        </View>
      ) : members.length === 0 ? (
        <Text style={styles.hint}>등록된 팀원이 없습니다.</Text>
      ) : (
        <View style={styles.chipContainer}>
          {members.map(member => {
            const isSelected = selectedUserIds.includes(member.id);
            return (
              <Chip
                key={member.id}
                mode={isSelected ? 'flat' : 'outlined'}
                selected={isSelected}
                onPress={() => !saving && toggleMember(member.id)}
                icon={isSelected ? 'check' : 'account'}
                style={[styles.chip, isSelected && styles.chipSelected]}
                textStyle={isSelected ? styles.chipTextSelected : undefined}
              >
                {member.name}
                <Text style={styles.roleText}>
                  {' '}
                  · {ROLE_LABELS[member.role_id] || '사용자'}
                </Text>
              </Chip>
            );
          })}
        </View>
      )}

      <Divider style={styles.divider} />

      {/* ── 저장/취소 버튼 ── */}
      <View style={styles.btnRow}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.btn}
          icon="close"
          disabled={saving}
        >
          취소
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.btn}
          icon="content-save"
          loading={saving}
          disabled={saving}
        >
          {saving ? '저장 중...' : '저장'}
        </Button>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#FAFAFA' },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: 12,
  },
  label: { fontSize: 15, fontWeight: '600', color: '#333' },
  selectedCount: { fontSize: 13, fontWeight: '500', color: '#2E75B6' },
  hint: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  input: { backgroundColor: '#FFF' },
  memoInput: { minHeight: 80 },
  divider: { marginVertical: 16 },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateButtonText: { fontSize: 16, color: '#333', fontWeight: '500' },
  workTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  workTypeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CCC',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  workTypeText: { fontSize: 15, fontWeight: '600', color: '#666' },
  workTypeTextActive: { color: '#FFF' },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: { fontSize: 13, color: '#888' },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  chip: { backgroundColor: '#FFF' },
  chipSelected: {
    backgroundColor: '#E8F2FC',
    borderColor: '#2E75B6',
  },
  chipTextSelected: { color: '#2E75B6', fontWeight: '600' },
  roleText: { fontSize: 11, color: '#999' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1 },
});
