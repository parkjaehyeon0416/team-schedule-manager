// ═══════════════════════════════════════════════════════════════
// 📄 ScheduleReportsScreen.tsx — 일정별 자동 보고서
//   ScheduleDetailScreen 더보기 › "자동 보고서 관리"에서 진입
//   ★ v18.66 — 디자인 SCHEDULE_REPORTS(기본·만드는 중·제목 미입력·무료 소진·빈 상태·팀원 보기·현장 미지정·삭제 확인)로 새로 만듦.
//     예전 화면은 옛 스타일(보라색 버튼·react-native-paper)이었음.
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, Alert, ActivityIndicator, Share, Linking,
  Pressable, Image, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from '../components/Gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';

import { getReportsWithContext, createReport, deleteReport, getPublicReportUrl, shareReport } from '../api/reportApi';
import type { SiteReport, ReportContext } from '../types/api';
import AppHeader from '../components/AppHeader';
import { MODAL_UNDER_SYSTEM_BARS } from '../components/ModalBottomSafeArea'; // ★ v18.70 QA — 확인 창 어두운 배경이 기기 바 뒤까지
import { isPlanLocked } from '../utils/planLock';
import { ICONS } from '../assets/icons';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

/** 공유 링크 남은 일수(0이면 만료) — 서버 share_expires_at 기준 */
function daysLeft(r: SiteReport): number {
  if (!r.share_expires_at) return 0;
  const ms = dayjs(r.share_expires_at).diff(dayjs());
  return ms <= 0 ? 0 : Math.max(1, Math.ceil(ms / 86400000));
}

