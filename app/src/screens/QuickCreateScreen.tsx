/**
 * 빠른 등록 바텀시트 — DESIGN-CANVAS 기준, QUICK_CREATE.dc.html
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/designTokens';
import { ICONS } from '../assets/icons';
import type { IconKey } from '../assets/icons';

const SHEET_BOTTOM = 34; // 디자인 흰 판 아래 여백(+ 기기 하단 바 높이, ★ v18.70)

// ★ v18.36 — 디자인의 3D 아이콘(이미지)으로 교체
const ACTIONS: Array<{
  image: IconKey;
  title: string;
  subtitle: string;
  route: string;
}> = [
  { image: 'schedule', title: '일정 등록', subtitle: '개인 또는 팀 일정을 추가해요', route: 'ScheduleCreate' },
  { image: 'site', title: '현장 등록', subtitle: '새 현장 정보를 등록해요', route: 'SiteCreate' },
  { image: 'quote', title: '견적서 작성', subtitle: '고객에게 보낼 견적서를 만들어요', route: 'QuoteCreate' },
  { image: 'team', title: '팀 만들기', subtitle: '함께 일할 팀을 만들어요', route: 'TeamCreate' },
];

export default function QuickCreateScreen() {
  const navigation = useNavigation<any>();
  // ★ v18.70 — 기기 하단 바(안드로이드 뒤로·홈·최근 / 제스처 바)가 다시 보이므로 흰 판 아래 여백에 바 높이를 더함.
  //   어두운 배경은 바 뒤까지 덮어야 해서 스택 공통 화면 틀의 아래 여백은 빼고(AppNavigator SELF_INSET) 여기서 직접 올림
  const insets = useSafeAreaInsets();

  const close = () => navigation.goBack();
  const go = (route: string) => {
    navigation.goBack();
    navigation.navigate(route);
  };

  return (
    <View style={styles.screen}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      <View style={[styles.sheet, { paddingBottom: SHEET_BOTTOM + insets.bottom }]}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>무엇을 등록할까요?</Text>
          <Pressable onPress={close} style={styles.closeBtn} hitSlop={8}>
            <Icon name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
        {ACTIONS.map((a, i) => (
          <Pressable
            key={a.route}
            style={[styles.row, i === ACTIONS.length - 1 && styles.rowLast]}
            onPress={() => go(a.route)}
          >
            <View style={styles.iconBox}>
              <Image source={ICONS[a.image]} style={styles.iconImage} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.rowTitle}>{a.title}</Text>
              <Text style={styles.rowSubtitle}>{a.subtitle}</Text>
            </View>
            <Icon name="chevron-right" size={18} color="#8FA3BF" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,42,86,0.45)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: SHEET_BOTTOM,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#D5DFEB', marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  closeBtn: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderCard,
  },
  rowLast: { borderBottomWidth: 0 },
  iconBox: { width: 46, height: 46, borderRadius: 13, backgroundColor: '#F2F7FE', alignItems: 'center', justifyContent: 'center' },
  iconImage: { width: 34, height: 34, resizeMode: 'contain' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  rowSubtitle: { fontSize: 12, color: colors.textSecondary },
});
