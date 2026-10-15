/**
 * ★ v18.69 — 선택 업데이트 안내 시트 (DESIGN-CANVAS APP_UPDATE_OPTIONAL.dc.html)
 *   최신 버전이 나왔지만 지금 버전도 쓸 수 있을 때 홈 위에 뜨는 아래 시트.
 *   - 앱 아이콘(56, 위쪽 화살표 배지) + "새 버전이 나왔어요" + "1.0.0 → 1.1.0"(새 버전은 굵은 파랑)
 *   - "바뀐 점" 칸: 서버 안내 문구(APP_UPDATE_MESSAGE를 "|"로 나눈 notes) 앞 3줄을 체크 표시로. 없으면 칸째 숨김
 *   - [나중에](1) / [업데이트](2). 어두운 바깥·안드로이드 뒤로 가기·iOS VoiceOver 문지르기 = [나중에]
 *   - 닫은 뒤 앱 어두운 토스트: 나중에 → "다음에 앱을 열 때 다시 알려 드릴게요"
 *     (이번 실행 동안만 숨김 — 앱을 새로 켜거나 30분 넘게 뒤에 있다 돌아오면 다시 뜸, utils/appUpdate),
 *     업데이트 → "스토어로 이동해요" / APK 설치면 "새 파일을 받아요"
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, Modal, StyleSheet, Platform, AccessibilityInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from './Gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ICONS } from '../assets/icons';
import { colors } from '../theme/designTokens';
import type { UpdateChannel } from '../utils/appUpdate';
import ModalBottomSafeArea, { MODAL_UNDER_SYSTEM_BARS } from './ModalBottomSafeArea';

const MAX_LINES = 3; // 디자인: 서버 안내 문구 최대 3줄
const TOAST_MS = 2500;
// 토스트 높이 — 디자인은 하단 탭(78) 위 18 = bottom 96. 앱 탭 높이는 68 + 아래 안전 영역(BottomTabNavigator)이라 86 + 안전 영역
const TOAST_ABOVE_TAB = 86;

export interface AppUpdateSheetProps {
  visible: boolean;
  currentVersion: string | null;
  latestVersion: string | null;
  notes?: string[]; // 서버 안내 줄 목록(APP_UPDATE_MESSAGE) — 앞 3줄만, 없으면 "바뀐 점" 칸 숨김
  channel: UpdateChannel; // 토스트 문구용 — 'store' = 스토어로 이동, 'apk' = 새 파일 받기
  onUpdate: () => void;
  onLater: () => void;
}

export default function AppUpdateSheet({ visible, currentVersion, latestVersion, notes, channel, onUpdate, onLater }: AppUpdateSheetProps) {
  const insets = useSafeAreaInsets();
  const lines = (notes ?? []).slice(0, MAX_LINES);

  // 닫은 뒤 토스트
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), TOAST_MS);
    // accessibilityLiveRegion은 Android 전용 → iOS VoiceOver는 직접 읽어 줌
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(msg);
  };
  const hideToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast('');
  };

  // 버튼 두 번 누르기·바깥+뒤로 가기 겹침 방지 — 시트가 새로 뜰 때마다 풀림
  const handled = useRef(false);
  useEffect(() => {
    if (visible) handled.current = false;
  }, [visible]);

  const later = () => {
    if (handled.current) return;
    handled.current = true;
    onLater();
    showToast('다음에 앱을 열 때 다시 알려 드릴게요');
  };
  const update = () => {
    if (handled.current) return;
    handled.current = true;
    onUpdate();
    showToast(channel === 'apk' ? '새 파일을 받아요' : '스토어로 이동해요');
  };

  return (
    <>
      {/* ★ v18.70 QA — 어두운 배경이 기기 상단·하단 바 뒤까지 덮게(MODAL_UNDER_SYSTEM_BARS) */}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={later} {...MODAL_UNDER_SYSTEM_BARS}>
        <View style={styles.wrap}>
          <Pressable style={styles.backdrop} onPress={later} accessibilityRole="button" accessibilityLabel="나중에" />
          {/* 닫기 = [나중에] · 바깥 누르기 · 뒤로 가기(onRequestClose) · iOS VoiceOver 문지르기(onAccessibilityEscape, ReauthSheet와 같게)
              ★ v18.70 — 흰 판 아래 여백 = 30 + 기기 하단 바와 겹치는 높이(ModalBottomSafeArea) */}
          <ModalBottomSafeArea style={styles.sheet} accessibilityViewIsModal accessibilityLabel="새 버전 안내" onAccessibilityEscape={later}>
            <View style={styles.grabber} />

            <View style={styles.head}>
              <View>
                <View style={iconShadow}>
                  <Image source={ICONS.logo} style={styles.icon} resizeMode="contain" accessibilityLabel="현장메이트" />
                </View>
                <View style={styles.badge}>
                  <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.badgeFill}>
                    <Icon name="arrow-up" size={13} color="#FFFFFF" />
                  </LinearGradient>
                </View>
              </View>
              <View style={styles.headText}>
                <Text style={styles.title} accessibilityRole="header">새 버전이 나왔어요</Text>
                {!!latestVersion && (
                  <Text style={styles.version}>
                    {currentVersion ? `${currentVersion} → ` : ''}
                    <Text style={styles.versionNew}>{latestVersion}</Text>
                  </Text>
                )}
              </View>
            </View>

            {lines.length > 0 && (
              <View style={styles.noteCard}>
                <Text style={styles.noteHead}>바뀐 점</Text>
                {lines.map((l, i) => (
                  <View key={i} style={styles.noteLine}>
                    <Icon name="check" size={16} color={colors.primary} style={styles.noteCheck} />
                    <Text style={styles.noteText}>{l}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.btns}>
              <Pressable style={({ pressed }) => [styles.laterBtn, pressed && styles.pressed]} onPress={later} accessibilityRole="button">
                <Text style={styles.laterText}>나중에</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.updateShadow, pressed && styles.pressed]} onPress={update} accessibilityRole="button">
                <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.updateBtn}>
                  <Text style={styles.updateText}>업데이트</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </ModalBottomSafeArea>
        </View>
      </Modal>

      {!!toast && (
        <Pressable
          onPress={hideToast}
          style={[styles.toast, { bottom: TOAST_ABOVE_TAB + insets.bottom }]}
          accessibilityRole="text"
          accessibilityHint="눌러서 닫기"
          accessibilityLiveRegion="polite"
        >
          <Icon name="information-outline" size={16} color="#FFFFFF" />
          <Text style={styles.toastText}>{toast}</Text>
        </Pressable>
      )}
    </>
  );
}

