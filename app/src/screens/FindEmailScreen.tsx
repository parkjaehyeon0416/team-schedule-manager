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
        phone,
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
        phone,
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
    <View style={styles.container}>
      <Text style={styles.title}>🔍 아이디(이메일) 찾기</Text>

      {step === 1 ? (
        <>
          <Text style={styles.subtitle}>
            가입 시 입력한 이름과 전화번호를 입력해주세요.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="이름"
            placeholderTextColor="#999999"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="전화번호 ('-' 없이 숫자만)"
            placeholderTextColor="#999999"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TouchableOpacity
            style={styles.button}
            onPress={handleSendCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>인증번호 받기</Text>
            )}
          </TouchableOpacity>
        </>
      ) : !foundEmail ? (
        <>
          <Text style={styles.subtitle}>
            {phone}로 발송된 인증번호(10분간 유효)를 입력해주세요.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="인증번호 6자리"
            placeholderTextColor="#999999"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity
            style={styles.button}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>확인</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={handleSendCode}
            disabled={loading}
          >
            <Text style={styles.backLinkText}>인증번호 다시 받기</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>찾은 이메일</Text>
          <Text style={styles.resultEmail}>{foundEmail}</Text>
        </View>
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
  resultBox: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  resultEmail: { fontSize: 18, fontWeight: 'bold', color: '#1F3864' },
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
