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
import axiosInstance from '../api/axiosInstance';
import { useNavigation } from '@react-navigation/native';
import { formatPhoneInput, stripPhoneFormatting } from '../utils/phone';
import AppHeader from '../components/AppHeader';
import { colors, radius, spacing } from '../theme/designTokens';
import GradientButton from '../components/GradientButton';
import { passwordError, PASSWORD_PLACEHOLDER } from '../utils/passwordPolicy';

// 2단계: ① 이메일+이름+전화번호 일치 확인 후 인증번호 발송 → ② 인증번호+새 비밀번호 입력
export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email || !name || !phone) {
      Alert.alert('오류', '이메일, 이름, 전화번호를 모두 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.post('/auth/forgot-password', {
        email,
        name,
        phone: stripPhoneFormatting(phone),
      });
      if (res.data.success) {
        Alert.alert('발송 완료', '입력하신 전화번호로 인증번호를 발송했습니다.');
        setStep(2);
      }
    } catch (error: any) {
      Alert.alert('오류', '네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!code || !password || !passwordConfirm) {
      Alert.alert('오류', '모든 항목을 입력해주세요.');
      return;
    }
    if (passwordError(password)) { // ★ v18.62
      Alert.alert('비밀번호 확인', passwordError(password)!);
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.post('/auth/reset-password', {
        phone: stripPhoneFormatting(phone),
        code,
        password,
        password_confirmation: passwordConfirm,
      });
      if (res.data.success) {
        Alert.alert('완료', '비밀번호가 재설정되었습니다. 다시 로그인해주세요.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      const message = error.response?.data?.message;
      Alert.alert('재설정 실패', message ?? '인증번호를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" />
      <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.titleBlock}>
          <Text style={styles.title}>비밀번호 찾기</Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? '가입 시 등록한 이메일, 이름, 전화번호를 입력해주세요.'
              : `${phone}로 발송된 인증번호(3분간 유효)와 새 비밀번호를 입력해주세요.`}
          </Text>
        </View>

        {step === 1 ? (
          <>
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
            <GradientButton onPress={handleSendCode} loading={loading}>인증번호 받기</GradientButton>
          </>
        ) : (
          <>
            <View style={styles.inputWrap}>
              <Icon name="shield-check-outline" size={18} color={colors.muted} />
              <TextInput
                style={styles.input}
                placeholder="인증번호 6자리"
                placeholderTextColor={colors.muted}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
            <View style={styles.inputWrap}>
              <Icon name="lock-outline" size={18} color={colors.muted} />
              <TextInput
                style={styles.input}
                placeholder={`새 비밀번호 (${PASSWORD_PLACEHOLDER})`}
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
                placeholder="새 비밀번호 확인"
                placeholderTextColor={colors.muted}
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                secureTextEntry
              />
            </View>
            <GradientButton onPress={handleReset} loading={loading}>비밀번호 재설정</GradientButton>
            <TouchableOpacity style={styles.backLink} onPress={handleSendCode} disabled={loading}>
              <Text style={styles.backLinkText}>인증번호 다시 받기</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()} disabled={loading}>
          <Text style={styles.backLinkText}>로그인으로 돌아가기</Text>
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
  titleBlock: { marginBottom: spacing.lg, gap: 4 },
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
  button: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.sm,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: colors.surface, fontSize: 15, fontWeight: '700' },
  backLink: { marginTop: spacing.md, alignItems: 'center' },
  backLinkText: { color: colors.textSecondary, fontSize: 13 },
});
