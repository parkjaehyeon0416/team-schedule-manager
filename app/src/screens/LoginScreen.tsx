import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../store/authStore';
import axiosInstance from '../api/axiosInstance';
import { signInWithGoogle, signInWithKakao } from '../api/socialAuthApi';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, spacing, typography } from '../theme/designTokens';

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
        // 사용자가 로그인 창을 스스로 닫은 경우 — 에러 알림 불필요
        return;
      }
      Alert.alert('로그인 실패', '소셜 로그인 중 오류가 발생했습니다.');
    } finally {
      setSocialLoading(null);
    }
  };

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
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Image
          source={require('../assets/images/logo_icon.png')}
          style={styles.logoImage}
        />
        <Text style={styles.logoText}>WorkMate</Text>
      </View>

      <View style={styles.inputWrap}>
        <Icon name="account-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="아이디 또는 이메일"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputWrap}>
        <Icon name="lock-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!passwordVisible}
        />
        <TouchableOpacity onPress={() => setPasswordVisible(v => !v)} hitSlop={8}>
          <Icon
            name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.keepLoggedInRow}
        onPress={() => setKeepLoggedIn(v => !v)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, keepLoggedIn && styles.checkboxChecked]}>
          {keepLoggedIn && <Icon name="check" size={14} color={colors.surface} />}
        </View>
        <Text style={styles.keepLoggedInText}>로그인 상태 유지</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.buttonText}>로그인</Text>
        )}
      </TouchableOpacity>

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
          style={[styles.socialCircle, styles.kakaoCircle]}
          onPress={() => handleSocialLogin('kakao')}
          disabled={loading || socialLoading !== null}
        >
          {socialLoading === 'kakao' ? (
            <ActivityIndicator color="#3C1E1E" size="small" />
          ) : (
            <Icon name="chat" size={24} color="#3C1E1E" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.socialCircle, styles.googleCircle]}
          onPress={() => handleSocialLogin('google')}
          disabled={loading || socialLoading !== null}
        >
          {socialLoading === 'google' ? (
            <ActivityIndicator color={colors.textPrimary} size="small" />
          ) : (
            <Icon name="google" size={22} color="#EA4335" />
          )}
        </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
    gap: spacing.sm,
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
  },
  logoText: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 52,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
  keepLoggedInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: radius.xs - 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  keepLoggedInText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.surface, fontSize: 17, fontWeight: '700' },
  findRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  findLinkText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  findDivider: {
    color: colors.border,
    marginHorizontal: spacing.md,
  },
  socialDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  socialDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  socialDividerText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginHorizontal: spacing.md,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  socialCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  kakaoCircle: {
    backgroundColor: '#FEE500',
    borderColor: '#FEE500',
  },
  googleCircle: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  registerLink: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  registerLinkText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  registerLinkBold: {
    color: colors.primary,
    fontWeight: '700',
  },
});