export default function ScheduleReportsScreen({ route }: any) {
  const { scheduleId } = route.params;
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<SiteReport[]>([]);
  const [ctx, setCtx] = useState<ReportContext | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [delTarget, setDelTarget] = useState<SiteReport | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [title, setTitle] = useState('');
  const [titleErr, setTitleErr] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [greeting, setGreeting] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  };

  const load = useCallback(async () => {
    try {
      const data = await getReportsWithContext(scheduleId);
      setReports(data.reports);
      setCtx(data.context);
    } catch (e: any) {
      Alert.alert('조회 실패', e?.response?.data?.message || '보고서 목록을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const limit = ctx?.usage.limit ?? null;
  const used = ctx?.usage.used ?? 0;
  const full = limit !== null && used >= limit;
  const canMake = !!ctx?.has_site && !full && !creating;
  const photos = ctx?.photo_counts;

  const handleCreate = async () => {
    if (!canMake) return;
    if (!title.trim()) {
      setTitleErr(true);
      return;
    }
    setCreating(true);
    try {
      await createReport(scheduleId, {
        title: title.trim(),
        client_name: clientName.trim() || undefined,
        client_contact: clientContact.trim() || undefined,
        greeting_message: greeting.trim() || undefined,
      });
      setTitle('');
      setClientName('');
      setClientContact('');
      setGreeting('');
      showToast('PDF 보고서를 만들었어요');
      await load();
    } catch (e: any) {
      if (!isPlanLocked(e)) Alert.alert('만들지 못했어요', e?.response?.data?.message || '잠시 후 다시 시도해주세요.');
      load();
    } finally {
      setCreating(false);
    }
  };

  // 공유 링크는 3일만 열림 — 보기·공유 전에 서버에서 살아 있는 링크를 받아 옴(만료됐으면 새 주소)
  const ensureLink = async (r: SiteReport) => {
    const wasDead = daysLeft(r) === 0;
    const res = await shareReport(r.id);
    setReports(list => list.map(x => (x.id === r.id ? { ...x, share_token: res.share_token, share_expires_at: res.share_expires_at } : x)));
    return { token: res.share_token, wasDead };
  };

  const handleView = async (r: SiteReport) => {
    setBusyId(r.id);
    try {
      const { token } = await ensureLink(r);
      await Linking.openURL(getPublicReportUrl(token));
    } catch {
      Alert.alert('열지 못했어요', 'PDF를 열 수 없어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setBusyId(null);
    }
  };

  const handleShare = async (r: SiteReport) => {
    setBusyId(r.id);
    try {
      const { token, wasDead } = await ensureLink(r);
      if (wasDead) showToast('새 공유 링크를 만들었어요');
      await Share.share({ message: `${r.title}\n${getPublicReportUrl(token)}\n(링크는 3일 동안 열려요)` });
    } catch (e: any) {
      if (e?.response) Alert.alert('공유하지 못했어요', e.response.data?.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async () => {
    const r = delTarget;
    if (!r) return;
    setDelTarget(null);
    setBusyId(r.id);
    try {
      await deleteReport(r.id);
      setReports(list => list.filter(x => x.id !== r.id));
      showToast('보고서를 삭제했어요');
    } catch (e: any) {
      Alert.alert('삭제하지 못했어요', e?.response?.data?.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setBusyId(null);
    }
  };

  const dateLabel = ctx?.date ? `${dayjs(ctx.date).format('YYYY년 M월 D일')} (${WEEK[dayjs(ctx.date).day()]})` : '';
  const workLabel = [ctx?.work_type, ctx?.area_m2 ? `${ctx.area_m2}㎡` : null].filter(Boolean).join(' · ');
  const someoneElses = reports.some(r => r.can_delete === false);

  return (
    <View style={s.screen}>
      <AppHeader leftType="back" title="자동 보고서" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={s.main} keyboardShouldPersistTaps="handled">
          {loading ? (
            <ActivityIndicator size="large" color="#0A6CE0" style={{ marginTop: 40 }} />
          ) : !ctx?.has_site ? (
            // ── 현장 미지정 ──
            <View style={s.card}>
              <View style={s.noSiteBox}>
                <View style={s.noSiteIcon}><Icon name="map-marker-outline" size={28} color="#FF9E2C" /></View>
                <Text style={s.noSiteTitle}>현장이 지정되지 않았어요</Text>
                <Text style={s.noSiteDesc}>일정에 현장이나 주소를 먼저 지정해야{'\n'}보고서를 만들 수 있어요.</Text>
              </View>
              <Pressable onPress={() => navigation.navigate('ScheduleCreate', { scheduleId })} accessibilityRole="button">
                <LinearGradient colors={['#2492FF', '#0A6CE0']} style={s.primaryBtn}>
                  <Icon name="map-marker-outline" size={18} color="#FFFFFF" />
                  <Text style={s.primaryText}>현장 지정하기</Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <>
              {/* ── 보고서에 들어갈 내용 ── */}
              <View style={s.card}>
                <View style={s.cardHead}>
                  <Text style={s.h2}>보고서에 들어갈 내용</Text>
                  <Text style={s.muted12}>일정에서 자동으로 가져와요</Text>
                </View>
                <View style={s.siteRow}>
                  <View style={s.siteIcon}><Image source={ICONS.site} style={{ width: 35, height: 35, resizeMode: 'contain' }} /></View>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={s.siteName} numberOfLines={1}>{ctx.site_name ?? '현장'}</Text>
                    {!!ctx.address && <Text style={s.siteAddr} numberOfLines={2}>{ctx.address}</Text>}
                  </View>
                </View>
                <View>
                  <View style={s.kvRow}><Text style={s.kvKey}>작업일</Text><Text style={s.kvVal}>{dateLabel}</Text></View>
                  {!!workLabel && <View style={s.kvRow}><Text style={s.kvKey}>공정</Text><Text style={s.kvVal}>{workLabel}</Text></View>}
                </View>
                <View style={{ gap: 8 }}>
                  <View style={s.photoHead}>
                    <Icon name="camera-outline" size={15} color="#5F7290" />
                    <Text style={s.muted13}>현장 사진 {photos?.total ?? 0}장</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={[s.pcBox, { backgroundColor: '#F3F6FA' }]}><Text style={[s.pcNum, { color: '#102A56' }]}>{photos?.before ?? 0}</Text><Text style={s.muted12}>시공 전</Text></View>
                    <View style={[s.pcBox, { backgroundColor: '#EAF4FF' }]}><Text style={[s.pcNum, { color: '#0A6CE0' }]}>{photos?.during ?? 0}</Text><Text style={s.muted12}>시공 중</Text></View>
                    <View style={[s.pcBox, { backgroundColor: '#E2F8F4' }]}><Text style={[s.pcNum, { color: '#0B8574' }]}>{photos?.after ?? 0}</Text><Text style={s.muted12}>시공 후</Text></View>
                  </View>
                </View>
              </View>

              {/* ── 보고서 만들기 ── */}
              <View style={s.card}>
                <Text style={s.h2}>보고서 만들기</Text>
                <View style={[s.usageBox, { backgroundColor: full ? '#FFF2E2' : '#EAF4FF' }]}>
                  <View style={s.cardHead}>
                    <Text style={[s.usageLine, { color: full ? '#B95E00' : '#0A6CE0' }]}>
                      {limit === null ? '출시 기념으로 무제한 무료예요' : `이번 달 무료 ${Math.min(used, limit)}/${limit}건 사용`}
                    </Text>
                    {limit !== null && <Text style={s.muted12}>무료는 한 달 {limit}건</Text>}
                  </View>
                  {limit !== null && (
                    <View style={s.barTrack} accessibilityRole="progressbar" accessibilityLabel="이번 달 무료 사용량">
                      <View style={[s.barFill, { width: `${Math.min(100, (used / Math.max(1, limit)) * 100)}%`, backgroundColor: full ? '#FF9E2C' : '#168BFF' }]} />
                    </View>
                  )}
                </View>

                <View style={s.field}>
                  <Text style={s.label}>보고서 제목<Text style={{ color: '#E5484D' }}> *</Text></Text>
                  <View style={[s.input, { borderColor: titleErr ? '#E5484D' : title ? '#7DBBFF' : '#DDEAF7' }]}>
                    <TextInput
                      style={s.inputText}
                      value={title}
                      onChangeText={v => { setTitle(v); setTitleErr(false); }}
                      placeholder="예: 청라 A동 도배 시공 완료 보고서"
                      placeholderTextColor="#9AACC4"
                      accessibilityLabel="보고서 제목 (필수)"
                      maxLength={200}
                    />
                  </View>
                  {titleErr && (
                    <View style={s.errRow} accessibilityRole="alert">
                      <Icon name="information-outline" size={13} color="#E5484D" />
                      <Text style={s.errText}>보고서 제목을 입력해주세요.</Text>
                    </View>
                  )}
                </View>
                <View style={s.field}>
                  <Text style={s.label}>고객명</Text>
                  <View style={s.input}>
                    <Icon name="account-outline" size={18} color="#8FA3BF" />
                    <TextInput style={s.inputText} value={clientName} onChangeText={setClientName} placeholder="예: 김지현" placeholderTextColor="#9AACC4" accessibilityLabel="고객명" maxLength={100} />
                  </View>
                </View>
                <View style={s.field}>
                  <Text style={s.label}>고객 연락처</Text>
                  <View style={s.input}>
                    <Icon name="cellphone" size={18} color="#8FA3BF" />
                    <TextInput style={s.inputText} value={clientContact} onChangeText={setClientContact} placeholder="010-0000-0000" placeholderTextColor="#9AACC4" keyboardType="phone-pad" accessibilityLabel="고객 연락처" maxLength={100} />
                  </View>
                </View>
                <View style={s.field}>
                  <Text style={s.label}>인사말</Text>
                  <TextInput
                    style={s.textarea}
                    value={greeting}
                    onChangeText={setGreeting}
                    placeholder="예: 안녕하세요. 시공이 잘 마무리되어 사진과 함께 보고드립니다."
                    placeholderTextColor="#9AACC4"
                    multiline
                    textAlignVertical="top"
                    accessibilityLabel="인사말"
                  />
                  <Text style={s.muted12}>보고서 첫 장에 들어가요. 비워 두면 기본 인사말을 넣어요.</Text>
                </View>

                {creating ? (
                  <View style={{ gap: 8 }}>
                    <View style={[s.primaryBtn, s.btnBig, { backgroundColor: '#7FB8F5' }]} accessibilityState={{ busy: true }}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={s.primaryTextBig}>PDF 만드는 중…</Text>
                    </View>
                    <Text style={[s.muted12, { textAlign: 'center' }]} accessibilityRole="text">
                      사진 {photos?.total ?? 0}장을 정리하고 있어요. 10초 정도 걸려요.
                    </Text>
                  </View>
                ) : full ? (
                  <View style={{ gap: 10 }}>
                    <View style={[s.primaryBtn, s.btnBig, { backgroundColor: '#DCE9F8' }]} accessibilityState={{ disabled: true }}>
                      <Icon name="file-document-outline" size={19} color="#FFFFFF" />
                      <Text style={s.primaryTextBig}>PDF 보고서 생성</Text>
                    </View>
                    <View style={s.limitBox}>
                      <Text style={s.limitText}>이번 달 무료 {limit}건을 모두 썼어요.{'\n'}다음 달 1일에 다시 {limit}건이 생겨요.</Text>
                      <Pressable onPress={() => navigation.navigate('Plan')} style={s.limitBtn} accessibilityRole="button">
                        <Text style={s.limitBtnText}>요금제 보기</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={handleCreate} accessibilityRole="button">
                    <LinearGradient colors={['#2492FF', '#0A6CE0']} style={[s.primaryBtn, s.btnBig]}>
                      <Icon name="file-document-outline" size={19} color="#FFFFFF" />
                      <Text style={s.primaryTextBig}>PDF 보고서 생성</Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            </>
          )}

          {/* ── 만든 보고서 ── */}
          {!loading && (
            <View style={{ gap: 10 }}>
              <Text style={s.h2}>만든 보고서 {reports.length}</Text>
              {someoneElses && (
                <View style={s.memberHint}>
                  <Icon name="lock-outline" size={14} color="#5F7290" />
                  <Text style={s.muted12}>팀장이 만든 보고서는 보기와 공유만 할 수 있어요.</Text>
                </View>
              )}
              {reports.length === 0 ? (
                <View style={s.emptyBox}>
                  <Image source={ICONS.quote} style={{ width: 64, height: 64, resizeMode: 'contain' }} />
                  <Text style={s.emptyTitle}>아직 만든 보고서가 없어요</Text>
                  <Text style={s.emptyDesc}>
                    제목을 입력하고 [PDF 보고서 생성]을 누르면{'\n'}현장 사진과 작업 내용이 담긴 PDF가 만들어져요.{'\n'}고객에게 링크로 바로 보낼 수 있어요.
                  </Text>
                </View>
              ) : (
                reports.map(r => {
                  const left = daysLeft(r);
                  const busy = busyId === r.id;
                  return (
                    <View key={r.id} style={s.reportCard}>
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                        <View style={s.pdfBadge}>
                          <Icon name="file-document-outline" size={18} color="#E5484D" />
                          <Text style={s.pdfText}>PDF</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                          <Text style={s.reportTitle}>{r.title}</Text>
                          <Text style={s.muted12}>
                            고객 {r.client_name || '미입력'} · {dayjs(r.created_at).format('YYYY.MM.DD')} 생성
                          </Text>
                          {!!r.author_name && <Text style={s.byLine}>{r.author_name}님이 만든 보고서</Text>}
                        </View>
                      </View>
                      <View style={s.metaRow}>
                        <View style={s.metaItem}>
                          <Icon name="eye-outline" size={14} color="#5F7290" />
                          <Text style={s.muted12}>열람 {r.view_count}회</Text>
                        </View>
                        {left > 0 ? (
                          <View style={[s.linkChip, { backgroundColor: '#E2F8F4' }]}>
                            <Icon name="link-variant" size={13} color="#0B8574" />
                            <Text style={[s.linkText, { color: '#0B8574' }]}>링크 {left}일 남음</Text>
                          </View>
                        ) : (
                          <View style={[s.linkChip, { backgroundColor: '#EEF2F7' }]}>
                            <Icon name="clock-outline" size={13} color="#5F7290" />
                            <Text style={[s.linkText, { color: '#5F7290' }]}>만료됨 · 다시 공유하면 새 링크</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Pressable onPress={() => handleView(r)} disabled={busy} style={[s.actBtn, s.actView]} accessibilityRole="button">
                          <Icon name="eye-outline" size={15} color="#0A6CE0" />
                          <Text style={[s.actText, { color: '#0A6CE0' }]}>보기</Text>
                        </Pressable>
                        <Pressable onPress={() => handleShare(r)} disabled={busy} style={[s.actBtn, s.actShare]} accessibilityRole="button">
                          {busy ? <ActivityIndicator size="small" color="#0A6CE0" /> : <Icon name="share-variant-outline" size={15} color="#0A6CE0" />}
                          <Text style={[s.actText, { color: '#0A6CE0' }]}>공유</Text>
                        </Pressable>
                        {r.can_delete !== false ? (
                          <Pressable onPress={() => setDelTarget(r)} disabled={busy} style={[s.actBtn, s.actDel]} accessibilityRole="button" accessibilityLabel={`${r.title} 삭제`}>
                            <Icon name="trash-can-outline" size={15} color="#E5484D" />
                            <Text style={[s.actText, { color: '#E5484D' }]}>삭제</Text>
                          </Pressable>
                        ) : (
                          <View style={[s.actBtn, s.actLocked]} accessibilityState={{ disabled: true }} accessibilityLabel="팀장이 만든 보고서는 삭제할 수 없어요">
                            <Icon name="lock-outline" size={15} color="#B4C2D4" />
                            <Text style={[s.actText, { color: '#B4C2D4' }]}>삭제</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── 삭제 확인 ── */}
      <Modal transparent {...MODAL_UNDER_SYSTEM_BARS} visible={!!delTarget} animationType="fade" onRequestClose={() => setDelTarget(null)}>
        <View style={s.backdrop}>
          <View style={s.dialog} accessibilityRole="alert" accessibilityLabel="보고서 삭제 확인">
            <View style={s.dialogIcon}><Icon name="trash-can-outline" size={26} color="#E5484D" /></View>
            <Text style={s.dialogTitle}>이 보고서를 삭제할까요?</Text>
            <Text style={s.dialogDesc}>공유한 링크도 더 이상 열리지 않아요.</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 8 }}>
              <Pressable onPress={() => setDelTarget(null)} style={[s.dialogBtn, s.dialogCancel]} accessibilityRole="button">
                <Text style={[s.dialogBtnText, { color: '#3B4F70' }]}>취소</Text>
              </Pressable>
              <Pressable onPress={doDelete} style={[s.dialogBtn, { backgroundColor: '#E5484D' }]} accessibilityRole="button">
                <Text style={[s.dialogBtnText, { color: '#FFFFFF' }]}>삭제</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {!!toast && (
        <Pressable onPress={() => setToast('')} style={s.toast} accessibilityRole="text" accessibilityLiveRegion="polite">
          <Icon name="check" size={16} color="#FFFFFF" />
          <Text style={s.toastText}>{toast}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7FBFF' },
  main: { paddingTop: 4, paddingHorizontal: 16, paddingBottom: 40, gap: 14 },
  card: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6F0FA', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#102A56', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  h2: { fontSize: 15, fontWeight: '700', color: '#102A56' },
  muted12: { fontSize: 12, color: '#5F7290' },
  muted13: { fontSize: 13, color: '#5F7290' },

  noSiteBox: { alignItems: 'center', gap: 10, paddingTop: 16, paddingHorizontal: 4, paddingBottom: 4 },
  noSiteIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#FFF2E2', alignItems: 'center', justifyContent: 'center' },
  noSiteTitle: { fontSize: 16, fontWeight: '700', color: '#102A56' },
  noSiteDesc: { fontSize: 14, color: '#5F7290', lineHeight: 22, textAlign: 'center' },

  siteRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  siteIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F2F7FE', alignItems: 'center', justifyContent: 'center' },
  siteName: { fontSize: 16, fontWeight: '700', color: '#102A56' },
  siteAddr: { fontSize: 13, color: '#5F7290', lineHeight: 19 },
  kvRow: { flexDirection: 'row', gap: 12, alignItems: 'baseline', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#EDF3FA' },
  kvKey: { width: 78, fontSize: 13, color: '#5F7290' },
  kvVal: { flex: 1, fontSize: 14, color: '#102A56', fontWeight: '500' },
  photoHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pcBox: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 10 },
  pcNum: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },

  usageBox: { gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12 },
  usageLine: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(16,42,86,0.08)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#102A56' },
  input: {
    height: 48, borderWidth: 1, borderColor: '#DDEAF7', borderRadius: 10, backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
  },
  inputText: { flex: 1, fontSize: 14, color: '#102A56', paddingVertical: 0 },
  textarea: {
    minHeight: 104, borderWidth: 1, borderColor: '#DDEAF7', borderRadius: 10, backgroundColor: '#FFFFFF',
    paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: '#102A56', lineHeight: 21,
  },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errText: { fontSize: 12, fontWeight: '600', color: '#E5484D' },

  primaryBtn: { height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnBig: { height: 54, gap: 8 },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  primaryTextBig: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  limitBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1, borderColor: '#FFE1BD', backgroundColor: '#FFF8EF',
  },
  limitText: { flex: 1, fontSize: 13, lineHeight: 20, color: '#8A4B00' },
  limitBtn: { height: 36, paddingHorizontal: 12, borderRadius: 9, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FFD29E', justifyContent: 'center' },
  limitBtnText: { fontSize: 13, fontWeight: '700', color: '#B95E00' },

  memberHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emptyBox: {
    alignItems: 'center', gap: 8, paddingVertical: 28, paddingHorizontal: 16,
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#CFE0F3', borderRadius: 16, backgroundColor: '#FFFFFF',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#102A56' },
  emptyDesc: { fontSize: 13, color: '#5F7290', lineHeight: 21, textAlign: 'center' },

  reportCard: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6F0FA', borderRadius: 16, padding: 16, gap: 10,
    shadowColor: '#102A56', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  pdfBadge: { width: 40, height: 48, borderRadius: 8, backgroundColor: '#FFF2F2', alignItems: 'center', justifyContent: 'center', gap: 1 },
  pdfText: { fontSize: 10, fontWeight: '800', color: '#E5484D' },
  reportTitle: { fontSize: 15, fontWeight: '700', color: '#102A56', lineHeight: 21 },
  byLine: { fontSize: 12, fontWeight: '600', color: '#8B6CF0' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkChip: { height: 24, paddingHorizontal: 8, borderRadius: 7, flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontSize: 12, fontWeight: '700' },
  actBtn: { flex: 1, height: 38, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  actView: { borderWidth: 1, borderColor: '#BFDBFB', backgroundColor: '#FFFFFF' },
  actShare: { backgroundColor: '#EAF4FF' },
  actDel: { borderWidth: 1, borderColor: '#FFD5D6', backgroundColor: '#FFF2F2' },
  actLocked: { borderWidth: 1, borderColor: '#E6ECF3', backgroundColor: '#F3F6FA' },
  actText: { fontSize: 13, fontWeight: '700' },

  backdrop: { flex: 1, backgroundColor: 'rgba(16,42,86,0.45)', justifyContent: 'center', paddingHorizontal: 24 },
  dialog: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center', gap: 10,
    shadowColor: '#102A56', shadowOpacity: 0.25, shadowRadius: 25, shadowOffset: { width: 0, height: 20 }, elevation: 8,
  },
  dialogIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFECEC', alignItems: 'center', justifyContent: 'center' },
  dialogTitle: { marginTop: 4, fontSize: 18, fontWeight: '800', color: '#102A56' },
  dialogDesc: { fontSize: 14, color: '#5F7290', lineHeight: 22, textAlign: 'center' },
  dialogBtn: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dialogCancel: { borderWidth: 1, borderColor: '#DDEAF7', backgroundColor: '#FFFFFF' },
  dialogBtnText: { fontSize: 15, fontWeight: '700' },

  toast: {
    position: 'absolute', left: 16, right: 16, bottom: 32, zIndex: 40, paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: 12, backgroundColor: 'rgba(16,42,86,0.92)', flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  toastText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
