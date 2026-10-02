import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../store/authStore';
import axiosInstance from '../api/axiosInstance';
import { signInWithGoogle, signInWithKakao } from '../api/socialAuthApi';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, spacing } from '../theme/designTokens';
import GradientButton from '../components/GradientButton';
import { ICONS } from '../assets/icons';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'kakao' | null>(null);

  const handleSocialLogin = async (provider: 'google' | 'kakao') => {
    setSocialLoading(provider);
    try {
      const data =
        provider === 'google' ? await signInWithGoogle() : await signInWithKakao();
      if (data.success) {
        setAuth(data.data.user, data.data.token, keepLoggedIn);
      }
    } catch (error: any) {
      if (error?.code === 'SIGN_IN_CANCELLED' || error?.message?.includes('cancel')) {
        return;
      }
      Alert.alert('로그인 실패', '소셜 로그인 중 오류가 발생했습니다.');
    } finally {
      setSocialLoading(null);
    }
  };

  // 네이버/애플 버튼과 함께 주석 처리(아래 JSX 참고) — 복원 시 이 함수도 같이 복원
  // const handleUnavailableSocial = (name: string) => {
  //   Alert.alert('준비 중', `${name} 로그인은 아직 지원하지 않습니다.`);
  // };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('오류', '아이디(이메일)와 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.post('/auth/login', {
        email,
        password,
        platform: 'mobile',
      });
      if (res.data.success) {
        setAuth(res.data.data.user, res.data.data.token, keepLoggedIn);
      }
    } catch (error: any) {
      const errCode = error.response?.data?.error_code;
      if (errCode === 'ERR_AUTH_001') {
        Alert.alert('로그인 실패', '이메일 또는 비밀번호를 확인해주세요.');
      } else if (errCode === 'ERR_AUTH_008') {
        Alert.alert(
          '접근 불가',
          '운영자 계정은 모바일 앱 이용이 불가합니다.\n웹 관리자에서 로그인해주세요.',
        );
      } else {
        Alert.alert('오류', '네트워크 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.logoWrap}>
        <Image source={ICONS.logo} style={styles.logoImage} />
        <Text style={styles.logoText}>
          Work<Text style={{ color: colors.primaryDark }}>Mate</Text>
        </Text>
      </View>

      <View style={styles.inputWrap}>
        <Icon name="account-outline" size={18} color={colors.muted} />
        <TextInput
          style={styles.input}
          placeholder="아이디 또는 이메일"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputWrap}>
        <Icon name="lock-outline" size={18} color={colors.muted} />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          placeholderTextColor={colors.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!passwordVisible}
        />
        <TouchableOpacity onPress={() => setPasswordVisible(v => !v)} hitSlop={8}>
          <Icon
            name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={colors.muted}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.keepLoggedInRow}
        onPress={() => setKeepLoggedIn(v => !v)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, keepLoggedIn && styles.checkboxChecked]}>
          {keepLoggedIn && <Icon name="check-bold" size={12} color={colors.surface} />}
        </View>
        <Text style={styles.keepLoggedInText}>로그인 상태 유지</Text>
      </TouchableOpacity>

      <GradientButton onPress={handleLogin} loading={loading} style={styles.buttonWrap}>
        로그인
      </GradientButton>

      <View style={styles.findRow}>
        <TouchableOpacity
          onPress={() => navigation.navigate('FindEmail')}
          disabled={loading}
        >
          <Text style={styles.findLinkText}>아이디 찾기</Text>
        </TouchableOpacity>
        <Text style={styles.findDivider}>|</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          disabled={loading}
        >
          <Text style={styles.findLinkText}>비밀번호 찾기</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.socialDivider}>
        <View style={styles.socialDividerLine} />
        <Text style={styles.socialDividerText}>또는 간편 로그인</Text>
        <View style={styles.socialDividerLine} />
      </View>

      <View style={styles.socialRow}>
        <TouchableOpacity
          style={[styles.socialCircle, { backgroundColor: '#FEE500' }]}
          onPress={() => handleSocialLogin('kakao')}
          disabled={loading || socialLoading !== null}
        >
          {socialLoading === 'kakao' ? (
            <ActivityIndicator color="#191600" size="small" />
          ) : (
            <Text style={[styles.socialLetter, { color: '#191600' }]}>K</Text>
          )}
        </TouchableOpacity>

        {/* ★ 2026-10-02: 네이버/애플 로그인은 외부 계정(네이버 개발자센터 앱 등록, Apple
            Sign in with Apple capability) 설정이 선행되어야 연동 가능 — 그 전까지 디자인에서
            제외(주석 처리). 복원 시 이 블록의 주석만 해제하면 됨. */}
        {/*
        <TouchableOpacity
          style={[styles.socialCircle, { backgroundColor: '#03C75A' }]}
          onPress={() => handleUnavailableSocial('네이버')}
          disabled={loading}
        >
          <Text style={[styles.socialLetter, { color: '#FFFFFF' }]}>N</Text>
        </TouchableOpacity>
        */}

        <TouchableOpacity
          style={[styles.socialCircle, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border }]}
          onPress={() => handleSocialLogin('google')}
          disabled={loading || socialLoading !== null}
        >
          {socialLoading === 'google' ? (
            <ActivityIndicator color={colors.textPrimary} size="small" />
          ) : (
            <Text style={[styles.socialLetter, { color: '#1F2937' }]}>G</Text>
          )}
        </TouchableOpacity>

        {/*
        <TouchableOpacity
          style={[styles.socialCircle, { backgroundColor: '#111111' }]}
          onPress={() => handleUnavailableSocial('애플')}
          disabled={loading}
        >
          <Text style={[styles.socialLetter, { color: '#FFFFFF' }]}>A</Text>
        </TouchableOpacity>
        */}
      </View>

      <TouchableOpacity
        style={styles.registerLink}
        onPress={() => navigation.navigate('Register')}
        disabled={loading}
      >
        <Text style={styles.registerLinkText}>
          계정이 없으신가요?{' '}
          <Text style={styles.registerLinkBold}>회원가입</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logoImage: { width: 76, height: 76, resizeMode: 'contain' },
  logoWrap: {
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.xl,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.textPrimary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  keepLoggedInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#C5D5E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  keepLoggedInText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  buttonWrap: {},
  findRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  findLinkText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '600',
  },
  findDivider: {
    color: colors.border,
  },
  socialDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  socialDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  socialDividerText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  socialCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialLetter: { fontSize: 17, fontWeight: '800' },
  registerLink: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  registerLinkText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  registerLinkBold: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
});
