// ★ v18.51 — 디자인 AUTH_LOGIN: 카카오·구글 버튼을 위로, 이메일 로그인은 아래.
//   연결된 계정이 없는 소셜 로그인이면 바로 가입시키지 않고 SocialFirstLogin("처음이신가요?")으로.
import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, Image, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import axiosInstance from '../api/axiosInstance';
import { socialLogin, isSocialCancel, SocialProvider } from '../api/socialAuthApi';
import { colors } from '../theme/designTokens';
import GradientButton from '../components/GradientButton';
import { SocialButton, OrDivider, AuthInput, FindLinks } from '../components/AuthUi';
import { ICONS } from '../assets/icons';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const pwRef = useRef<TextInput>(null); // ★ v18.54 이메일 칸 "다음" → 비밀번호 칸(아이폰 키보드가 비밀번호 칸을 가려서)
  const [password, setPassword] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);

  const handleSocialLogin = async (provider: SocialProvider) => {
    setSocialLoading(provider);
    try {
      const data = await socialLogin(provider);
      if (data.data?.needs_signup) {
        navigation.navigate('SocialFirstLogin', {
          provider,
          display: data.data.social.display,
          ticket: data.data.link_ticket,
          keepLoggedIn,
        });
      } else if (data.success) {
        setAuth(data.data.user, data.data.token, keepLoggedIn);
      }
    } catch (error: any) {
      if (isSocialCancel(error)) return;
      Alert.alert('로그인 실패', error?.response?.data?.message ?? '소셜 로그인 중 오류가 발생했습니다.');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.post('/auth/login', { email, password, platform: 'mobile' });
      if (res.data.success) {
        setAuth(res.data.data.user, res.data.data.token, keepLoggedIn);
      }
    } catch (error: any) {
      const errCode = error.response?.data?.error_code;
      if (errCode === 'ERR_AUTH_001') {
        Alert.alert('로그인 실패', '이메일 또는 비밀번호를 확인해주세요.');
      } else if (errCode === 'ERR_AUTH_008') {
        Alert.alert('접근 불가', '운영자 계정은 모바일 앱 이용이 불가합니다.\n웹 관리자에서 로그인해주세요.');
      } else {
        Alert.alert('오류', error.response?.data?.message ?? '네트워크 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || socialLoading !== null;

  return (
    <ScrollView automaticallyAdjustKeyboardInsets
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingTop: insets.top }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.brand}>
        <Image source={ICONS.logo} style={styles.logo} />
        <Text style={styles.logoText}>
          Work<Text style={{ color: colors.primaryDark }}>Mate</Text>
        </Text>
        <Text style={styles.tagline}>일하는 사람들의 더 나은 내일을 위해</Text>
      </View>

      <View style={styles.socialCol}>
        <SocialButton provider="kakao" onPress={() => handleSocialLogin('kakao')} loading={socialLoading === 'kakao'} disabled={busy} />
        <SocialButton provider="google" onPress={() => handleSocialLogin('google')} loading={socialLoading === 'google'} disabled={busy} />
      </View>

      <OrDivider />

      <AuthInput icon="email-outline" placeholder="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" accessibilityLabel="이메일" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => pwRef.current?.focus()} />
      <AuthInput ref={pwRef} icon="lock-outline" placeholder="비밀번호" value={password} onChangeText={setPassword} secure accessibilityLabel="비밀번호" returnKeyType="done" onSubmitEditing={handleLogin} />

      <Pressable style={styles.keepRow} onPress={() => setKeepLoggedIn(v => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: keepLoggedIn }}>
        <View style={[styles.checkbox, keepLoggedIn && styles.checkboxOn]}>
          {keepLoggedIn && <Icon name="check-bold" size={12} color="#FFFFFF" />}
        </View>
        <Text style={styles.keepText}>로그인 상태 유지</Text>
      </Pressable>

      <GradientButton onPress={handleLogin} loading={loading} disabled={socialLoading !== null}>
        로그인
      </GradientButton>

      <FindLinks
        onFindId={() => navigation.navigate('FindEmail')}
        onFindPw={() => navigation.navigate('ForgotPassword')}
        onSignup={() => navigation.navigate('Register')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 28, gap: 12 },
  brand: { alignItems: 'center', gap: 12, paddingTop: 28, paddingBottom: 14 },
  logo: { width: 76, height: 76, resizeMode: 'contain' },
  logoText: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4, color: colors.textPrimary },
  tagline: { fontSize: 14, color: '#5F7290' },
  socialCol: { gap: 10 },
  keepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  checkbox: {
    width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, borderColor: '#C5D5E8',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  keepText: { fontSize: 13, color: '#5F7290' },
});
