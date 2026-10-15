/**
 * ★ v18.69 — 강제 업데이트 화면 (DESIGN-CANVAS APP_UPDATE_REQUIRED.dc.html / APP_UPDATE_REQUIRED_APK.dc.html)
 *   서버 최소 버전보다 낮은 앱이면 App.tsx(AppBody)가 앱 화면 대신 이 화면만 그림(Modal 아님). 뒤로 가기 = 앱 나가기.
 *   - 앱 아이콘(148 원형 배경 + 파란 위쪽 화살표 배지), "업데이트가 필요해요", 안내 글
 *   - "이번 업데이트" 칸: 서버 안내 문구(APP_UPDATE_MESSAGE를 "|"로 나눈 notes) 앞 2줄을 체크 표시로. 없으면 칸째 숨김
 *   - "현재 버전 x · 최신 버전 y"
 *   - 아래 버튼: 스토어 설치(플레이·앱스토어) = [업데이트하기], 홈페이지 APK 설치 = 안내 글 + [⤓ 새 버전 받기]
 *     누르면 주소를 여는 동안 돌아가는 표시 + "스토어로 이동 중…" / "새 파일 받는 중…" → 앱으로 돌아오거나 1.5초 뒤 원래대로
 *   - 맨 아래 문의 메일(누르면 메일 앱)
 *   ★ v18.69 — 화면 전체를 ScrollView로 감쌈: 작은 폰(360×740)·큰 글씨 설정이면 APK 모양 + 안내 2줄이 화면보다 길어
 *     가운데 내용이 위로 넘치고 아래 안내·버튼 밑으로 깔렸음. 내용이 들어가면 지금처럼 가운데, 넘치면 스크롤
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Linking, Pressable, ActivityIndicator, AppState, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from '../components/Gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ICONS } from '../assets/icons';
import { colors } from '../theme/designTokens';
import type { UpdateChannel } from '../utils/appUpdate';

const SUPPORT_EMAIL = 'workmatekr@gmail.com';
const MAX_LINES = 2; // 디자인: 서버 안내 문구 최대 2줄
const BUSY_MS = 1500; // 디자인 스크립트: 누른 뒤 1.5초 지나면 버튼 원래대로(앱으로 돌아와도 바로 원래대로)

export interface AppUpdateRequiredScreenProps {
  currentVersion: string | null;
  latestVersion: string | null;
  notes?: string[]; // 서버 안내 줄 목록(APP_UPDATE_MESSAGE) — 앞 2줄만, 없으면 "이번 업데이트" 칸 숨김
  channel: UpdateChannel; // 'store' = 스토어로 이동, 'apk' = 홈페이지에서 새 APK 받기
  onUpdate: () => void | Promise<void>;
}

export default function AppUpdateRequiredScreen({ currentVersion, latestVersion, notes, channel, onUpdate }: AppUpdateRequiredScreenProps) {
  const apk = channel === 'apk';
  const lines = (notes ?? []).slice(0, MAX_LINES);
  const versions = [
    currentVersion && `현재 버전 ${currentVersion}`,
    latestVersion && `최신 버전 ${latestVersion}`,
  ].filter(Boolean).join(' · ');

  // 주소를 여는 동안 버튼에 돌아가는 표시 — 스토어·브라우저로 나갔다가 앱으로 돌아오면, 아니면 1.5초 뒤 원래대로
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  useEffect(() => {
    if (!busy) return;
    let leftApp = false;
    const timer = setTimeout(() => setBusy(false), BUSY_MS);
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active') leftApp = true;
      else if (leftApp) setBusy(false);
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [busy]);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  const go = () => {
    if (busyRef.current) return; // 여는 중엔 다시 안 누름(두 번 열기 방지)
    busyRef.current = true;
    setBusy(true);
    Promise.resolve(onUpdate()).catch(() => {});
  };

  const label = busy ? (apk ? '새 파일 받는 중…' : '스토어로 이동 중…') : (apk ? '새 버전 받기' : '업데이트하기');

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* 내용 칸 = 화면 높이 이상(flexGrow) → 남는 높이는 가운데 칸(center)이 차지해 세로 가운데, 모자라면 스크롤 */}
      <ScrollView contentContainerStyle={styles.main} bounces={false} overScrollMode="never">
        <View style={styles.center}>
          {/* 앱 아이콘 — 148 원형(가운데 살짝 위가 밝은 원형 그라데이션) + 바깥 14px 옅은 파란 테 + 오른쪽 아래 위쪽 화살표 배지 */}
          <View style={styles.hero}>
            <View style={styles.heroRing} />
            <View style={styles.heroCircle}>
              <View style={iconShadow}>
                <Image source={ICONS.logo} style={styles.heroIcon} resizeMode="contain" accessibilityLabel="현장메이트" />
              </View>
            </View>
            <View style={styles.heroBadge}>
              <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.heroBadgeFill}>
                <Icon name="arrow-up" size={24} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </View>

          <Text style={styles.title} accessibilityRole="header">업데이트가 필요해요</Text>
          <Text style={styles.body}>더 안전하고 편리하게 쓰실 수 있도록{'\n'}최신 버전으로 업데이트해 주세요.</Text>

          {lines.length > 0 && (
            <View style={styles.noteCard}>
              <Text style={styles.noteHead}>이번 업데이트</Text>
              {lines.map((l, i) => (
                <View key={i} style={styles.noteLine}>
                  <Icon name="check" size={16} color={colors.primary} style={styles.noteCheck} />
                  <Text style={styles.noteText}>{l}</Text>
                </View>
              ))}
            </View>
          )}

          {!!versions && <Text style={styles.versions}>{versions}</Text>}
        </View>

        <View style={styles.bottom}>
          {apk && (
            <View style={styles.apkInfo}>
              <Text style={styles.apkTitle}>홈페이지에서 새 파일을 받아 설치해요</Text>
              <Text style={styles.apkDesc}>
                설치할 때 "출처를 알 수 없는 앱" 허용을 물어보면 허용을 눌러 주세요.{'\n'}지금까지의 일정 · 수입 기록은 그대로 남아요.
              </Text>
            </View>
          )}

          <Pressable
            onPress={go}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ busy }}
            style={({ pressed }) => [styles.btnShadow, pressed && !busy && styles.pressed]}
          >
            <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.btn}>
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                apk && <Icon name="download" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.btnText}>{label}</Text>
            </LinearGradient>
          </Pressable>

          <Text style={styles.help}>
            문제가 있으면{' '}
            <Text style={styles.helpLink} accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}>
              {SUPPORT_EMAIL}
            </Text>
            {' '}으로 알려 주세요.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// 아이콘 그림자(디자인 filter: drop-shadow(0 10px 20px rgba(10,108,224,0.18)) drop-shadow(0 1px 1.5px rgba(16,42,86,0.10)))
