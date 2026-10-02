/**
 * 이벤트 상세 — DESIGN-CANVAS 기준, EVENT_DETAIL.dc.html
 * 정보표 첫 줄 "기간"은 starts_at/ends_at으로 자동 표시하고, 나머지(대상/혜택/발표 등)는 info 행을 그대로 표시.
 * CTA 버튼은 cta_route(앱 화면 이름)로 이동 — 하단 탭 화면이면 MainTabs 안으로 이동.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Share, Image } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../components/AppHeader';
import { getNotice } from '../api/noticesApi';
import type { NoticeDetail } from '../api/noticesApi';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import { eventDday, eventStatus, formatEventPeriod, parseNoticeBody } from '../utils/notice';
import { NoticeBody } from './NoticeDetailScreen';
import { colors, radius, spacing } from '../theme/designTokens';
import { ICONS } from '../assets/icons';

const TAB_ROUTES = ['HomeDashboard', 'Schedule', 'Notifications', 'Profile'];

export default function EventDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: number = route.params.id;
  const [event, setEvent] = useState<NoticeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setFailed(false);
      getNotice(id)
        .then(setEvent)
        .catch(() => setFailed(true))
        .finally(() => setLoading(false));
    }, [id]),
  );

  const handleShare = () => {
    if (!event) return;
    const period = formatEventPeriod(event.starts_at, event.ends_at);
    Share.share({
      message: `[WorkMate 이벤트] ${event.title}${period ? `\n기간: ${period}` : ''}${event.summary ? `\n\n${event.summary}` : ''}`,
    }).catch(() => {});
  };

  const handleCta = () => {
    const target = event?.cta_route;
    if (!target) return;
    if (TAB_ROUTES.includes(target)) navigation.popTo('MainTabs', { screen: target });
    else navigation.navigate(target);
  };

  const shareButton = (
    <Pressable onPress={handleShare} style={styles.headerBtn} hitSlop={6} disabled={!event}>
      <Icon name="share-variant-outline" size={22} color={colors.textPrimary} />
    </Pressable>
  );

  if (loading || !event) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="이벤트" rightContent={shareButton} />
        <View style={styles.centerBox}>
          {failed ? <Text style={styles.emptyText}>이벤트를 불러오지 못했어요.</Text> : <ActivityIndicator color={colors.primary} />}
        </View>
      </View>
    );
  }

  const status = eventStatus(event.starts_at, event.ends_at);
  const dday = status === '진행중' ? eventDday(event.ends_at) : null;
  const period = formatEventPeriod(event.starts_at, event.ends_at);
  const infoRows = [...(period ? [{ label: '기간', value: period }] : []), ...(event.info ?? [])];
  const ended = status === '종료';

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="이벤트" rightContent={shareButton} />
      <ScrollView contentContainerStyle={styles.content}>
        {event.banner_path ? (
          <Image source={{ uri: `${SERVER_BASE_URL}/storage/${event.banner_path}` }} style={styles.banner} resizeMode="cover" />
        ) : (
          <LinearGradient colors={['#FFE3BF', '#FFC57A']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[styles.banner, styles.bannerFallback]}>
            <View style={styles.eventPill}>
              <Text style={styles.eventPillText}>EVENT</Text>
            </View>
            <Text style={styles.bannerTitle} numberOfLines={3}>{event.title}</Text>
            <Image source={ICONS.gift} style={styles.bannerIcon} />
          </LinearGradient>
        )}

        <View style={{ gap: 6 }}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: ended ? '#EEF2F7' : '#FFF2E2' }]}>
              <Text style={[styles.badgeText, { color: ended ? colors.textSecondary : '#B95E00' }]}>{status}</Text>
            </View>
            {dday && (
              <View style={[styles.badge, { backgroundColor: '#EEF2F7' }]}>
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{dday}</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{event.title}</Text>
          {!!event.summary && <Text style={styles.summary}>{event.summary}</Text>}
        </View>

        {infoRows.length > 0 && (
          <View style={styles.infoCard}>
            {infoRows.map((row, i) => (
              <View key={i} style={[styles.infoRow, i === infoRows.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        <NoticeBody blocks={parseNoticeBody(event.body)} />

        {!!event.steps?.length && (
          <View style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>참여 방법</Text>
            <View style={{ gap: 12 }}>
              {event.steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1, gap: 2, paddingTop: 3 }}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    {!!step.desc && <Text style={styles.stepDesc}>{step.desc}</Text>}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {!!event.cautions?.length && (
          <View style={styles.cautionCard}>
            <Text style={styles.cautionTitle}>유의사항</Text>
            {event.cautions.map((c, i) => (
              <View key={i} style={styles.cautionRow}>
                <Text style={styles.cautionText}>•</Text>
                <Text style={[styles.cautionText, { flex: 1 }]}>{c}</Text>
              </View>
            ))}
          </View>
        )}

        {!!event.cta_route && !ended && (
          <Pressable onPress={handleCta}>
            {({ pressed }) => (
              <LinearGradient
                colors={[colors.primaryLight, colors.primaryDark]}
                style={[styles.ctaBtn, pressed && { opacity: 0.9 }]}
              >
                <Icon name="camera-outline" size={18} color="#FFFFFF" />
                <Text style={styles.ctaText}>{event.cta_label || '참여하러 가기'}</Text>
              </LinearGradient>
            )}
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: colors.textSecondary },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: spacing.xl, gap: 16 },

  banner: { height: 200, borderRadius: 18, overflow: 'hidden' },
  bannerFallback: { padding: 22, justifyContent: 'space-between' },
  eventPill: { alignSelf: 'flex-start', height: 24, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  eventPillText: { fontSize: 12, fontWeight: '800', color: '#B95E00' },
  bannerTitle: { fontSize: 22, fontWeight: '800', lineHeight: 30, color: '#5A2E00', marginRight: 90 },
  bannerIcon: { position: 'absolute', right: 14, bottom: 12, width: 104, height: 104, resizeMode: 'contain' },

  badgeRow: { flexDirection: 'row', gap: 6 },
  badge: { height: 24, paddingHorizontal: 9, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  summary: { fontSize: 13, color: colors.textSecondary },

  infoCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 4 },
  infoRow: { flexDirection: 'row', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  infoLabel: { width: 50, fontSize: 13, color: colors.textSecondary },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textPrimary },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  stepTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  stepDesc: { fontSize: 12, color: colors.textSecondary },

  cautionCard: { backgroundColor: '#F7FAFD', borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  cautionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  cautionRow: { flexDirection: 'row', gap: 6 },
  cautionText: { fontSize: 12, lineHeight: 20, color: colors.textSecondary },

  ctaBtn: { height: 52, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  ctaText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
