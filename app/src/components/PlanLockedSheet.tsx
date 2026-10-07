/**
 * ★ v18.48 — 무료 한도 안내 시트 (DESIGN-CANVAS PLAN_LOCKED.dc.html)
 *   서버가 403 ERR_PLAN_001을 주면 axios 인터셉터가 띄움. 기능별 그림·제목·설명, 한도가 있으면 사용량 막대와
 *   다시 채워지는 날. [요금제 보기]는 요금제 화면으로.
 */
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import dayjs from 'dayjs';
import { usePlanLockStore, PlanLockInfo } from '../store/planLockStore';
import { navigateFromOutside } from '../navigation/navigationRef';
import { BottomSheet } from './TeamUi';
import { ICONS, IconKey } from '../assets/icons';
import { colors } from '../theme/designTokens';

const PLAN_NAME = { pro: '개인 프로', team: '팀 요금제' };

function copy(info: PlanLockInfo): { icon: IconKey; title: string; desc: string } {
  const plan = PLAN_NAME[info.upgrade_plan] ?? '유료 요금제';
  const L = info.limit;
  switch (info.feature) {
    case 'quote_unlimited':
      return { icon: 'quote', title: `견적서는 무료로 월 ${L}건까지예요`, desc: `이번 달 ${L}건을 모두 썼어요.\n${plan}로 바꾸면 견적서를 제한 없이 만들 수 있어요.` };
    case 'report_unlimited':
      return { icon: 'doc', title: `보고서는 무료로 월 ${L}건까지예요`, desc: `이번 달 ${L}건을 모두 썼어요.\n${plan}로 바꾸면 보고서를 제한 없이 만들 수 있어요.` };
    case 'photo_unlimited':
      return { icon: 'site', title: `사진은 현장마다 무료로 ${L}장까지예요`, desc: `이 현장에 ${L}장을 모두 올렸어요.\n개인 프로나 팀 요금제에서 제한 없이 올릴 수 있어요.` };
    case 'tax_export':
      return { icon: 'tax', title: '세무 자료 내보내기는 개인 프로 기능이에요', desc: '화면에서 보기는 무료로 계속 쓸 수 있어요.\n엑셀 · PDF로 받으려면 개인 프로가 필요해요.' };
    case 'team_unlimited_members':
      return { icon: 'team', title: `무료 팀은 ${L}명까지예요`, desc: `이 팀은 ${L}명이 다 찼어요.\n팀장이 팀 요금제를 쓰면 인원 제한 없이 함께할 수 있어요.` };
    case 'multi_team_lead':
      return { icon: 'team', title: `무료로는 팀을 ${L}개까지 만들 수 있어요`, desc: '여러 팀을 팀장으로 운영하려면\n팀 요금제가 필요해요.' };
    default:
      return { icon: 'team', title: '팀 요금제 기능이에요', desc: info.message || '팀장이 팀 요금제를 쓰면 열려요.' };
  }
}

export default function PlanLockedSheet() {
  const info = usePlanLockStore(s => s.info);
  const hide = usePlanLockStore(s => s.hide);
  if (!info) return null;

  const c = copy(info);
  const hasUsage = info.limit != null && info.used != null;
  const bars = hasUsage ? Math.min(info.limit!, 10) : 0;
  const filled = hasUsage ? Math.round((Math.min(info.used!, info.limit!) / info.limit!) * bars) : 0;

  return (
    <BottomSheet visible onClose={hide} label="무료 한도 안내">
      <View style={styles.body}>
        <View>
          <Image source={ICONS[c.icon]} style={{ width: 76, height: 76 }} resizeMode="contain" />
          <View style={styles.lock}><Icon name="lock" size={14} color="#FFFFFF" /></View>
        </View>
        <Text style={styles.title}>{c.title}</Text>
        <Text style={styles.desc}>{c.desc}</Text>
        {hasUsage && (
          <View style={styles.usage}>
            <View style={styles.usageHead}>
              <Text style={styles.usageLabel}>{info.resets_on ? '이번 달 사용' : '사용'}</Text>
              <Text style={styles.usageValue}>{info.used} / {info.limit}{info.unit ?? ''}</Text>
            </View>
            <View style={styles.barRow}>
              {Array.from({ length: bars }).map((_, i) => (
                <View key={i} style={[styles.bar, { backgroundColor: i < filled ? colors.accent : '#FFE3C2' }]} />
              ))}
            </View>
            {!!info.resets_on && (
              <Text style={styles.reset}>{dayjs(info.resets_on).format('M월 D일')}에 다시 {info.limit}{info.unit ?? ''}이 채워져요</Text>
            )}
          </View>
        )}
        <View style={styles.btns}>
          <Pressable onPress={() => { hide(); navigateFromOutside('Plan'); }}>
            <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.primary}>
              <Text style={styles.primaryText}>요금제 보기</Text>
            </LinearGradient>
          </Pressable>
          <Pressable style={styles.secondary} onPress={hide}>
            <Text style={styles.secondaryText}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: 12, paddingHorizontal: 2 },
  lock: { position: 'absolute', right: -6, bottom: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.textPrimary, borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 4, fontSize: 19, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  desc: { fontSize: 14, lineHeight: 22, color: colors.textSecondary, textAlign: 'center' },
  usage: { width: '100%', gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#FFF8EE' },
  usageHead: { flexDirection: 'row', justifyContent: 'space-between' },
  usageLabel: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  usageValue: { fontSize: 12, fontWeight: '700', color: '#B95E00' },
  barRow: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 8, borderRadius: 4 },
  reset: { fontSize: 11, color: colors.textSecondary },
  btns: { width: '100%', gap: 8, marginTop: 4 },
  primary: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondary: { height: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  secondaryText: { color: '#3B4F70', fontSize: 15, fontWeight: '700' },
});
