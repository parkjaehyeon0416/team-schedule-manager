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
import { useAuthStore } from '../store/authStore';
import axiosInstance from '../api/axiosInstance';

export default function LoginScreen() {
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      // ★ v9: platform='mobile' 파라미터 추가
      //   - 백엔드가 user_type과 platform 매칭 검증
      //   - user_type='operator'(운영자) 는 모바일 로그인 거부됨
      const res = await axiosInstance.post('/auth/login', {
        email,
        password,
        platform: 'mobile',
      });
      if (res.data.success) {
        setAuth(res.data.data.user, res.data.data.token);
        // 로그인 성공 시 Navigation이 자동으로 메인 화면으로 이동
      }
    } catch (error: any) {
      const errCode = error.response?.data?.error_code;
      if (errCode === 'ERR_AUTH_001') {
        Alert.alert('로그인 실패', '이메일 또는 비밀번호를 확인해주세요.');
      } else if (errCode === 'ERR_AUTH_008') {
        // ★ v9 신규: 운영자 계정이 모바일 로그인 시도
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
      <Text style={styles.title}>📋 Team Schedule</Text>
      <TextInput
        style={styles.input}
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>로그인</Text>
        )}
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
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
    color: '#1F3864',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#1F3864',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
