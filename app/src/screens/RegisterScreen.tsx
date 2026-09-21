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

type UserType = 'freelancer' | 'team';

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { setAuth } = useAuthStore();
  const [userType, setUserType] = useState<UserType>('freelancer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !passwordConfirm) {
      Alert.alert('오류', '모든 항목을 입력해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.post('/auth/register', {
        name,
        email,
        password,
        password_confirmation: passwordConfirm,
        platform: 'mobile',
        user_type: userType,
      });
      if (res.data.success) {
        await setAuth(res.data.data.user, res.data.data.token);
      }
    } catch (error: any) {
      const errCode = error.response?.data?.error_code;
      const message = error.response?.data?.message;
      if (message) {
        Alert.alert('회원가입 실패', message);
      } else if (errCode) {
        Alert.alert('회원가입 실패', '입력값을 확인해주세요.');
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

      <Text style={styles.sectionLabel}>가입 유형</Text>
      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            userType === 'freelancer' && styles.typeButtonActive,
          ]}
          onPress={() => setUserType('freelancer')}
          disabled={loading}
        >
          <Text
            style={[
              styles.typeButtonText,
              userType === 'freelancer' && styles.typeButtonTextActive,
            ]}
          >
            혼자 사용 (프리랜서)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeButton,
            userType === 'team' && styles.typeButtonActive,
          ]}
          onPress={() => setUserType('team')}
          disabled={loading}
        >
          <Text
            style={[
              styles.typeButtonText,
              userType === 'team' && styles.typeButtonTextActive,
            ]}
          >
            팀과 함께 사용
          </Text>
        </TouchableOpacity>
      </View>

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
  sectionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  typeButtonActive: {
    backgroundColor: '#1F3864',
    borderColor: '#1F3864',
  },
  typeButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#fff',
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
