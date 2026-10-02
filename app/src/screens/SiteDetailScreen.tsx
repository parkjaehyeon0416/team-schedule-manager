/**
 * 현장 상세 화면 — DESIGN-CANVAS 기준, SITE_DETAIL.dc.html
 * ★ "공정"은 Site에 저장된 값이 아니라 이 현장에 연결된 일정들의 공정을 모아 표시(파생값).
 * ★ "연결 견적"은 해당 현장(site_id)에 연결된 견적서 중 가장 최근 것.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import dayjs from 'dayjs';
import { getSites, deleteSite, getSitePhotos } from '../api/siteApi';
import { getSchedules } from '../api/schedulesApi';
import { getMyTeams } from '../api/teamApi';
import { getQuotes } from '../api/quoteApi';
import AppHeader from '../components/AppHeader';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import { formatMoney } from '../utils/format';
import type { Site, Schedule, Team, Quote, PhotoListResponse } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';

const STATUS_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  scheduled: { label: '예정', bg: '#EEF2F7', fg: colors.textSecondary },
  in_progress: { label: '진행중', bg: '#E8F3FF', fg: colors.primaryDark },
  done: { label: '완료', bg: '#E2F8F4', fg: colors.secondary },
};

export default function SiteDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const siteId: number = route.params.siteId;
  const [site, setSite] = useState<Site | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [photos, setPhotos] = useState<PhotoListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getSites(),
      getSchedules(),
      getMyTeams().catch(() => []),
      getQuotes().catch(() => []),
      getSitePhotos(siteId).catch(() => null),
    ])
      .then(([sites, allSchedules, teams, quotes, photoRes]) => {
        const found = sites.find(s => s.id === siteId) ?? null;
        setSite(found);
        const siteSchedules = allSchedules.filter(s => s.site_id === siteId).sort((a, b) => b.date.localeCompare(a.date));
        setSchedules(siteSchedules);
        setTeam(teams.find(t => t.id === found?.team_id) ?? null);
        const siteQuotes = quotes.filter(q => q.site_id === siteId).sort((a, b) => b.id - a.id);
        setQuote(siteQuotes[0] ?? null);
        setPhotos(photoRes);
      })
      .finally(() => setLoading(false));
  }, [siteId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = () => {
    setMenuOpen(false);
    Alert.alert('현장 삭제', '이 현장을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSite(siteId);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('삭제 실패', e?.response?.data?.message || '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  if (loading || !site) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="현장 상세" />
        <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  const title = site.apt_name || site.address;
  const subLine = [site.address, site.dong && `${site.dong}동`, site.ho && `${site.ho}호`].filter(Boolean).join(' ');
  const statusInfo = STATUS_LABEL[site.status ?? 'scheduled'];
  const totalIncome = schedules.reduce((sum, s) => sum + Number(s.daily_wage ?? 0), 0);
  const processNames = Array.from(new Set(schedules.map(s => s.work_type_relation?.name || s.work_type).filter(Boolean))) as string[];
  const periodLabel = site.start_date
    ? `${dayjs(site.start_date).format('YYYY.MM.DD')}${site.end_date ? ` - ${dayjs(site.end_date).format('MM.DD')}` : ''}${site.end_date ? ` (${dayjs(site.end_date).diff(dayjs(site.start_date), 'day') + 1}일)` : ''}`
    : null;

  const renderPhotoGroup = (label: string, tag: { bg: string; fg: string; dark?: boolean }, list: PhotoListResponse['before']) => {
    const main = list[0];
    const rest = list.slice(1, 3);
    const extra = list.length - 3;
    return (
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <View style={{ position: 'relative' }}>
          {main ? (
            <Image source={{ uri: `${SERVER_BASE_URL}/storage/${main.file_path}` }} style={styles.mainPhoto} />
          ) : (
            <View style={styles.mainPhotoPlaceholder}>
              <Icon name="image-multiple-outline" size={22} color="#7F95B2" />
              <Text style={styles.placeholderText}>{label} 대표 사진</Text>
            </View>
          )}
          <View style={[styles.photoBadge, { backgroundColor: tag.bg }]}>
            <Text style={[styles.photoBadgeText, { color: tag.fg }]}>{label}</Text>
          </View>
        </View>
        {rest.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {rest.map(p => (
              <Image key={p.id} source={{ uri: `${SERVER_BASE_URL}/storage/${p.file_path}` }} style={styles.subPhoto} />
            ))}
            {extra > 0 && (
              <View style={styles.subPhotoMore}><Text style={styles.subPhotoMoreText}>+{extra}</Text></View>
            )}
          </View>
        )}
        <Text style={styles.photoCountLabel}>{label} {list.length}장</Text>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        leftType="back"
        title="현장 상세"
        rightContent={
          <Pressable onPress={() => setMenuOpen(v => !v)} style={styles.headerRightBtn}>
            <Icon name="dots-horizontal" size={22} color={colors.textPrimary} />
          </Pressable>
        }
      />
      {menuOpen && (
        <View style={styles.menuBox}>
          <Pressable style={styles.menuItem} onPress={handleDelete}><Text style={[styles.menuItemText, { color: colors.danger }]}>삭제</Text></Pressable>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ gap: 6 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            <View style={[styles.statusTag, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.statusTagText, { color: statusInfo.fg }]}>{statusInfo.label}</Text>
            </View>
          </View>
          <View style={styles.addressRow}>
            <Icon name="map-marker-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.addressText}>{subLine}</Text>
          </View>
        </View>

        <View style={styles.photoCard}>
          <View style={styles.photoCardHeader}>
            <Text style={styles.sectionTitle}>시공 사진</Text>
            <Pressable onPress={() => navigation.navigate('SiteEdit', { site })}>
              <Text style={styles.photoAddLink}>사진 추가</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {renderPhotoGroup('시공 전', { bg: 'rgba(16,42,86,0.72)', fg: '#FFFFFF' }, photos?.before ?? [])}
            {renderPhotoGroup('시공 후', { bg: colors.primaryDark, fg: '#FFFFFF' }, photos?.after ?? [])}
          </View>
        </View>

        <View style={styles.twoCol}>
          <Pressable style={styles.statCard} onPress={() => navigation.navigate('IncomeList')}>
            <Text style={styles.statLabel}>수입 합계</Text>
            <Text style={styles.statValue}>{formatMoney(totalIncome)}원</Text>
          </Pressable>
          <Pressable
            style={styles.statCard}
            disabled={!quote}
            onPress={() => quote && navigation.navigate('QuoteDetail', { quoteId: quote.id })}
          >
            <Text style={styles.statLabel}>연결 견적</Text>
            <Text style={[styles.statValue, { color: quote ? colors.primaryDark : colors.muted }]}>{quote ? `${formatMoney(quote.total_amount)}원` : '없음'}</Text>
          </Pressable>
        </View>

        <View style={styles.infoCard}>
          {!!periodLabel && <View style={styles.infoRow}><Text style={styles.infoLabel}>기간</Text><Text style={styles.infoValue}>{periodLabel}</Text></View>}
          <Pressable style={styles.infoRow} disabled={!team} onPress={() => team && navigation.navigate('TeamDetail', { teamId: team.id })}>
            <Text style={styles.infoLabel}>팀</Text>
            <Text style={[styles.infoValue, team && styles.infoLink]}>{team ? `${team.name} ›` : '-'}</Text>
          </Pressable>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>공정</Text><Text style={styles.infoValue}>{processNames.length > 0 ? processNames.join(' · ') : '-'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>고객</Text><Text style={styles.infoValue}>{site.customer || '-'}</Text></View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}><Text style={styles.infoLabel}>메모</Text><Text style={styles.infoValue}>{site.memo || '-'}</Text></View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>일정 이력</Text>
          <Pressable onPress={() => navigation.popTo('MainTabs', { screen: 'Schedule' })}>
            <Text style={styles.sectionLink}>전체 ›</Text>
          </Pressable>
        </View>
        <View style={styles.listCard}>
          {schedules.length === 0 ? (
            <Text style={styles.emptyText}>이 현장에 연결된 일정이 없어요.</Text>
          ) : (
            schedules.slice(0, 8).map((s, i) => (
              <Pressable
                key={s.id}
                style={[styles.row, i === Math.min(schedules.length, 8) - 1 && { borderBottomWidth: 0 }]}
                onPress={() => navigation.navigate('ScheduleDetail', { id: s.id })}
              >
                <View style={styles.rowIcon}><Icon name="calendar-month-outline" size={17} color={colors.accentDark} /></View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{s.memo || s.work_type_relation?.name || '일정'}</Text>
                  <Text style={styles.rowSub}>{dayjs(s.date).format('M월 D일')}{team ? ` · ${team.name}` : ''}</Text>
                </View>
                <Icon name="chevron-right" size={16} color={colors.muted} />
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.footerRow}>
          <Pressable style={styles.editBtn} onPress={() => navigation.navigate('SiteEdit', { site })}>
            <Text style={styles.editBtnText}>수정</Text>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('ScheduleCreate', { siteId })}>
            <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.addBtn}>
              <Icon name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.addBtnText}>일정 추가</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
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

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  statusTag: { height: 24, paddingHorizontal: 9, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  statusTagText: { fontSize: 12, fontWeight: '700' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addressText: { fontSize: 13, color: colors.textSecondary },

  photoCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, padding: 14, gap: 10 },
  photoCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photoAddLink: { fontSize: 13, color: colors.primaryDark, fontWeight: '600' },
  mainPhoto: { width: '100%', height: 132, borderRadius: 12 },
  mainPhotoPlaceholder: { width: '100%', height: 132, borderRadius: 12, backgroundColor: '#E9F1FA', alignItems: 'center', justifyContent: 'center', gap: 4 },
  placeholderText: { fontSize: 11, color: '#7F95B2' },
  photoBadge: { position: 'absolute', left: 8, top: 8, height: 22, paddingHorizontal: 8, borderRadius: 6, justifyContent: 'center' },
  photoBadgeText: { fontSize: 11, fontWeight: '700' },
  subPhoto: { flex: 1, height: 46, borderRadius: 8 },
  subPhotoMore: { flex: 1, height: 46, borderRadius: 8, backgroundColor: '#EEF3F9', alignItems: 'center', justifyContent: 'center' },
  subPhotoMoreText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  photoCountLabel: { fontSize: 12, color: colors.textSecondary, paddingTop: 2 },

  twoCol: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.md, padding: 14, gap: 4 },
  statLabel: { fontSize: 12, color: colors.textSecondary },
  statValue: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },

  infoCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16 },
  infoRow: { flexDirection: 'row', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  infoLabel: { width: 60, fontSize: 13, color: colors.textSecondary },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  infoLink: { fontWeight: '700', color: colors.primaryDark },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  sectionLink: { fontSize: 13, color: colors.textSecondary },
  listCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, paddingVertical: 20, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFF1DE', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary },

  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  editBtn: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: '#BFDBFB', alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  addBtn: { height: 48, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
