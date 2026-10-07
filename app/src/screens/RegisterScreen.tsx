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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../store/authStore';
import axiosInstance from '../api/axiosInstance';
import { useNavigation } from '@react-navigation/native';
import { formatPhoneInput, stripPhoneFormatting } from '../utils/phone';
import AppHeader from '../components/AppHeader';
import { colors, radius, spacing } from '../theme/designTokens';
import GradientButton from '../components/GradientButton';

// ★ v18.15 — 서버 validation 에러(errors 객체)의 필드명+영문 메시지를
//   한국어로 번역해서 "어느 항목이 왜 문제인지" 바로 보이게 함.
const FIELD_LABELS: Record<string, string> = {
  name: '이름',
  email: '이메일',
  phone: '전화번호',
  password: '비밀번호',
  password_confirmation: '비밀번호 확인',
  agree_terms: '약관 동의',
};

function translateFieldError(field: string, rawMessage: string): string {
  const label = FIELD_LABELS[field] ?? field;
  if (rawMessage.includes('already been taken')) return `이미 사용 중인 ${label}입니다.`;
  if (rawMessage.includes('field is required')) return `${label}을(를) 입력해주세요.`;
  if (rawMessage.includes('must be a valid email')) return '올바른 이메일 형식이 아닙니다.';
  if (rawMessage.includes('must be at least')) return `${label}이(가) 너무 짧습니다.`;
  if (rawMessage.includes('confirmation does not match')) return '비밀번호가 일치하지 않습니다.';
  return `${label}: ${rawMessage}`;
}

// ★ 가입 시점엔 '팀 없는 개인'으로 시작 — 팀 소속 여부는 회원가입 후
//   팀을 만들거나(TeamScreen) 초대코드로 가입하면 그때 바뀌는 상태값이라
//   여기서 미리 고를 필요가 없음.
export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { setAuth } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !phone || !password || !passwordConfirm) {
      Alert.alert('오류', '모든 항목을 입력해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!agreeTerms) {
      Alert.alert('오류', '이용약관 및 개인정보 처리방침에 동의해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.post('/auth/register', {
        name,
        email,
        phone: stripPhoneFormatting(phone),
        password,
        password_confirmation: passwordConfirm,
        platform: 'mobile',
        agree_terms: true,
      });
      if (res.data.success) {
        await setAuth(res.data.data.user, res.data.data.token);
      }
    } catch (error: any) {
      const errors = error.response?.data?.errors as Record<string, string[]> | undefined;
      const message = error.response?.data?.message;
      const firstFieldKey = errors ? Object.keys(errors)[0] : undefined;
      const firstFieldMsg = firstFieldKey ? errors![firstFieldKey][0] : undefined;
      if (firstFieldKey && firstFieldMsg) {
        Alert.alert('회원가입 실패', translateFieldError(firstFieldKey, firstFieldMsg));
      } else if (message) {
        Alert.alert('회원가입 실패', message);
      } else {
        Alert.alert('오류', '네트워크 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="회원가입" />
      <ScrollView automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title}>기본정보 입력</Text>
          <Text style={styles.subtitle}>함께 더 나은 내일을 만들어가요.</Text>
        </View>

        <View style={styles.inputWrap}>
          <Icon name="account-outline" size={18} color={colors.muted} />
          <TextInput
            style={styles.input}
            placeholder="이름"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
          />
        </View>
        <View style={styles.inputWrap}>
          <Icon name="email-outline" size={18} color={colors.muted} />
          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputWrap}>
          <Icon name="cellphone" size={18} color={colors.muted} />
          <TextInput
            style={styles.input}
            placeholder="전화번호 (예: 010-1234-5678)"
            placeholderTextColor={colors.muted}
            value={phone}
            onChangeText={t => setPhone(formatPhoneInput(t))}
            keyboardType="phone-pad"
            maxLength={13}
          />
        </View>
        <View style={styles.inputWrap}>
          <Icon name="lock-outline" size={18} color={colors.muted} />
          <TextInput
            style={styles.input}
            placeholder="비밀번호 (6자 이상)"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        <View style={styles.inputWrap}>
          <Icon name="lock-check-outline" size={18} color={colors.muted} />
          <TextInput
            style={styles.input}
            placeholder="비밀번호 확인"
            placeholderTextColor={colors.muted}
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={styles.agreeRow}
          onPress={() => setAgreeTerms(v => !v)}
          disabled={loading}
        >
          <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
            {agreeTerms && <Icon name="check-bold" size={12} color={colors.surface} />}
          </View>
          <Text style={styles.agreeText}>
            <Text
              style={styles.agreeLink}
              onPress={() => navigation.navigate('LegalDocument', { type: 'terms' })}
            >
              이용약관
            </Text>
            {' 및 '}
            <Text
              style={styles.agreeLink}
              onPress={() => navigation.navigate('LegalDocument', { type: 'privacy' })}
            >
              개인정보 처리방침
            </Text>
            에 동의합니다.
          </Text>
        </TouchableOpacity>

        <GradientButton onPress={handleRegister} loading={loading} style={styles.buttonWrap}>
          가입하기
        </GradientButton>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.loginLinkText}>
            이미 계정이 있으신가요? <Text style={styles.loginLinkBold}>로그인</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  titleBlock: { marginBottom: spacing.md, gap: 4 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
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
  input: { flex: 1, fontSize: 14, color: colors.textPrimary },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
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
  agreeText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  agreeLink: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  buttonWrap: { marginTop: spacing.sm },
  loginLink: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  loginLinkText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  loginLinkBold: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
});
