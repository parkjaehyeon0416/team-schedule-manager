/**
 * ★ v18.71 — 그라데이션 배경(LinearGradient와 쓰는 법 같음).
 *   react-native-linear-gradient 2.8.3은 새 아키텍처용이 아니라 iOS에서는 호환 계층(legacy interop)으로 그려지는데,
 *   그 계층이 그라데이션 뷰를 padding 안쪽 크기로 놓고 자식은 padding만큼 또 밀어 넣음
 *   → padding 있는 카드·버튼의 글자가 오른쪽·아래로 밀리고 잘림(홈 '이번 달 수입' 금액, 내 명함 카드 — 아이폰 시뮬레이터 점검에서 발견).
 *   iOS에서는 겉은 보통 View(padding·모양·그림자 그대로)로 두고, 그라데이션은 자식 없이 뒤에 꽉 채워 깔아서 피함.
 *   안드로이드는 이 문제가 없어 예전 그대로 그림.
 */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { LinearGradientProps } from 'react-native-linear-gradient';

const RADIUS_KEYS = [
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
] as const;

export default function Gradient(props: LinearGradientProps) {
  if (Platform.OS !== 'ios') return <LinearGradient {...props} />;

  const { colors, start, end, locations, useAngle, angle, angleCenter, style, children, ...viewProps } = props;
  // 뒤에 까는 그라데이션도 카드 모서리를 따라 둥글게
  const flat: ViewStyle = StyleSheet.flatten(style) || {};
  const corners: ViewStyle = {};
  for (const key of RADIUS_KEYS) {
    if (flat[key] != null) corners[key] = flat[key] as number;
  }

  return (
    <View {...viewProps} style={style}>
      <LinearGradient
        colors={colors}
        start={start}
        end={end}
        locations={locations}
        useAngle={useAngle}
        angle={angle}
        angleCenter={angleCenter}
        style={[StyleSheet.absoluteFill, corners]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}