// 아이콘 그림자(디자인 filter: drop-shadow 두 겹) — 안드로이드는 같은 filter(12 이상), 아이폰은 그림자 속성. filter는 View에만 되므로 감싸서 씀
const iconShadow = Platform.select<object>({
  android: { filter: 'drop-shadow(0px 10px 20px rgba(10,108,224,0.18)) drop-shadow(0px 1px 1.5px rgba(16,42,86,0.10))' },
  default: { shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 10 },
});

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(16,42,86,0.45)' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 10, paddingHorizontal: 22, paddingBottom: 30, gap: 16,
    shadowColor: colors.textPrimary, shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 12,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#D5DFEB' },

  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 56, height: 56 },
  badge: { position: 'absolute', right: -4, bottom: -4, width: 24, height: 24, borderRadius: 12, padding: 2.5, backgroundColor: '#FFFFFF' },
  badgeFill: { flex: 1, borderRadius: 9.5, alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1, gap: 4 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, color: colors.textPrimary },
  version: { fontSize: 13, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  versionNew: { fontWeight: '700', color: colors.primaryDark },

  noteCard: { gap: 10, padding: 16, borderRadius: 14, backgroundColor: colors.background }, // #F7FBFF
  noteHead: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  noteLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteCheck: { marginTop: 3 },
  noteText: { flex: 1, fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.textPrimary },

  btns: { flexDirection: 'row', gap: 10 },
  laterBtn: {
    flex: 1, height: 54, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  laterText: { color: '#3B4F70', fontSize: 16, fontWeight: '700' },
  updateShadow: {
    flex: 2, borderRadius: 14, backgroundColor: colors.primaryDark,
    shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 7, elevation: 4,
  },
  updateBtn: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  updateText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.85 },

  toast: {
    position: 'absolute', left: 16, right: 16, zIndex: 25, paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: 12, backgroundColor: 'rgba(16,42,86,0.94)', flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  toastText: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
