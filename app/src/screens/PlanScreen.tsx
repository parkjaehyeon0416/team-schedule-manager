/**
 * 요금제 — DESIGN-CANVAS 기준, PLAN.dc.html (★ v18.48)
 * 출시 기념 무료 배너, 월/연 결제 탭, 무료 · 개인 프로 · 팀 · 팀+프로 카드(현재 내 요금제 표시).
 * 결제(앱스토어 구독)는 사업자 등록 후 열려서 지금은 "오픈 예정"(v18.53 무료 기간 종료일 없음). 내정보 "요금제", 잠금 안내 시트에서 진입.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import dayjs from 'dayjs';
import AppHeader from '../components/AppHeader';
import { getPlans } from '../api/planApi';
import type { PlanInfo, PlanItem } from '../api/planApi';
import { SegTabs, InfoNote } from '../components/TeamUi';
import { colors, spacing } from '../theme/designTokens';
import { ICONS } from '../assets/icons';

export default function PlanScreen() {
  const [info, setInfo] = useState<PlanInfo | null>(null);
  const [yearly, setYearly] = useState(false);

  useEffect(() => { getPlans().then(setInfo).catch(() => setInfo(null)); }, []);

  if (!info) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="요금제" />
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  const L = info.free_limits;
  const freeUntil = info.me.launch_free_until ? dayjs(info.me.launch_free_until).subtract(1, 'day') : null;
  // ★ v18.53 — 결제 준비 전까지 종료일 없이 무료
  const freeNow = !!freeUntil || !!info.me.launch_free;
  const card: Record<PlanItem['key'], { desc: string; features: string[] }> = {
    free: { desc: '혼자 일정 · 수입을 정리할 때', features: ['개인 일정 · 수입 기록', `견적서 월 ${L.quotes_per_month}건`, `현장 사진 현장당 ${L.photos_per_site}장`, '팀 참여 (팀원으로)'] },
    pro: { desc: '견적서 · 세무 자료를 많이 쓸 때', features: ['무료 기능 전부', '견적서 무제한', '현장 사진 무제한', '세무 자료 엑셀 내보내기'] },
    team: { desc: '팀장으로 팀을 꾸릴 때', features: ['팀 만들기 · 팀원 초대', '팀 공지 · 현장 앨범', '팀원 정산표', '근태 현황'] },
    team_pro: { desc: '팀 운영과 개인 기능 모두', features: ['팀 기능 전부', '개인 프로 기능 전부', '팀원 수 제한 없음'] },
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="요금제" />
      <ScrollView contentContainerStyle={styles.content}>
        {freeNow && (
          <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.banner}>
            <Image source={ICONS.gift} style={{ width: 56, height: 56 }} resizeMode="contain" />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.bannerTag}>출시 기념</Text>
              <Text style={styles.bannerTitle}>{freeUntil ? `${freeUntil.format('YYYY년 M월 D일')}까지` : '유료 전환 전까지'}{'\n'}모든 기능 전부 무료</Text>
              <Text style={styles.bannerSub}>지금은 결제 없이 팀 · 프로 기능을 모두 쓸 수 있어요</Text>
            </View>
          </LinearGradient>
        )}

        <SegTabs items={['월 결제', '연 결제']} active={yearly ? 1 : 0} onPick={i => setYearly(i === 1)} />

        {info.plans.map(p => {
          const mine = p.key === info.me.plan;
          const c = card[p.key];
          const discount = p.monthly > 0 ? Math.round((1 - p.yearly / (p.monthly * 12)) * 100) : 0;
          return (
            <View key={p.key} style={[styles.card, mine ? styles.cardMine : null]}>
              <View style={styles.cardHead}>
                <View style={{ gap: 2, flex: 1 }}>
                  <Text style={styles.planName}>{p.name}</Text>
                  <Text style={styles.planDesc}>{c.desc}</Text>
                </View>
                {mine && <View style={styles.mineTag}><Text style={styles.mineTagText}>현재 내 요금제</Text></View>}
              </View>
              <View style={styles.priceRow}>
                {p.monthly === 0 ? (
                  <Text style={styles.price}>0원</Text>
                ) : yearly ? (
                  <>
                    <Text style={styles.price}>{p.yearly.toLocaleString('ko-KR')}원</Text>
                    <Text style={styles.per}> / 년 · {discount}% 할인</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.price}>{p.monthly.toLocaleString('ko-KR')}원</Text>
                    <Text style={styles.per}> / 월</Text>
                  </>
                )}
              </View>
              <View style={{ gap: 6 }}>
                {c.features.map(f => (
                  <View key={f} style={styles.feat}>
                    <Icon name="check" size={15} color={colors.primaryDark} style={{ marginTop: 2 }} />
                    <Text style={styles.featText}>{f}</Text>
                  </View>
                ))}
              </View>
              {mine ? (
                <View style={styles.usingBtn}><Text style={styles.usingText}>지금 쓰고 있어요</Text></View>
              ) : p.monthly > 0 ? (
                <View style={styles.soonBtn} accessibilityState={{ disabled: true }}>
                  <Icon name="clock-outline" size={16} color="#6B7E9C" />
                  <Text style={styles.soonText}>오픈 예정</Text>
                </View>
              ) : null}
            </View>
          );
        })}

        <InfoNote>결제 기능은 준비 중이에요. 무료 기간이 끝나기 전에 앱 알림으로 먼저 안내드릴게요.</InfoNote>
        <Text style={styles.footnote}>가격 · 기능 구성은 출시 전 바뀔 수 있어요.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: spacing.xl, gap: 12 },
  banner: { borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 4, shadowColor: '#0A6CE0', shadowOpacity: 0.22, shadowRadius: 22 },
  bannerTag: { fontSize: 12, fontWeight: '700', color: '#FFE2B8' },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', lineHeight: 22 },
  bannerSub: { fontSize: 12, color: '#FFFFFF', opacity: 0.9 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, gap: 12, borderWidth: 1, borderColor: '#E6F0FA', shadowColor: '#102A56', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1 },
  cardMine: { borderWidth: 2, borderColor: colors.primary },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  planName: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  planDesc: { fontSize: 12, color: colors.textSecondary },
  mineTag: { height: 24, paddingHorizontal: 9, borderRadius: 7, backgroundColor: colors.primaryDark, justifyContent: 'center' },
  mineTagText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  price: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  per: { fontSize: 12, color: colors.textSecondary },
  feat: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  featText: { fontSize: 13, lineHeight: 19.5, color: colors.textPrimary },
  usingBtn: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFB', backgroundColor: '#F3F9FF', alignItems: 'center', justifyContent: 'center' },
  usingText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  soonBtn: { height: 46, borderRadius: 12, backgroundColor: '#EEF2F7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  soonText: { fontSize: 14, fontWeight: '700', color: '#6B7E9C' },
  footnote: { fontSize: 11, color: colors.textSecondary, lineHeight: 17.6, textAlign: 'center' },
});