//   안드로이드는 같은 filter(안드로이드 12 이상에서만 그려지고 그 아래는 그림자 없이), 아이폰은 그림자 속성(그림 모양 따라 그려짐)
//   filter는 View에만 되므로 Image를 View로 감싸서 씀
const iconShadow = Platform.select<object>({
  android: { filter: 'drop-shadow(0px 10px 20px rgba(10,108,224,0.18)) drop-shadow(0px 1px 1.5px rgba(16,42,86,0.10))' },
  default: { shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 10 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, // #F7FBFF
  main: { flexGrow: 1, paddingTop: 12, paddingHorizontal: 24, paddingBottom: 28, gap: 16 }, // ScrollView 내용 칸
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingTop: 12 },

  hero: { width: 148, height: 148 },
  heroRing: { position: 'absolute', top: -14, left: -14, width: 176, height: 176, borderRadius: 88, backgroundColor: 'rgba(36,146,255,0.07)' },
  heroCircle: {
    width: 148, height: 148, borderRadius: 74, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EAF4FF',
    experimental_backgroundImage: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #EAF4FF 70%)',
  },
  heroIcon: { width: 92, height: 92 },
  heroBadge: {
    position: 'absolute', right: 8, bottom: 8, width: 46, height: 46, borderRadius: 23, padding: 4, backgroundColor: '#FFFFFF',
    shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 7, elevation: 5,
  },
  heroBadgeFill: { flex: 1, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  title: { marginTop: 10, fontSize: 26, fontWeight: '800', letterSpacing: -0.4, color: colors.textPrimary, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 25, color: colors.textSecondary, textAlign: 'center' },

  noteCard: {
    alignSelf: 'stretch', paddingVertical: 16, paddingHorizontal: 18, borderRadius: 14, gap: 8,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCEBFB',
  },
  noteHead: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  noteLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteCheck: { marginTop: 3 },
  noteText: { flex: 1, fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.textPrimary },

  versions: { fontSize: 12, color: colors.muted, fontVariant: ['tabular-nums'], textAlign: 'center' },

  bottom: { gap: 12 },
  apkInfo: { gap: 4, alignItems: 'center' },
  apkTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  apkDesc: { fontSize: 12, lineHeight: 18, color: colors.textSecondary, textAlign: 'center' },

  btnShadow: {
    borderRadius: 14, backgroundColor: colors.primaryDark,
    shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 9, elevation: 5,
  },
  pressed: { opacity: 0.85 },
  btn: { height: 58, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },

  help: { marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' },
  helpLink: { color: colors.textSecondary, fontWeight: '600', textDecorationLine: 'underline' },
});
