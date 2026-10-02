/**
 * 일정 등록/수정 화면 — DESIGN-CANVAS 기준, SCHEDULE_CREATE.dc.html / SCHEDULE_EDIT.dc.html
 * ★ 디자인엔 없지만 이미 있던 기능(경비·경비메모·지역·평수·투입 인원)은 "추가 정보" 섹션으로
 *   유지함 — 세무자료(경비 합계) 등 다른 화면이 이 값들에 의존하고 있어서 생략하면 안 됨.
 * ★ "알림"은 알림 설정의 기본값을 일정별로 재지정할 수 있게 함 — 백엔드에 개념이 없어서
 *   schedules.reminder_time 컬럼을 신규로 추가함(title/start_time/end_time과 함께).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, ActivityIndicator, Platform, FlatList, Modal, Keyboard } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useAuthStore } from '../store/authStore';
import {
  getTeamMembers,
  createSchedule,
  updateSchedule,
  getScheduleById,
} from '../api/schedulesApi';
import { getSites } from '../api/siteApi';
import { getMyTeams } from '../api/teamApi';
import { getWageSettings } from '../api/wageSettingsApi';
import WorkTypePicker from '../components/WorkTypePicker';
import SitePickerModal from '../components/SitePickerModal';
import AddressSearchModal from '../components/AddressSearchModal';
import AppHeader from '../components/AppHeader';
import { formatMoney, parseMoney } from '../utils/format';
import type { TeamMember, WageSetting, WorkType, Site, Team } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';

const REMINDER_TIME_LABEL: Record<string, string> = {
  day_before_20: '하루 전 오후 8시',
  day_before_09: '당일 오전 9시',
  hour_before_1: '시작 1시간 전',
  none: '알림 없음',
};
const REMINDER_TIME_OPTIONS = Object.keys(REMINDER_TIME_LABEL);
const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];

export default function ScheduleCreateScreen({ navigation: navProp, route }: any) {
  const navigation = useNavigation<any>() ?? navProp;
  const editingScheduleId: number | undefined = route.params?.scheduleId;
  const isEditMode = !!editingScheduleId;

  const user = useAuthStore(s => s.user);
  const [teams, setTeams] = useState<Team[] | null>(null);
  // 로그인 시점 user.team_id는 팀 탈퇴/해체 후 갱신 안 될 수 있어, 실제 소속 팀 목록이 오면 그걸로 판단
  const hasTeam = teams ? teams.length > 0 : !!user?.team_id;

  const [isPersonal, setIsPersonal] = useState<boolean>(!user?.team_id);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [teamPickerVisible, setTeamPickerVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [sitePickerVisible, setSitePickerVisible] = useState(false);
  // ★ v18.34 — 일회성 현장은 현장 등록 없이 주소만 적음 (현장 선택 시 address는 비움)
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [addressSearchVisible, setAddressSearchVisible] = useState(false);
  const [date, setDate] = useState<Date>(route.params?.date ? new Date(route.params.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end' | null>(null);
  const [workTypeId, setWorkTypeId] = useState<number | null>(null);
  const [dailyWage, setDailyWage] = useState(0);
  const [workUnits, setWorkUnits] = useState(1.0);
  const [memo, setMemo] = useState('');
  const [reminderTime, setReminderTime] = useState('day_before_20');
  const [reminderPickerVisible, setReminderPickerVisible] = useState(false);

  // 추가 정보(디자인엔 없지만 기존 기능 유지)
  const [district, setDistrict] = useState('');
  const [areaM2, setAreaM2] = useState('');
  const [expenses, setExpenses] = useState(0);
  const [expensesMemo, setExpensesMemo] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [extraOpen, setExtraOpen] = useState(false);
  // ★ DESIGN-CANVAS(TAX_MONTH_DETAIL/INCOME_DETAIL) 추가
  const [employmentType, setEmploymentType] = useState<'daily' | 'freelance'>('daily');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');

  const [wageSettings, setWageSettings] = useState<WageSetting[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);

  useEffect(() => {
    const init = async () => {
      try {
        const [membersData, wageData, teamList] = await Promise.all([
          getTeamMembers(),
          getWageSettings(),
          getMyTeams().catch(() => []),
        ]);
        setMembers(membersData);
        setWageSettings(wageData);
        setTeams(teamList);
        const activeTeam = teamList.find(t => t.is_active) ?? teamList[0];
        if (activeTeam) setTeamId(activeTeam.id);
        else setIsPersonal(true); // 소속 팀이 없는 프리랜서는 항상 개인 일정

        if (isEditMode && editingScheduleId) {
          const data = await getScheduleById(editingScheduleId);
          setIsPersonal(!data.team_id);
          if (data.team_id) setTeamId(data.team_id);
          setTitle(data.title ?? '');
          setSelectedSite(data.site ?? null);
          setAddress(data.address ?? '');
          setAddressDetail(data.address_detail ?? '');
          setDate(new Date(data.date));
          setStartTime(data.start_time?.slice(0, 5) ?? '09:00');
          setEndTime(data.end_time?.slice(0, 5) ?? '17:00');
          setWorkTypeId(data.work_type_id ?? null);
          setDailyWage(data.daily_wage ? parseFloat(data.daily_wage) : 0);
          setWorkUnits(data.work_units ? parseFloat(data.work_units) : 1.0);
          setMemo(data.memo ?? '');
          setReminderTime(data.reminder_time ?? 'day_before_20');
          setDistrict(data.district ?? '');
          setAreaM2(data.area_m2 ? String(data.area_m2) : '');
          setExpenses(data.expenses ? parseFloat(data.expenses) : 0);
          setExpensesMemo(data.expenses_memo ?? '');
          setEmploymentType(data.employment_type ?? 'daily');
          setPaymentStatus(data.payment_status ?? 'pending');
          if (data.users?.length) setSelectedUserIds(data.users.map(u => u.id));
        } else if (route.params?.siteId) {
          const sites = await getSites();
          const preselected = sites.find(s => s.id === route.params.siteId);
          if (preselected) setSelectedSite(preselected);
        }
      } catch (e: any) {
        Alert.alert('조회 실패', e?.response?.data?.message || '데이터를 불러오지 못했습니다.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setLoadingData(false);
      }
    };
    init();
  }, []);

  const handleWorkTypeChange = (id: number | null, workTypeObj: WorkType | null) => {
    setWorkTypeId(id);
    if (id === null || !workTypeObj) return;
    const matched = wageSettings.find(s => s.work_type_id === id);
    if (matched) {
      setDailyWage(parseFloat(matched.default_wage));
      setWorkUnits(parseFloat(matched.default_work_units));
    }
  };

  const toggleMember = (userId: number) => {
    setSelectedUserIds(prev => (prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]));
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!workTypeId) {
      Alert.alert('입력 오류', '공정을 선택해주세요.');
      return;
    }
    if (hasTeam && !isPersonal && !teamId) {
      Alert.alert('입력 오류', '팀 일정은 팀을 선택해야 합니다.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: dayjs(date).format('YYYY-MM-DD'),
        title: title.trim() || null,
        start_time: startTime || null,
        end_time: endTime || null,
        district: district.trim() || null,
        area_m2: areaM2 ? parseFloat(areaM2) : null,
        memo: memo.trim() || null,
        reminder_time: reminderTime,
        user_ids: selectedUserIds,
        site_id: selectedSite?.id ?? null,
        address: selectedSite ? null : address.trim() || null,
        address_detail: addressDetail.trim() || null,
        work_type_id: workTypeId,
        daily_wage: dailyWage > 0 ? dailyWage : null,
        work_units: workUnits,
        expenses,
        expenses_memo: expensesMemo.trim() || null,
        employment_type: employmentType,
        payment_status: paymentStatus,
        is_personal: hasTeam ? isPersonal : true,
        team_id: hasTeam && !isPersonal ? teamId : null,
      };

      if (isEditMode && editingScheduleId) {
        await updateSchedule(editingScheduleId, payload);
        // 수정 화면은 상세 위에 열려 있으므로 닫기만 하면 상세로 돌아감(상세는 포커스 시 재조회).
        //   navigate로 상세를 다시 쌓으면 뒤로가기 시 상세↔수정이 무한 반복됨.
        Alert.alert('수정 완료', '일정이 수정되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
      } else {
        const created = await createSchedule(payload);
        // 등록 화면을 상세로 교체 — 상세에서 뒤로가기 시 등록 화면이 아니라 진입 전 화면(홈/일정)으로 감
        Alert.alert('등록 완료', '일정이 등록되었습니다.', [{ text: '확인', onPress: () => navigation.replace('ScheduleDetail', { id: created.id }) }]);
      }
    } catch (e: any) {
      if (e?.response?.status === 422) {
        const errors = e?.response?.data?.errors || {};
        const firstError = Object.values(errors)[0] as string[] | undefined;
        Alert.alert('입력 오류', firstError?.[0] || e?.response?.data?.message || '입력값을 확인해주세요.');
      } else {
        Alert.alert(isEditMode ? '수정 실패' : '등록 실패', e?.response?.data?.message || '저장에 실패했습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title={isEditMode ? '일정 수정' : '일정 등록'} />
        <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  const selectedTeam = teams?.find(t => t.id === teamId);

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title={isEditMode ? '일정 수정' : '일정 등록'} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {hasTeam && (
          <View style={styles.field}>
            <Text style={styles.label}>일정 구분</Text>
            <View style={styles.tabRow}>
              <Pressable style={[styles.tabBtn, isPersonal && styles.tabBtnOn]} onPress={() => setIsPersonal(true)}>
                <Text style={[styles.tabText, isPersonal && styles.tabTextOn]}>개인 일정</Text>
              </Pressable>
              <Pressable style={[styles.tabBtn, !isPersonal && styles.tabBtnOn]} onPress={() => setIsPersonal(false)}>
                <Text style={[styles.tabText, !isPersonal && styles.tabTextOn]}>팀 일정</Text>
              </Pressable>
            </View>
          </View>
        )}

        {hasTeam && !isPersonal && (
          <View style={styles.field}>
            <Text style={styles.label}>팀 선택 (필수)</Text>
            <Pressable style={styles.inputWrap} onPress={() => setTeamPickerVisible(true)}>
              <View style={styles.inputRow}>
                <Text style={styles.inputText}>{selectedTeam?.name ?? '팀을 선택하세요'}</Text>
                <Icon name="chevron-down" size={18} color={colors.muted} />
              </View>
            </Pressable>
            {!!selectedTeam && <Text style={styles.hint}>팀원들에게 일정이 공유됩니다.</Text>}
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>제목</Text>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="일정을 입력하세요" placeholderTextColor={colors.muted} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>현장</Text>
          <Pressable style={styles.inputWrap} onPress={() => setSitePickerVisible(true)}>
            <View style={styles.inputRow}>
              <Text style={selectedSite ? styles.inputText : styles.inputPlaceholder} numberOfLines={1}>
                {selectedSite ? (selectedSite.apt_name || selectedSite.address) : '등록된 현장 선택 (선택)'}
              </Text>
              {selectedSite ? (
                <Pressable onPress={() => setSelectedSite(null)} hitSlop={8}>
                  <Icon name="close-circle" size={18} color={colors.muted} />
                </Pressable>
              ) : (
                <Icon name="chevron-down" size={18} color={colors.muted} />
              )}
            </View>
          </Pressable>
          {!selectedSite && (
            <>
              <Pressable style={styles.inputWrap} onPress={() => setAddressSearchVisible(true)}>
                <View style={styles.inputRow}>
                  <Text style={address ? styles.inputText : styles.inputPlaceholder} numberOfLines={1}>
                    {address || '또는 주소 검색 (현장 등록 없이)'}
                  </Text>
                  {address ? (
                    <Pressable onPress={() => setAddress('')} hitSlop={8}>
                      <Icon name="close-circle" size={18} color={colors.muted} />
                    </Pressable>
                  ) : (
                    <Icon name="magnify" size={18} color={colors.primaryDark} />
                  )}
                </View>
              </Pressable>
            </>
          )}
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={addressDetail}
              onChangeText={setAddressDetail}
              placeholder="상세 주소 (예: 래미안 101동 1203호)"
              placeholderTextColor={colors.muted}
              maxLength={100}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>날짜</Text>
          <Pressable style={styles.inputWrap} onPress={() => setShowDatePicker(true)}>
            <View style={styles.inputRow}>
              <Text style={styles.inputText}>{dayjs(date).format('YYYY년 M월 D일')} ({WEEKDAY_LABEL[dayjs(date).day()]})</Text>
              <Icon name="calendar-month-outline" size={18} color={colors.primaryDark} />
            </View>
          </Pressable>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            locale="ko-KR"
            onChange={(_e, d) => { setShowDatePicker(Platform.OS === 'ios'); if (d) setDate(d); }}
          />
        )}

        <View style={styles.field}>
          <Text style={styles.label}>시간</Text>
          <View style={styles.timeRow}>
            <Pressable style={[styles.inputWrap, { flex: 1 }]} onPress={() => setTimePickerTarget('start')}>
              <View style={styles.inputRow}>
                <Text style={styles.inputText}>{startTime}</Text>
                <Icon name="clock-outline" size={18} color={colors.muted} />
              </View>
            </Pressable>
            <Text style={styles.tilde}>~</Text>
            <Pressable style={[styles.inputWrap, { flex: 1 }]} onPress={() => setTimePickerTarget('end')}>
              <View style={styles.inputRow}>
                <Text style={styles.inputText}>{endTime}</Text>
                <Icon name="clock-outline" size={18} color={colors.muted} />
              </View>
            </Pressable>
          </View>
        </View>
        {timePickerTarget && (
          <DateTimePicker
            value={dayjs(`2000-01-01T${timePickerTarget === 'start' ? startTime : endTime}`).toDate()}
            mode="time"
            is24Hour
            display="default"
            onChange={(_e, d) => {
              setTimePickerTarget(Platform.OS === 'ios' ? timePickerTarget : null);
              if (!d) return;
              const t = dayjs(d).format('HH:mm');
              if (timePickerTarget === 'start') setStartTime(t); else setEndTime(t);
            }}
          />
        )}

        <View style={styles.field}>
          <Text style={styles.label}>공정</Text>
          <WorkTypePicker value={workTypeId} onChange={handleWorkTypeChange} disabled={saving} placeholder="공정 선택" />
        </View>

        <View style={styles.rowTwo}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>공수</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} value={String(workUnits)} onChangeText={t => { const n = parseFloat(t); setWorkUnits(isNaN(n) ? 0 : n); }} keyboardType="decimal-pad" />
            </View>
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>단가</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} value={formatMoney(dailyWage)} onChangeText={t => setDailyWage(parseMoney(t))} keyboardType="numeric" placeholder="250,000원" placeholderTextColor={colors.muted} />
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>메모</Text>
          <TextInput style={styles.textarea} value={memo} onChangeText={setMemo} placeholder="메모를 입력하세요" placeholderTextColor={colors.muted} multiline numberOfLines={2} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>알림</Text>
          <Pressable style={styles.inputWrap} onPress={() => setReminderPickerVisible(true)}>
            <View style={styles.inputRow}>
              <Text style={styles.inputText}>{REMINDER_TIME_LABEL[reminderTime]}</Text>
              <Icon name="bell-outline" size={18} color={colors.muted} />
            </View>
          </Pressable>
        </View>

        <Pressable style={styles.extraToggle} onPress={() => setExtraOpen(v => !v)}>
          <Text style={styles.extraToggleText}>추가 정보 (경비 · 지역 · 평수 · 투입 인원 · 세무)</Text>
          <Icon name={extraOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
        </Pressable>

        {extraOpen && (
          <View style={{ gap: spacing.md }}>
            <View style={styles.rowTwo}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>구분 (세무용)</Text>
                <View style={styles.tabRow}>
                  <Pressable style={[styles.tabBtn, employmentType === 'daily' && styles.tabBtnOn]} onPress={() => setEmploymentType('daily')}>
                    <Text style={[styles.tabText, employmentType === 'daily' && styles.tabTextOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>일용근로</Text>
                  </Pressable>
                  <Pressable style={[styles.tabBtn, employmentType === 'freelance' && styles.tabBtnOn]} onPress={() => setEmploymentType('freelance')}>
                    <Text style={[styles.tabText, employmentType === 'freelance' && styles.tabTextOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>프리랜서(3.3%)</Text>
                  </Pressable>
                </View>
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>지급 상태</Text>
                <View style={styles.tabRow}>
                  <Pressable style={[styles.tabBtn, paymentStatus === 'pending' && styles.tabBtnOn]} onPress={() => setPaymentStatus('pending')}>
                    <Text style={[styles.tabText, paymentStatus === 'pending' && styles.tabTextOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>미지급</Text>
                  </Pressable>
                  <Pressable style={[styles.tabBtn, paymentStatus === 'paid' && styles.tabBtnOn]} onPress={() => setPaymentStatus('paid')}>
                    <Text style={[styles.tabText, paymentStatus === 'paid' && styles.tabTextOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>지급완료</Text>
                  </Pressable>
                </View>
              </View>
            </View>
            <View style={styles.rowTwo}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>경비</Text>
                <View style={styles.inputWrap}>
                  <TextInput style={styles.input} value={formatMoney(expenses)} onChangeText={t => setExpenses(parseMoney(t))} keyboardType="numeric" placeholder="교통비 등" placeholderTextColor={colors.muted} />
                </View>
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>평수 (㎡)</Text>
                <View style={styles.inputWrap}>
                  <TextInput style={styles.input} value={areaM2} onChangeText={setAreaM2} keyboardType="numeric" placeholder="예: 23.5" placeholderTextColor={colors.muted} />
                </View>
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>경비 메모</Text>
              <View style={styles.inputWrap}>
                <TextInput style={styles.input} value={expensesMemo} onChangeText={setExpensesMemo} placeholder="예: 톨게이트, 주차비" placeholderTextColor={colors.muted} />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>지역</Text>
              <View style={styles.inputWrap}>
                <TextInput style={styles.input} value={district} onChangeText={setDistrict} placeholder="예: 강남구" placeholderTextColor={colors.muted} />
              </View>
            </View>
            {!isPersonal && (
              <View style={styles.field}>
                <Text style={styles.label}>투입 인원{selectedUserIds.length > 0 ? ` (${selectedUserIds.length}명)` : ''}</Text>
                <View style={styles.chipWrap}>
                  {members.map(m => {
                    const on = selectedUserIds.includes(m.id);
                    return (
                      <Pressable key={m.id} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleMember(m.id)}>
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{m.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        <Pressable onPress={handleSave} disabled={saving} style={{ marginTop: 4 }}>
          <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.saveBtn, saving && { opacity: 0.7 }]}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>저장하기</Text>}
          </LinearGradient>
        </Pressable>
      </ScrollView>

      <SitePickerModal
        visible={sitePickerVisible}
        onClose={() => setSitePickerVisible(false)}
        onSelect={site => { setSelectedSite(site); setAddress(''); }}
      />
      <AddressSearchModal
        visible={addressSearchVisible}
        onClose={() => setAddressSearchVisible(false)}
        onSelect={result => {
          setAddress(result.roadAddress || result.jibunAddress);
          // 아파트명이 있으면 상세 주소 앞부분을 채워둠 — 동·호수만 이어서 적으면 되게
          if (!addressDetail.trim() && result.buildingName) setAddressDetail(`${result.buildingName} `);
        }}
      />

      <Modal visible={teamPickerVisible} animationType="slide" transparent onRequestClose={() => setTeamPickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setTeamPickerVisible(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>팀 선택</Text>
          <FlatList
            data={teams ?? []}
            keyExtractor={t => String(t.id)}
            renderItem={({ item }) => (
              <Pressable style={styles.modalRow} onPress={() => { setTeamId(item.id); setTeamPickerVisible(false); }}>
                <Text style={styles.modalRowText}>{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      <Modal visible={reminderPickerVisible} animationType="fade" transparent onRequestClose={() => setReminderPickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setReminderPickerVisible(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>알림</Text>
          <FlatList
            data={REMINDER_TIME_OPTIONS}
            keyExtractor={k => k}
            renderItem={({ item }) => (
              <Pressable style={styles.modalRow} onPress={() => { setReminderTime(item); setReminderPickerVisible(false); }}>
                <Text style={[styles.modalRowText, item === reminderTime && { color: colors.primaryDark, fontWeight: '700' }]}>{REMINDER_TIME_LABEL[item]}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  hint: { fontSize: 12, color: colors.textSecondary },
  inputWrap: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, paddingHorizontal: 14, justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { fontSize: 14, color: colors.textPrimary, padding: 0 },
  inputText: { fontSize: 14, color: colors.textPrimary },
  inputPlaceholder: { fontSize: 14, color: colors.muted },

  tabRow: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: '#EEF5FD', borderRadius: 12 },
  tabBtn: { flex: 1, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBtnOn: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  tabTextOn: { fontWeight: '700', color: colors.primaryDark },

  rowTwo: { flexDirection: 'row', gap: 10 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tilde: { color: colors.textSecondary },

  textarea: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: 14, color: colors.textPrimary, minHeight: 56, textAlignVertical: 'top' },

  extraToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  extraToggleText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: '#E8F3FF', borderColor: '#BFDBFB' },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextOn: { color: colors.primaryDark, fontWeight: '700' },

  saveBtn: { height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,42,86,0.4)' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, maxHeight: '60%' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  modalRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  modalRowText: { fontSize: 15, color: colors.textPrimary },
});
