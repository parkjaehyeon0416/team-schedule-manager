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
import { useAuthStore } from '../store/authStore';
import axiosInstance from '../api/axiosInstance';
import { useNavigation } from '@react-navigation/native';

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
        phone,
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
      // ★ v18.15 — 422일 때 서버가 필드별 구체적 사유(errors)를 같이 내려주는데
      //   전에는 항상 똑같은 "입력값을 확인해주세요."(message)만 보여줘서
      //   실제로 뭐가 틀렸는지(이메일/비밀번호/전화번호 등) 알 수 없었음.
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
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>📋 회원가입</Text>

      <TextInput
        style={styles.input}
        placeholder="이름"
        placeholderTextColor="#999999"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="이메일"
        placeholderTextColor="#999999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="전화번호 ('-' 없이 숫자만, 예: 01012345678)"
        placeholderTextColor="#999999"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호 (6자 이상)"
        placeholderTextColor="#999999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호 확인"
        placeholderTextColor="#999999"
        value={passwordConfirm}
        onChangeText={setPasswordConfirm}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.agreeRow}
        onPress={() => setAgreeTerms(v => !v)}
        disabled={loading}
      >
        <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
          {agreeTerms && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
        <Text style={styles.agreeText}>
          <Text
            style={styles.agreeLink}
            onPress={() =>
              navigation.navigate('LegalDocument', { type: 'terms' })
            }
          >
            이용약관
          </Text>
          {' 및 '}
          <Text
            style={styles.agreeLink}
            onPress={() =>
              navigation.navigate('LegalDocument', { type: 'privacy' })
            }
          >
            개인정보 처리방침
          </Text>
          에 동의합니다.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>가입하기</Text>
        )}
      </TouchableOpacity>

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
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f0f2f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1F3864',
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
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#aaa',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#1F3864',
    borderColor: '#1F3864',
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  agreeText: {
    flex: 1,
    fontSize: 13,
    color: '#444',
  },
  agreeLink: {
    color: '#1F3864',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: '#1F3864',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#666',
    fontSize: 14,
  },
  loginLinkBold: {
    color: '#1F3864',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
