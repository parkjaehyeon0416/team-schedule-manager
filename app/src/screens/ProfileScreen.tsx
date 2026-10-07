/**
 * 내 정보 화면 — v18.33 (DESIGN-CANVAS 기준, MY_HOME.dc.html 1:1)
 * 하단 탭 '내정보' — 프로필 카드(통계 3개) + 그룹별 메뉴 리스트 + 로그아웃
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Image, ScrollView, Text as RNText } from 'react-native';
import { Avatar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import { getMyTeams } from '../api/teamApi';
import { getSchedules } from '../api/schedulesApi';
import { getSites } from '../api/siteApi';
import { getMyInquiries } from '../api/inquiryApi';
import { getPlans } from '../api/planApi';
import { getLoginLinks } from '../api/socialAuthApi';
import { ProviderBadge } from '../components/AuthUi';
import dayjs from 'dayjs';
import { APP_VERSION } from '../constants/appVersion';
import { colors, radius, spacing, typography } from '../theme/designTokens';
import { ICONS } from '../assets/icons';
import type { IconKey } from '../assets/icons';

// ★ v18.36 — 디자인의 3D 아이콘(이미지)으로 교체
type LinkMethod = 'kakao' | 'google' | 'email';
type MenuRow = { key: string; image: IconKey; label: string; sub?: string; right?: string; badges?: LinkMethod[]; onPress: () => void };

const LINK_NAME: Record<LinkMethod, string> = { kakao: '카카오', google: '구글', email: '이메일' };

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [teamCount, setTeamCount] = useState<number | null>(null);
  const [scheduleCount, setScheduleCount] = useState<number | null>(null);
  const [siteCount, setSiteCount] = useState<number | null>(null);
  const [unreadAnswers, setUnreadAnswers] = useState(0); // ★ v18.43 고객 문의 새 답변 수
  const [planSub, setPlanSub] = useState<string | undefined>(undefined); // ★ v18.48 요금제 줄 설명
  const [linked, setLinked] = useState<LinkMethod[]>([]); // ★ v18.51 로그인 연결 관리 줄

  useFocusEffect(
    useCallback(() => {
      const now = new Date();
      getPlans()
        .then(p => setPlanSub(p.me.launch_free_until
          ? `${dayjs(p.me.launch_free_until).subtract(1, 'day').format('M월 D일')}까지 전부 무료`
          : p.me.plan_name))
        .catch(() => setPlanSub(undefined));
      getMyTeams().then(t => setTeamCount(t.length)).catch(() => setTeamCount(null));
      getSchedules(now.getFullYear(), now.getMonth() + 1)
        .then(s => setScheduleCount(s.length))
        .catch(() => setScheduleCount(null));
      getSites().then(s => setSiteCount(s.length)).catch(() => setSiteCount(null));
      getLoginLinks()
        .then(l => setLinked((['kakao', 'google', 'email'] as LinkMethod[]).filter(m => (m === 'email' ? l.email.set : l[m].linked))))
        .catch(() => setLinked([]));
      getMyInquiries().then(r => setUnreadAnswers(r.unread_answers)).catch(() => setUnreadAnswers(0));
    }, []),
  );

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: async () => await logout() },
    ]);
  };

  if (!user) return null;

  const avatarUri = user.avatar_image_path ? `${SERVER_BASE_URL}/storage/${user.avatar_image_path}` : null;
  const roleLine = [user.team?.name, user.role?.name].filter(Boolean).join(' · ');

  const profileMenu: MenuRow[] = [
    {
      key: 'profile', image: 'profile', label: '프로필 설정', sub: '이름 · 연락처 · 지역',
      onPress: () => navigation.navigate('ProfileEdit'),
    },
    {
      key: 'card', image: 'card', label: '내 명함', sub: '명함 공유 · 이미지 저장',
      onPress: () => navigation.navigate('BusinessCard'),
    },
    {
      key: 'public', image: 'profile', label: '공개 프로필 보기', sub: '다른 사람에게 보이는 모습',
      onPress: () => navigation.navigate('ProfilePublic'),
    },
    // ★ v18.51 — 디자인(MY_HOME)대로 로그인 연결 관리(연결된 수단을 오른쪽에 작게)
    {
      key: 'loginLinks', image: 'loginLinks', label: '로그인 연결 관리',
      sub: linked.length ? `${linked.map(m => LINK_NAME[m]).join(' · ')} 연결됨` : undefined,
      badges: linked,
      onPress: () => navigation.navigate('MyLoginLinks'),
    },
  ];

  const settingsMenu: MenuRow[] = [
    // ★ v18.48 — 디자인(MY_HOME)대로 요금제 항목(출시 기념 무료 기간이면 "M월 D일까지 전부 무료")
    {
      key: 'plan', image: 'gift', label: '요금제',
      sub: planSub,
      onPress: () => navigation.navigate('Plan'),
    },
    {
      key: 'rates', image: 'income', label: '내 단가 설정', sub: '공수 · 일급',
      onPress: () => navigation.navigate('MyRates'),
    },
    {
      key: 'tradeRates', image: 'rates', label: '공정별 단가 설정', sub: '도배 · 타일 · 필름',
      onPress: () => navigation.navigate('TradeRates'),
    },
    {
      key: 'notif', image: 'bell', label: '알림 설정', sub: '일정 · 팀 · 견적',
      onPress: () => navigation.navigate('NotificationSettings'),
    },
    {
      key: 'tax', image: 'tax', label: '세무 자료', sub: '자료 조회 · 내보내기',
      onPress: () => navigation.navigate('TaxSummary'),
    },
  ];

  // ★ v18.36 — 디자인(MY_HOME)대로 공지·약관·개인정보 항목 추가
  const infoMenu: MenuRow[] = [
    { key: 'notice', image: 'megaphone', label: '공지사항 · 이벤트', onPress: () => navigation.navigate('NoticeList') },
    // ★ v18.43 — 고객 문의 (오른쪽에 새 답변 수)
    {
      key: 'inquiry', image: 'megaphone', label: '고객 문의', right: unreadAnswers > 0 ? `답변 ${unreadAnswers}건` : undefined,
      onPress: () => navigation.navigate('InquiryList'),
    },
    { key: 'terms', image: 'doc', label: '이용약관', onPress: () => navigation.navigate('LegalDocument', { type: 'terms' }) },
    { key: 'privacy', image: 'privacy', label: '개인정보 처리방침', onPress: () => navigation.navigate('LegalDocument', { type: 'privacy' }) },
    {
      key: 'appInfo', image: 'info', label: '앱 정보', sub: `v${APP_VERSION}`,
      onPress: () => navigation.navigate('AppInfo'),
    },
  ];

  const renderRow = (row: MenuRow, isLast: boolean) => (
    <TouchableOpacity key={row.key} onPress={row.onPress} style={[styles.row, !isLast && styles.rowDivider]}>
      <View style={styles.rowIcon}>
        <Image source={ICONS[row.image]} style={styles.rowIconImage} />
      </View>
      <View style={styles.rowTextBox}>
        <RNText style={styles.rowLabel}>{row.label}</RNText>
        {!!row.sub && <RNText style={styles.rowSub}>{row.sub}</RNText>}
      </View>
      {!!row.right && <RNText style={styles.rowRight}>{row.right}</RNText>}
      {!!row.badges?.length && (
        <View style={styles.badges} accessibilityLabel={row.sub}>
          {row.badges.map(m => <ProviderBadge key={m} provider={m} size={22} ring style={styles.badge} />)}
        </View>
      )}
      <Icon name="chevron-right" size={16} color={colors.muted} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <RNText style={styles.headerTitle}>내 정보</RNText>
        <TouchableOpacity onPress={() => navigation.navigate('NotificationSettings')} hitSlop={8}>
          <Icon name="cog-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Avatar.Text
                size={64}
                label={user.name.charAt(0)}
                style={[styles.avatar, user.avatar_color ? { backgroundColor: user.avatar_color } : null]}
                labelStyle={styles.avatarLabel}
              />
            )}
            <View style={styles.profileText}>
              <RNText style={styles.name}>{user.name}</RNText>
              {!!roleLine && <RNText style={styles.roleLine}>{roleLine}</RNText>}
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('ProfileEdit')}>
              <Icon name="pencil-outline" size={17} color={colors.primaryDark} />
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statCol} onPress={() => navigation.navigate('Team')}>
              <RNText style={styles.statValue}>{teamCount ?? '-'}</RNText>
              <RNText style={styles.statLabel}>소속 팀</RNText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCol} onPress={() => navigation.navigate('Schedule')}>
              <RNText style={styles.statValue}>{scheduleCount ?? '-'}</RNText>
              <RNText style={styles.statLabel}>이번 달 일정</RNText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCol} onPress={() => navigation.navigate('SiteList')}>
              <RNText style={styles.statValue}>{siteCount ?? '-'}</RNText>
              <RNText style={styles.statLabel}>진행 현장</RNText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>{profileMenu.map((row, i) => renderRow(row, i === profileMenu.length - 1))}</View>
        <View style={styles.card}>{settingsMenu.map((row, i) => renderRow(row, i === settingsMenu.length - 1))}</View>
        <View style={styles.card}>{infoMenu.map((row, i) => renderRow(row, i === infoMenu.length - 1))}</View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Icon name="logout" size={18} color={colors.danger} />
          <RNText style={styles.logoutText}>로그아웃</RNText>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },

  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: spacing.lg,
    gap: spacing.md,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { backgroundColor: colors.primary },
  avatarImage: { width: 64, height: 64, borderRadius: 32 },
  avatarLabel: { color: '#FFFFFF', fontWeight: 'bold' },
  profileText: { flex: 1, gap: 4 },
  name: { fontSize: 19, fontWeight: '800', color: colors.textPrimary },
  roleLine: { fontSize: 13, color: colors.textSecondary },
  editBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#EAF4FF',
    alignItems: 'center', justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderHairline,
  },
  statCol: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 12, color: colors.textSecondary },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    paddingHorizontal: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 11 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  rowIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#F2F7FE', alignItems: 'center', justifyContent: 'center' },
  rowIconImage: { width: 28, height: 28, resizeMode: 'contain' },
  rowTextBox: { flex: 1, minWidth: 0, gap: 2 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary },
  rowRight: { fontSize: 12, color: colors.textSecondary, marginRight: 4 },
  badges: { flexDirection: 'row', paddingLeft: 6, marginRight: 4 },
  badge: { marginLeft: -6 },
  versionText: { fontSize: 13, color: colors.textSecondary },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
});
