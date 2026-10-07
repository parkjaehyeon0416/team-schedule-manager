// ★ v18.51 — 디자인 AUTH_SIGNUP_DONE: 소셜 가입 완료 → "시작하기"를 눌러야 로그인 상태로 전환(홈)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import GradientButton from '../components/GradientButton';
import { colors } from '../theme/designTokens';

export default function SocialSignupDoneScreen() {
  const { user, token, keepLoggedIn } = useRoute<any>().params;
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 52 }]}>
      <View style={{ height: 64 }} />
      <View style={styles.ring}>
        <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} style={styles.dot}>
          <Icon name="check" size={30} color="#FFFFFF" />
        </LinearGradient>
      </View>
      <Text style={styles.title}>회원가입이 완료되었습니다.</Text>
      <Text style={styles.desc}>이제 일정과 수입을{'\n'}한 곳에서 관리해보세요.</Text>
      <View style={{ height: 24 }} />
      <GradientButton onPress={() => setAuth(user, token, keepLoggedIn)}>시작하기</GradientButton>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24, gap: 12 },
  ring: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#E8F3FF', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  dot: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 12, textAlign: 'center', fontSize: 22, fontWeight: '800', color: '#102A56' },
  desc: { textAlign: 'center', fontSize: 14, lineHeight: 22, color: '#5F7290' },
});
