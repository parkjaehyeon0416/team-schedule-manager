import React from 'react';
import { TouchableOpacity, ActivityIndicator, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, radius } from '../theme/designTokens';

interface Props {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: string;
  style?: StyleProp<ViewStyle>;
  height?: number;
}

// ★ v18.32 — 디자인 캔버스의 버튼 그라데이션(linear-gradient(180deg,#2492FF,#0A6CE0))을
//   react-native-linear-gradient로 재현. 이전엔 네이티브 그라데이션 라이브러리가
//   없어 단색(primaryDark)으로 근사했었음.
export default function GradientButton({ onPress, disabled, loading, children, style, height = 52 }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={disabled || loading} style={style}>
      <LinearGradient
        colors={[colors.primaryLight, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.btn, { height, opacity: disabled ? 0.6 : 1 }]}
      >
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.text}>{children}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 4,
  },
  text: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
