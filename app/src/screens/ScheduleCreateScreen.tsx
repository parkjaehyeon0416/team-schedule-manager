// ═══════════════════════════════════════════════════════════════
// 📄 ScheduleCreateScreen.tsx (v10.2.1 — 등록/수정 겸용)
//   - route.params.scheduleId 있으면 수정 모드, 없으면 등록 모드
//   - 수정 모드: GET /api/schedules/{id} → 폼 채우기 → PUT 저장
//   - 등록 모드: 빈 폼 → POST 저장
//   ★ v11.1.2 — 하단 SafeArea + 키보드 회피 적용
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
  KeyboardAvoidingView, // ★ v11.1.2
  Keyboard, // ★ v11.1.2
} from 'react-native';
import { Text, TextInput, Button, Divider, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // ★ v11.1.2
import dayjs from 'dayjs';
import { useAuthStore } from '../store/authStore';

import {
  getTeamMembers,
  createSchedule,
  updateSchedule,
  getScheduleById,
} from '../api/schedulesApi';
import { getWageSettings } from '../api/wageSettingsApi';
import WorkTypePicker from '../components/WorkTypePicker';
import SitePickerModal from '../components/SitePickerModal';
import AppHeader from '../components/AppHeader';
import { formatMoney, parseMoney } from '../utils/format';
import type { TeamMember, WageSetting, WorkType, Site } from '../types/api';

// ─── 타입 ───
type WorkTypeEnum = '도배' | '타일' | '필름';

const WORK_TYPE_COLORS: Record<WorkTypeEnum, string> = {
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
  // ★ v10.2.1: 수정 모드 판단
  const editingScheduleId: number | undefined = route.params?.scheduleId;
  const isEditMode = !!editingScheduleId;

  // ★ v11.1.2 — 안전 영역 정보 (하단 제스처 바 회피용)
  const insets = useSafeAreaInsets();

  // 팀 소속 여부 — 팀이 있어야만 '개인/팀' 선택지가 의미가 있음(팀 없으면 항상 개인)
  const user = useAuthStore(s => s.user);
  const hasTeam = !!user?.team_id;

  // ─── 폼 상태 ───
  // ★ 팀에 있어도 개인용으로 등록하고 싶을 수 있음 — 기본은 팀(공유), 수정 모드에선
  // 로드된 일정의 team_id 유무로 결정
  const [isPersonal, setIsPersonal] = useState<boolean>(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [sitePickerVisible, setSitePickerVisible] = useState<boolean>(false);
  const [date, setDate] = useState<Date>(
    route.params?.date ? new Date(route.params.date) : new Date(),
  );
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [workType, setWorkType] = useState<WorkTypeEnum | null>(null);
  const [district, setDistrict] = useState<string>('');
  const [areaM2, setAreaM2] = useState<string>('');
  const [memo, setMemo] = useState<string>('');

  // v9.0/v10.2 신규 필드
  const [workTypeId, setWorkTypeId] = useState<number | null>(null);
  const [dailyWage, setDailyWage] = useState<number>(0);
  const [workUnits, setWorkUnits] = useState<number>(1.0);
  const [expenses, setExpenses] = useState<number>(0);
  const [expensesMemo, setExpensesMemo] = useState<string>('');

  // 단가 자동 채우기용
  const [wageSettings, setWageSettings] = useState<WageSetting[]>([]);

  // 팀원 관련
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(true);

  // 저장 / 로딩
  const [saving, setSaving] = useState<boolean>(false);
  const [loadingData, setLoadingData] = useState<boolean>(isEditMode);

  // ─────────────────────────────────────────────────────────────
  // [1] 마운트 시 — 초기 데이터 로드
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoadingMembers(true);
        const [membersData, wageData] = await Promise.all([
          getTeamMembers(),
          getWageSettings(),
        ]);
        setMembers(membersData);
        setWageSettings(wageData);

        // ★ v10.2.1: 수정 모드이면 일정 데이터 로드
        if (isEditMode && editingScheduleId) {
          await loadScheduleForEdit(editingScheduleId);
        }
      } catch (e: any) {
        console.error('초기 데이터 로드 실패:', e);
        Alert.alert(
          '조회 실패',
          e?.response?.data?.message || '데이터를 불러오지 못했습니다.',
        );
      } finally {
        setLoadingMembers(false);
        setLoadingData(false);
      }
    };
    fetchInitialData();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // ★ v10.2.1: 수정 모드 - 기존 일정 데이터로 폼 채우기
  // ─────────────────────────────────────────────────────────────
  const loadScheduleForEdit = async (id: number) => {
    try {
      const data = await getScheduleById(id);

      // 기본 필드 채우기
      setIsPersonal(!data.team_id);
      setSelectedSite(data.site ?? null);
      setDate(new Date(data.date));
      setWorkType((data.work_type as WorkTypeEnum) || null);
      setDistrict(data.district || '');
      setAreaM2(data.area_m2 ? String(data.area_m2) : '');
      setMemo(data.memo || '');

      // v9.0/v10.2 필드
      setWorkTypeId(data.work_type_id || null);
      setDailyWage(data.daily_wage ? parseFloat(data.daily_wage) : 0);
      setWorkUnits(data.work_units ? parseFloat(data.work_units) : 1.0);
      setExpenses(data.expenses ? parseFloat(data.expenses) : 0);
      setExpensesMemo(data.expenses_memo || '');

      // 투입 인원
      if (data.users && data.users.length > 0) {
        setSelectedUserIds(data.users.map(u => u.id));
      }
    } catch (e: any) {
      console.error('일정 로드 실패:', e);
      Alert.alert('조회 실패', '일정을 불러오지 못했습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    }
  };

  // ─── 공정 선택 시 단가 자동 채우기 ───
  const handleWorkTypeChange = (
    id: number | null,
    workTypeObj: WorkType | null,
  ) => {
    setWorkTypeId(id);

    if (id === null || !workTypeObj) return;

    const matched = wageSettings.find(s => s.work_type_id === id);
    if (matched) {
      setDailyWage(parseFloat(matched.default_wage));
      setWorkUnits(parseFloat(matched.default_work_units));
      console.log(
        `🎯 자동 채우기: ${workTypeObj.name} → 단가 ${matched.default_wage}, 공수 ${matched.default_work_units}`,
      );
    }
  };

  // ─── 날짜 변경 ───
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  // ─── 팀원 토글 ───
  const toggleMember = (userId: number) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId],
    );
  };

  // ─────────────────────────────────────────────────────────────
  // [2] 저장 — 등록/수정 분기
  // ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    // ★ v11.1.2 — 키보드가 올라와 있으면 먼저 닫기 (저장 후 화면 깨끗이)
    Keyboard.dismiss();

    if (!workType && !workTypeId) {
      Alert.alert('입력 오류', '공종 또는 공정을 선택해주세요.');
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
        site_id: selectedSite?.id ?? null,
        // v9.0 / v10.2
        work_type_id: workTypeId,
        daily_wage: dailyWage > 0 ? dailyWage : null,
        work_units: workUnits,
        expenses: expenses,
        expenses_memo: expensesMemo.trim() || null,
        // 팀이 없으면 항상 개인 취급되므로 굳이 안 보내도 되지만, 명시적으로 보냄
        is_personal: hasTeam ? isPersonal : true,
      };

      console.log('📤 요청:', JSON.stringify(payload, null, 2));

      // ★ v10.2.1: 모드별 분기
      if (isEditMode && editingScheduleId) {
        await updateSchedule(editingScheduleId, payload);
        Alert.alert('수정 완료', '일정이 수정되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      } else {
        await createSchedule(payload);
        Alert.alert('등록 완료', '일정이 등록되었습니다.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e: any) {
      console.error('❌ 저장 실패:', e?.response?.data || e);
      if (e?.response?.status === 422) {
        const errors = e?.response?.data?.errors || {};
        const firstError = Object.values(errors)[0] as string[] | undefined;
        Alert.alert('입력 오류', firstError?.[0] || '입력값을 확인해주세요.');
      } else if (e?.response?.status === 403) {
        Alert.alert('권한 없음', '권한이 없습니다. (팀장 이상)');
      } else {
        Alert.alert(
          isEditMode ? '수정 실패' : '등록 실패',
          e?.response?.data?.message || '저장에 실패했습니다.',
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // ─── 데이터 로딩 중 ───
  if (loadingData) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title={isEditMode ? '일정 수정' : '일정 등록'} />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2E75B6" />
          <Text style={styles.loadingText}>일정 정보 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title={isEditMode ? '일정 수정' : '일정 등록'} />
    {/* ★ v11.1.2 — KeyboardAvoidingView로 감싸서 키보드 올라올 때 화면 자동 조정
        안드로이드: padding 모드 — 키보드 높이만큼 화면 자체가 위로 올라감
        iOS:       그대로 */}
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        // ★ v11.1.2 — 키보드 떠 있을 때 외부 탭하면 키보드 닫힘
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 모드 표시 ── */}
        {isEditMode && (
          <View style={styles.modeBadge}>
            <Icon name="pencil" size={14} color="#FFF" />
            <Text style={styles.modeBadgeText}>수정 모드</Text>
          </View>
        )}

        {/* ── 0) 등록 범위 (팀 소속일 때만 노출) ── */}
        {hasTeam && (
          <>
            <View style={styles.labelRow}>
              <Icon name="account-multiple-outline" size={18} color="#2E75B6" />
              <Text style={styles.label}>등록 범위</Text>
            </View>
            <View style={styles.workTypeRow}>
              <TouchableOpacity
                onPress={() => setIsPersonal(false)}
                style={[
                  styles.workTypeBtn,
                  !isPersonal && { backgroundColor: '#1F3864', borderColor: '#1F3864' },
                ]}
                disabled={saving}
              >
                <Text style={[styles.workTypeText, !isPersonal && styles.workTypeTextActive]}>
                  👥 팀 (공유)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsPersonal(true)}
                style={[
                  styles.workTypeBtn,
                  isPersonal && { backgroundColor: '#1F3864', borderColor: '#1F3864' },
                ]}
                disabled={saving}
              >
                <Text style={[styles.workTypeText, isPersonal && styles.workTypeTextActive]}>
                  👤 개인
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              개인으로 등록하면 팀원들에게 공유되지 않고 나에게만 보여요.
            </Text>
            <Divider style={styles.divider} />
          </>
        )}

        {/* ── 현장 ── */}
        <View style={styles.labelRow}>
          <Icon name="home-city-outline" size={18} color="#2E75B6" />
          <Text style={styles.label}>현장</Text>
        </View>
        <TouchableOpacity
          onPress={() => setSitePickerVisible(true)}
          style={styles.dateButton}
          disabled={saving}
        >
          <Text
            style={[
              selectedSite ? styles.dateButtonText : styles.sitePlaceholder,
              styles.siteButtonTextFlex,
            ]}
            numberOfLines={1}
          >
            {selectedSite ? selectedSite.address : '현장 선택 (선택사항)'}
          </Text>
          <Icon name="magnify" size={20} color="#2E75B6" />
        </TouchableOpacity>

        <Divider style={styles.divider} />

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

        {/* ── 2) 공종 (기존 ENUM) ── */}
        <View style={styles.labelRow}>
          <Icon name="palette" size={18} color="#2E75B6" />
          <Text style={styles.label}>공종 (분류)</Text>
        </View>
        <View style={styles.workTypeRow}>
          {(['도배', '타일', '필름'] as WorkTypeEnum[]).map(type => (
            <TouchableOpacity
              key={type}
              onPress={() => setWorkType(workType === type ? null : type)}
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

        {/* ── 3) 공정 ── */}
        <View style={styles.labelRow}>
          <Icon name="briefcase" size={18} color="#2E75B6" />
          <Text style={styles.label}>공정 (상세)</Text>
        </View>
        <Text style={styles.hint}>
          공정 선택 시 등록된 단가가 자동 채워집니다
        </Text>
        <WorkTypePicker
          value={workTypeId}
          onChange={handleWorkTypeChange}
          disabled={saving}
          placeholder="공정 선택 (선택사항)"
        />

        <Divider style={styles.divider} />

        {/* ── 4) 단가 ── */}
        <View style={styles.labelRow}>
          <Icon name="currency-krw" size={18} color="#2E75B6" />
          <Text style={styles.label}>단가 (원)</Text>
        </View>
        <TextInput
          mode="outlined"
          textColor="#222222"
          outlineColor="#CCCCCC"
          activeOutlineColor="#1F3864"
          value={formatMoney(dailyWage)}
          onChangeText={text => setDailyWage(parseMoney(text))}
          placeholder="공정 선택 시 자동 입력"
          keyboardType="numeric"
          style={styles.input}
          disabled={saving}
        />

        {/* ── 5) 공수 ── */}
        <View style={styles.labelRow}>
          <Icon name="counter" size={18} color="#2E75B6" />
          <Text style={styles.label}>공수</Text>
        </View>
        <TextInput
          mode="outlined"
          textColor="#222222"
          outlineColor="#CCCCCC"
          activeOutlineColor="#1F3864"
          value={String(workUnits)}
          onChangeText={text => {
            const n = parseFloat(text);
            setWorkUnits(isNaN(n) ? 0 : n);
          }}
          placeholder="예: 1.0, 1.5"
          keyboardType="decimal-pad"
          style={styles.input}
          disabled={saving}
        />

        <Divider style={styles.divider} />

        {/* ── 6) 경비 ── */}
        <View style={styles.labelRow}>
          <Icon name="cash-multiple" size={18} color="#2E75B6" />
          <Text style={styles.label}>경비 (원)</Text>
        </View>
        <TextInput
          mode="outlined"
          textColor="#222222"
          outlineColor="#CCCCCC"
          activeOutlineColor="#1F3864"
          value={formatMoney(expenses)}
          onChangeText={text => setExpenses(parseMoney(text))}
          placeholder="교통비, 자재비 등"
          keyboardType="numeric"
          style={styles.input}
          disabled={saving}
        />

        {/* ── 7) 경비 메모 ── */}
        <View style={styles.labelRow}>
          <Icon name="receipt" size={18} color="#2E75B6" />
          <Text style={styles.label}>경비 메모 (선택)</Text>
        </View>
        <TextInput
          mode="outlined"
          textColor="#222222"
          outlineColor="#CCCCCC"
          activeOutlineColor="#1F3864"
          value={expensesMemo}
          onChangeText={setExpensesMemo}
          placeholder="예: 톨게이트, 주차비"
          multiline
          numberOfLines={2}
          maxLength={255}
          style={[styles.input, { minHeight: 60 }]}
          disabled={saving}
        />

        <Divider style={styles.divider} />

        {/* ── 8) 지역 ── */}
        <View style={styles.labelRow}>
          <Icon name="map-marker" size={18} color="#2E75B6" />
          <Text style={styles.label}>지역</Text>
        </View>
        <TextInput
          mode="outlined"
          textColor="#222222"
          outlineColor="#CCCCCC"
          activeOutlineColor="#1F3864"
          value={district}
          onChangeText={setDistrict}
          placeholder="예: 강남구"
          style={styles.input}
          disabled={saving}
        />

        <Divider style={styles.divider} />

        {/* ── 9) 평수 ── */}
        <View style={styles.labelRow}>
          <Icon name="ruler-square" size={18} color="#2E75B6" />
          <Text style={styles.label}>평수 (㎡)</Text>
        </View>
        <TextInput
          mode="outlined"
          textColor="#222222"
          outlineColor="#CCCCCC"
          activeOutlineColor="#1F3864"
          value={areaM2}
          onChangeText={setAreaM2}
          placeholder="예: 23.5"
          keyboardType="numeric"
          style={styles.input}
          disabled={saving}
        />

        <Divider style={styles.divider} />

        {/* ── 10) 메모 ── */}
        <View style={styles.labelRow}>
          <Icon name="note-text" size={18} color="#2E75B6" />
          <Text style={styles.label}>메모</Text>
        </View>
        <TextInput
          mode="outlined"
          textColor="#222222"
          outlineColor="#CCCCCC"
          activeOutlineColor="#1F3864"
          value={memo}
          onChangeText={setMemo}
          placeholder="특이사항이 있다면 입력해주세요"
          multiline
          numberOfLines={4}
          style={[styles.input, styles.memoInput]}
          disabled={saving}
        />

        <Divider style={styles.divider} />

        {/* ── 11) 투입 인원 ── */}
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

        {/* ── 저장/취소 ── */}
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
            icon={isEditMode ? 'content-save-edit' : 'content-save'}
            loading={saving}
            disabled={saving}
          >
            {saving ? '저장 중...' : isEditMode ? '수정 완료' : '저장'}
          </Button>
        </View>

        {/* ★ v11.1.2 — 폰 제스처 바와 겹치지 않도록 안전 여백 */}
        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>

    <SitePickerModal
      visible={sitePickerVisible}
      onClose={() => setSitePickerVisible(false)}
      onSelect={setSelectedSite}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  // ★ v11.1.2 — KeyboardAvoidingView가 화면 전체를 차지하도록
  flex: { flex: 1 },

  container: { flex: 1, padding: 16, backgroundColor: '#FAFAFA' },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAFAFA',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF9800',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  modeBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
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
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 4,
    marginBottom: 4,
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
  sitePlaceholder: { fontSize: 16, color: '#999', fontWeight: '500' },
  siteButtonTextFlex: { flex: 1, marginRight: 8 },
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
