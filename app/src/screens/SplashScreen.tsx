/**
 * 스플래시 화면 — ★ v18.36 DESIGN-CANVAS 기준, Main.dc.html
 * 앱 시작 시 로그인 상태 복원(restoreAuth)하는 동안 표시. 로고 떠오름 + 테두리 퍼짐 + 점 3개 로딩.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import { ICONS } from '../assets/icons';
import { colors } from '../theme/designTokens';

import { APP_VERSION as VERSION } from '../constants/appVersion';
const APP_VERSION = `v${VERSION}`;

function LoadingDot({ delay }: { delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
        },
      ]}
    />
  );
}

export default function SplashScreen() {
  const rise = useRef(new Animated.Value(0)).current;
  const fadeTitle = useRef(new Animated.Value(0)).current;
  const fadeTagline = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    Animated.timing(fadeTitle, { toValue: 1, duration: 600, delay: 300, useNativeDriver: true }).start();
    Animated.timing(fadeTagline, { toValue: 1, duration: 600, delay: 500, useNativeDriver: true }).start();
    const ringLoop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    ringLoop.start();
    return () => ringLoop.stop();
  }, [rise, fadeTitle, fadeTagline, ring]);

  return (
    <View style={styles.screen}>
      <View style={styles.glow} />
      <View style={styles.logoWrap}>
        <Animated.View
          style={[
            styles.ring,
            {
              opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.35] }) }],
            },
          ]}
        />
        <Animated.View
          style={{
            opacity: rise,
            transform: [
              { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
              { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
            ],
          }}
        >
          <Image source={ICONS.logo} style={styles.logo} />
        </Animated.View>
      </View>
      <Animated.Text style={[styles.brand, { opacity: fadeTitle }]}>
        Work<Text style={{ color: colors.primaryDark }}>Mate</Text>
      </Animated.Text>
      <Animated.Text style={[styles.tagline, { opacity: fadeTagline }]}>현장의 하루를 한 곳에서</Animated.Text>

      <View style={styles.dots} accessibilityRole="progressbar" accessibilityLabel="불러오는 중">
        <LoadingDot delay={0} />
        <LoadingDot delay={160} />
        <LoadingDot delay={320} />
      </View>
      <Text style={styles.version}>{APP_VERSION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  // 디자인의 radial-gradient(#EAF4FF → 투명) 대체 — RN엔 원형 그라데이션이 없어 옅은 원으로 표현
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#EAF4FF', opacity: 0.4, marginTop: -60 },
  logoWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginTop: -60 },
  ring: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 32, borderWidth: 2, borderColor: '#9CCBFF' },
  logo: { width: 140, height: 141, resizeMode: 'contain' },
  brand: { marginTop: 26, fontSize: 34, fontWeight: '800', letterSpacing: -0.4, color: colors.textPrimary },
  tagline: { marginTop: 10, fontSize: 15, color: colors.textSecondary },
  dots: { position: 'absolute', bottom: 120, flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#168BFF' },
  version: { position: 'absolute', bottom: 48, fontSize: 12, color: '#8FA3BF' },
});
