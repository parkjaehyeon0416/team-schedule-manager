import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import axiosInstance from '../api/axiosInstance';
import { useNavigation } from '@react-navigation/native';

// 2단계: ① 이메일로 인증코드 발송 → ② 코드+새 비밀번호 입력
export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert('오류', '이메일을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.post('/auth/forgot-password', { email });
      if (res.data.success) {
        Alert.alert('발송 완료', '입력하신 이메일로 인증코드를 발송했습니다.');
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
    if (password !== passwordConfirm) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.post('/auth/reset-password', {
        email,
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
      Alert.alert('재설정 실패', message ?? '인증코드를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔑 비밀번호 재설정</Text>

      {step === 1 ? (
        <>
          <Text style={styles.subtitle}>
            가입한 이메일로 인증코드를 보내드립니다.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor="#999999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.button}
            onPress={handleSendCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>인증코드 받기</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>
            {email}로 발송된 인증코드(10분간 유효)와 새 비밀번호를 입력해주세요.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="인증코드 6자리"
            placeholderTextColor="#999999"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TextInput
            style={styles.input}
            placeholder="새 비밀번호 (6자 이상)"
            placeholderTextColor="#999999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="새 비밀번호 확인"
            placeholderTextColor="#999999"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secureTextEntry
          />
          <TouchableOpacity
            style={styles.button}
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>비밀번호 재설정</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={handleSendCode}
            disabled={loading}
          >
            <Text style={styles.backLinkText}>인증코드 다시 받기</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={styles.backLink}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Text style={styles.backLinkText}>로그인으로 돌아가기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f0f2f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1F3864',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    color: '#222222',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#1F3864',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  backLinkText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
