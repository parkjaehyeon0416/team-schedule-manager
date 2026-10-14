/**
 * 현장 등록/수정 화면 — DESIGN-CANVAS 기준, SITE_CREATE.dc.html / SITE_EDIT.dc.html
 * ★ 디자인의 "상세 주소"는 한 입력창(동/호수)이지만 백엔드는 dong/ho가 별도 컬럼이라
 *   "101동 203호" 같은 입력을 저장 시 정규식으로 분리함.
 * ★ 새로 등록하는 현장은 아직 site_id가 없어 사진을 바로 업로드할 수 없으므로, 선택한
 *   사진을 로컬에 담아뒀다가 현장이 만들어진 직후 순서대로 업로드함.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, ActivityIndicator, Image, Platform, FlatList, Modal } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { pickImages, toPhotoFile } from '../utils/pickImage';
import type { PhotoFile } from '../utils/pickImage';
import { uploadSequentially, showUploadSummary, uploadSummary } from '../utils/uploadPhotos';
import type { UploadBatchResult } from '../utils/uploadPhotos';
import dayjs from 'dayjs';
import AppHeader from '../components/AppHeader';
import AddressSearchModal, { DaumAddressResult } from '../components/AddressSearchModal';
import ModalBottomSafeArea, { MODAL_UNDER_SYSTEM_BARS } from '../components/ModalBottomSafeArea';
import { createSite, updateSite, getSitePhotos, uploadSitePhoto, deleteSitePhoto } from '../api/siteApi';
import { getMyTeams } from '../api/teamApi';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import type { Site, Team, SiteFile as SitePhoto } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';

function parseDongHo(input: string): { dong: string | null; ho: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { dong: null, ho: null };
  // "101-1203" / "101/1203" / "101 1203" → 101동 1203호
  const pair = trimmed.match(/^([0-9A-Za-z]+)\s*[-/ ]\s*([0-9A-Za-z]+)$/);
  if (pair) return { dong: pair[1], ho: pair[2] };
  const dongMatch = trimmed.match(/([0-9A-Za-z가-힣]+)\s*동/);
  const hoMatch = trimmed.match(/([0-9A-Za-z]+)\s*호/);
  if (dongMatch || hoMatch) {
    return { dong: dongMatch ? dongMatch[1] : null, ho: hoMatch ? hoMatch[1] : null };
  }
  return { dong: trimmed, ho: null };
}

type QueuedPhoto = PhotoFile;
type SitePhotoCategory = 'before' | 'after';

// ★ v18.66 — 시공 전·후 각각 올릴 수 있는 최대 사진 수(갤러리에서 남은 칸만큼 한 번에 고름)
const PHOTO_MAX = 10;

export default function SiteFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editing: Site | undefined = route.params?.site;
  const isEdit = !!editing;

  const [aptName, setAptName] = useState(editing?.apt_name ?? '');
  const [address, setAddress] = useState(editing?.address ?? '');
  const [addressSearchVisible, setAddressSearchVisible] = useState(false);
  // 동이 "상가 A" 같은 자유 입력이면 "동"을 덧붙이지 않음 (저장 → 수정 반복 시 글자가 망가지지 않게)
  const [detailAddr, setDetailAddr] = useState(
    [
      editing?.dong && (/^[0-9A-Za-z가-힣]+$/.test(editing.dong) ? `${editing.dong}동` : editing.dong),
      editing?.ho && `${editing.ho}호`,
    ].filter(Boolean).join(' '),
  );
  const [startDate, setStartDate] = useState<Date | null>(editing?.start_date ? new Date(editing.start_date) : null);
  const [endDate, setEndDate] = useState<Date | null>(editing?.end_date ? new Date(editing.end_date) : null);
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<number | null>(editing?.team_id ?? null);
  const [teamPickerVisible, setTeamPickerVisible] = useState(false);
  const [status, setStatus] = useState<'scheduled' | 'in_progress' | 'done'>(editing?.status ?? 'scheduled');
  const [customer, setCustomer] = useState(editing?.customer ?? '');
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [saving, setSaving] = useState(false);

  const [beforePhotos, setBeforePhotos] = useState<SitePhoto[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<SitePhoto[]>([]);
  const [queuedBefore, setQueuedBefore] = useState<QueuedPhoto[]>([]);
  const [queuedAfter, setQueuedAfter] = useState<QueuedPhoto[]>([]);
  // ★ v18.66 — 여러 장 올리는 중 진행 상황(수정: 분류별 추가 버튼에 2/5, 등록: 등록 버튼에 표시)
  const [uploading, setUploading] = useState<{ category: SitePhotoCategory; current: number; total: number } | null>(null);
  const [submitProgress, setSubmitProgress] = useState<{ current: number; total: number } | null>(null);
  const busyRef = useRef(false);

  // ★ v18.44 — 팀 현장은 그 팀의 팀장만 등록할 수 있어 내가 팀장인 팀만 고를 수 있게
  const [memberOnly, setMemberOnly] = useState(false);
  useEffect(() => {
    getMyTeams()
      .then(list => {
        setTeams(list.filter(t => t.is_leader));
        setMemberOnly(list.length > 0 && !list.some(t => t.is_leader));
      })
      .catch(() => {});
  }, []);

  const loadPhotos = React.useCallback(async () => {
    if (!editing) return;
    await getSitePhotos(editing.id).then(res => {
      setBeforePhotos(res.before);
      setAfterPhotos(res.after);
    }).catch(() => {});
  }, [editing]);

  useFocusEffect(React.useCallback(() => { loadPhotos(); }, [loadPhotos]));

  const handleAddressSelect = (r: DaumAddressResult) => {
    setAddress(r.roadAddress || r.jibunAddress);
    if (!aptName && r.buildingName) setAptName(r.buildingName);
    setAddressSearchVisible(false);
  };

  // ★ v18.66 — 갤러리에서 남은 칸(최대 10장 - 이미 있는 장수)만큼 한 번에 고름.
  //   수정 중이면 한 장씩 차례로 올리고 끝난 뒤 한 번만 새로고침, 새 현장이면 등록할 때 올리도록 담아둠.
  const pickPhoto = async (category: SitePhotoCategory) => {
    if (busyRef.current) return;
    const used = category === 'before'
      ? beforePhotos.length + queuedBefore.length
      : afterPhotos.length + queuedAfter.length;
    const remaining = PHOTO_MAX - used;
    if (remaining <= 0) return;
    busyRef.current = true;
    try {
      const assets = await pickImages(remaining);
      const files = assets.map(a => toPhotoFile(a)).filter((f): f is QueuedPhoto => f !== null);
      if (files.length === 0) return;

      if (isEdit && editing) {
        setUploading({ category, current: 0, total: files.length });
        try {
          const result = await uploadSequentially(
            files,
            f => uploadSitePhoto(editing.id, f, category),
            (current, total) => setUploading({ category, current, total }),
          );
          // 새 장수를 받아 온 뒤에 버튼을 풀어야 바로 또 눌렀을 때 10장 제한이 맞게 계산됨
          if (result.done > 0) await loadPhotos();
          showUploadSummary(result);
        } finally {
          setUploading(null);
        }
      } else {
        const append = (prev: QueuedPhoto[]) => [...prev, ...files].slice(0, PHOTO_MAX);
        if (category === 'before') setQueuedBefore(append);
        else setQueuedAfter(append);
      }
    } finally {
      busyRef.current = false;
    }
  };

  const removePhoto = (category: 'before' | 'after', photo: SitePhoto) => {
    if (!editing) return;
    Alert.alert('사진 삭제', '이 사진을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await deleteSitePhoto(editing.id, photo.id).catch(() => {});
        loadPhotos();
      } },
    ]);
  };

  const handleSubmit = async () => {
    if (!address.trim()) {
      Alert.alert('입력 오류', '주소를 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const { dong, ho } = parseDongHo(detailAddr);
      const payload = {
        address: address.trim(),
        apt_name: aptName.trim() || null,
        dong,
        ho,
        memo: memo.trim() || null,
        start_date: startDate ? dayjs(startDate).format('YYYY-MM-DD') : null,
        end_date: endDate ? dayjs(endDate).format('YYYY-MM-DD') : null,
        customer: customer.trim() || null,
        team_id: teamId,
        // 팀을 고르지 않으면 개인 현장 (안 보내면 서버가 활성 팀 현장으로 저장함)
        is_personal: teamId === null,
        status,
      };
      if (isEdit) {
        await updateSite(editing!.id, payload);
        navigation.goBack();
      } else {
        const created = await createSite(payload);
        // ★ v18.66 — 담아둔 사진을 시공 전 → 후 순서로 한 장씩 올림(진행 2/5 표시, 요금제 한도면 거기서 멈춤)
        const queued = [
          ...queuedBefore.map(photo => ({ photo, category: 'before' as const })),
          ...queuedAfter.map(photo => ({ photo, category: 'after' as const })),
        ];
        let result: UploadBatchResult | null = null;
        if (queued.length > 0) {
          setSubmitProgress({ current: 0, total: queued.length });
          result = await uploadSequentially(
            queued,
            q => uploadSitePhoto(created.id, q.photo, q.category),
            (current, total) => setSubmitProgress({ current, total }),
          );
        }
        navigation.replace('SiteDetail', { siteId: created.id });
        const summary = result && uploadSummary(result);
        if (summary) Alert.alert(summary.title, `현장은 등록했어요.\n${summary.message}`);
      }
    } catch (e: any) {
      Alert.alert('저장 실패', e?.response?.data?.message || '현장 저장에 실패했습니다.');
    } finally {
      setSaving(false);
      setSubmitProgress(null);
    }
  };

  const selectedTeam = teams.find(t => t.id === teamId);

  const renderPhotoSection = (
    label: string,
    tone: { bg: string; fg: string },
    uploaded: SitePhoto[],
    queued: QueuedPhoto[],
    category: SitePhotoCategory,
  ) => {
    const count = uploaded.length + queued.length;
    const progress = uploading?.category === category ? uploading : null;
    return (
      <View style={styles.photoBox}>
        <View style={styles.photoBoxHeader}>
          <View style={[styles.photoTag, { backgroundColor: tone.bg }]}><Text style={[styles.photoTagText, { color: tone.fg }]}>{label}</Text></View>
          <Text style={styles.photoCount}>{count}장</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {uploaded.map(p => (
            <Pressable key={p.id} onLongPress={() => removePhoto(category, p)} style={styles.photoThumbWrap}>
              <Image source={{ uri: `${SERVER_BASE_URL}/storage/${p.file_path}` }} style={styles.photoThumb} />
            </Pressable>
          ))}
          {queued.map((p, i) => (
            <View key={`q-${i}`} style={styles.photoThumbWrap}>
              <Image source={{ uri: p.uri }} style={styles.photoThumb} />
            </View>
          ))}
          {/* ★ v18.66 — 올리는 중엔 "올리는 중 2/5" 표시, 다른 분류 추가도 잠시 막음 */}
          {(count < PHOTO_MAX || progress) && (
            <Pressable style={[styles.photoAddBtn, !!uploading && !progress && styles.photoAddBtnDisabled]} onPress={() => pickPhoto(category)} disabled={!!uploading}>
              {progress ? (
                <>
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                  <Text style={[styles.photoAddBtnText, styles.textCenter]}>올리는 중{'\n'}{progress.current}/{progress.total}</Text>
                </>
              ) : (
                <>
                  <Icon name="camera-plus-outline" size={20} color={colors.primaryDark} />
                  <Text style={styles.photoAddBtnText}>{count}/{PHOTO_MAX}</Text>
                </>
              )}
            </Pressable>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title={isEdit ? '현장 수정' : '현장 등록'} />
      <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>현장명</Text>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} value={aptName} onChangeText={setAptName} placeholder="현장명을 입력하세요" placeholderTextColor={colors.muted} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>주소</Text>
          <Pressable style={styles.inputWrap} onPress={() => setAddressSearchVisible(true)}>
            <Text style={address ? styles.addressText : styles.addressPlaceholder} numberOfLines={1}>
              {address || '주소를 검색하세요'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>상세 주소</Text>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} value={detailAddr} onChangeText={setDetailAddr} placeholder="동/호수" placeholderTextColor={colors.muted} />
          </View>
        </View>

        <View style={styles.rowTwo}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>시작일</Text>
            <Pressable style={styles.inputWrap} onPress={() => setDatePickerTarget('start')}>
              <Text style={startDate ? styles.addressText : styles.addressPlaceholder}>{startDate ? dayjs(startDate).format('YYYY.MM.DD') : '날짜 선택'}</Text>
            </Pressable>
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>종료일</Text>
            <Pressable style={styles.inputWrap} onPress={() => setDatePickerTarget('end')}>
              <Text style={endDate ? styles.addressText : styles.addressPlaceholder}>{endDate ? dayjs(endDate).format('YYYY.MM.DD') : '날짜 선택'}</Text>
            </Pressable>
          </View>
        </View>
        {datePickerTarget && (
          <DateTimePicker
            value={(datePickerTarget === 'start' ? startDate : endDate) ?? new Date()}
            mode="date"
            display="default"
            locale="ko-KR"
            onChange={(_e, d) => {
              setDatePickerTarget(Platform.OS === 'ios' ? datePickerTarget : null);
              if (!d) return;
              if (datePickerTarget === 'start') setStartDate(d);
              else setEndDate(d);
            }}
          />
        )}

        <View style={styles.field}>
          <Text style={styles.label}>팀</Text>
          {teams.length > 0 ? (
            <Pressable style={styles.inputWrap} onPress={() => setTeamPickerVisible(true)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={selectedTeam ? styles.addressText : styles.addressPlaceholder}>{selectedTeam ? selectedTeam.name : '팀을 선택하세요 (선택)'}</Text>
                <Icon name="chevron-down" size={18} color={colors.muted} />
              </View>
            </Pressable>
          ) : (
            <Text style={styles.addressPlaceholder}>
              {memberOnly ? '팀 현장은 팀장만 등록할 수 있어 개인 현장으로 등록돼요.' : '소속된 팀이 없어 개인 현장으로 등록돼요.'}
            </Text>
          )}
        </View>

        {isEdit && (
          <View style={styles.field}>
            <Text style={styles.label}>상태</Text>
            <View style={styles.tabRow}>
              {([['scheduled', '예정'], ['in_progress', '진행중'], ['done', '완료']] as const).map(([key, label]) => {
                const on = status === key;
                return (
                  <Pressable key={key} style={[styles.tabBtn, on && styles.tabBtnOn]} onPress={() => setStatus(key)}>
                    <Text style={[styles.tabText, on && styles.tabTextOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>고객</Text>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} value={customer} onChangeText={setCustomer} placeholder="고객명 / 연락처" placeholderTextColor={colors.muted} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>메모</Text>
          <TextInput
            style={styles.textarea}
            value={memo}
            onChangeText={setMemo}
            placeholder="메모를 입력하세요"
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.label}>현장 사진 <Text style={styles.labelSub}>(시공 전 · 후 각 최대 10장)</Text></Text>
          {renderPhotoSection('시공 전', { bg: '#EEF2F7', fg: colors.textSecondary }, beforePhotos, queuedBefore, 'before')}
          {renderPhotoSection('시공 후', { bg: '#E8F3FF', fg: colors.primaryDark }, afterPhotos, queuedAfter, 'after')}
        </View>

        <AddressSearchModal visible={addressSearchVisible} onClose={() => setAddressSearchVisible(false)} onSelect={handleAddressSelect} />

        <Modal visible={teamPickerVisible} animationType="slide" transparent onRequestClose={() => setTeamPickerVisible(false)} {...MODAL_UNDER_SYSTEM_BARS}>
          <Pressable style={styles.modalBackdrop} onPress={() => setTeamPickerVisible(false)} />
          {/* ★ v18.70 — 기기 하단 바와 겹치는 높이만큼 아래 여백을 더함(ModalBottomSafeArea)
            ★ v18.70 QA — 어두운 배경은 기기 상단·하단 바 뒤까지 덮음(MODAL_UNDER_SYSTEM_BARS) */}
          <ModalBottomSafeArea style={styles.modalSheet}>
            <Text style={styles.modalTitle}>팀 선택</Text>
            <Pressable style={styles.modalRow} onPress={() => { setTeamId(null); setTeamPickerVisible(false); }}>
              <Text style={styles.modalRowText}>선택 안 함 (개인)</Text>
            </Pressable>
            <FlatList
              data={teams}
              keyExtractor={t => String(t.id)}
              renderItem={({ item }) => (
                <Pressable style={styles.modalRow} onPress={() => { setTeamId(item.id); setTeamPickerVisible(false); }}>
                  <Text style={styles.modalRowText}>{item.name}</Text>
                </Pressable>
              )}
            />
          </ModalBottomSafeArea>
        </Modal>

        <Pressable onPress={handleSubmit} disabled={saving} style={{ marginTop: 4 }}>
          <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.submitBtn, saving && { opacity: 0.7 }]}>
            {saving ? (
              submitProgress ? (
                <View style={styles.submitProgressRow}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>사진 올리는 중 {submitProgress.current}/{submitProgress.total}</Text>
                </View>
              ) : <ActivityIndicator color="#FFFFFF" />
            ) : <Text style={styles.submitBtnText}>{isEdit ? '저장하기' : '현장 등록'}</Text>}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  labelSub: { fontWeight: '400', color: colors.textSecondary },
  inputWrap: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, paddingHorizontal: 14, justifyContent: 'center' },
  input: { fontSize: 14, color: colors.textPrimary, padding: 0 },
  addressText: { fontSize: 14, color: colors.textPrimary },
  addressPlaceholder: { fontSize: 14, color: colors.muted },

  rowTwo: { flexDirection: 'row', gap: 10 },

  tabRow: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: '#EEF5FD', borderRadius: 12 },
  tabBtn: { flex: 1, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabBtnOn: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  tabTextOn: { fontWeight: '700', color: colors.primaryDark },

  textarea: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: 14, color: colors.textPrimary, minHeight: 56, textAlignVertical: 'top' },

  photoBox: { gap: 8, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  photoBoxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photoTag: { height: 22, paddingHorizontal: 8, borderRadius: 6, justifyContent: 'center' },
  photoTagText: { fontSize: 11, fontWeight: '700' },
  photoCount: { fontSize: 12, color: colors.textSecondary },
  photoThumbWrap: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden', marginRight: 8 },
  photoThumb: { width: '100%', height: '100%' },
  photoAddBtn: { width: 72, height: 72, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#9CC9FA', backgroundColor: '#F3F9FF', alignItems: 'center', justifyContent: 'center', gap: 2 },
  photoAddBtnText: { fontSize: 11, color: colors.primaryDark },
  photoAddBtnDisabled: { opacity: 0.5 }, // ★ v18.66 — 다른 분류 사진을 올리는 중
  textCenter: { textAlign: 'center' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,42,86,0.4)' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, maxHeight: '60%' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  modalRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  modalRowText: { fontSize: 15, color: colors.textPrimary },

  submitBtn: { height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  submitProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
