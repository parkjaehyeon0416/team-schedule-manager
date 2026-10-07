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

// 2단계: ① 이름+전화번호로 계정 확인 후 인증번호 발송 → ② 인증번호 확인 후 이메일 공개
export default function FindEmailScreen() {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundEmail, setFoundEmail] = useState<string | null>(null);

  const handleSendCode = async () => {
    if (!name || !phone) {
      Alert.alert('오류', '이름과 전화번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.post('/auth/find-email/request', {
        name,
        phone: stripPhoneFormatting(phone),
      });
      if (res.data.success) {
        Alert.alert('발송 완료', '입력하신 전화번호로 인증번호를 발송했습니다.');
        setStep(2);
      }
    } catch (error: any) {
      const message = error.response?.data?.message;
      Alert.alert('찾기 실패', message ?? '일치하는 계정을 찾을 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code) {
      Alert.alert('오류', '인증번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.post('/auth/find-email/verify', {
        name,
        phone: stripPhoneFormatting(phone),
        code,
      });
      if (res.data.success) {
        setFoundEmail(res.data.data.email);
      }
    } catch (error: any) {
      const message = error.response?.data?.message;
      Alert.alert('인증 실패', message ?? '인증번호를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" />
      <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {!foundEmail ? (
          <View style={styles.titleBlock}>
            <Text style={styles.title}>아이디 찾기</Text>
            <Text style={styles.subtitle}>
              {step === 1
                ? '가입 시 입력한 이름과 전화번호를 입력해주세요.'
                : `${phone}로 발송된 인증번호(10분간 유효)를 입력해주세요.`}
            </Text>
          </View>
        ) : null}

        {step === 1 ? (
          <>
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
            <GradientButton onPress={handleSendCode} loading={loading}>아이디 찾기</GradientButton>
          </>
        ) : !foundEmail ? (
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
            <GradientButton onPress={handleVerify} loading={loading}>확인</GradientButton>
            <TouchableOpacity style={styles.backLink} onPress={handleSendCode} disabled={loading}>
              <Text style={styles.backLinkText}>인증번호 다시 받기</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.resultIconWrap}>
              <Icon name="email-check-outline" size={36} color={colors.primaryDark} />
            </View>
            <Text style={styles.title}>아이디 찾기 결과</Text>
            <Text style={styles.subtitle}>입력하신 정보와 일치하는{'\n'}계정이 있습니다.</Text>
            <View style={styles.resultBox}>
              <Text style={styles.resultEmail}>{foundEmail}</Text>
            </View>
            <GradientButton onPress={() => navigation.navigate('Login')}>로그인 화면으로 이동</GradientButton>
          </>
        )}

        {!foundEmail && (
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()} disabled={loading}>
            <Text style={styles.backLinkText}>로그인으로 돌아가기</Text>
          </TouchableOpacity>
        )}
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
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
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
  resultIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  resultBox: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultEmail: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  backLink: { marginTop: spacing.md, alignItems: 'center' },
  backLinkText: { color: colors.textSecondary, fontSize: 13 },
});
