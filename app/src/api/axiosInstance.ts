import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ★ 10.0.2.2 = Android 에뮬레이터에서 내 PC의 localhost를 가리키는 주소
const axiosInstance = axios.create({
  baseURL: 'http://10.0.2.2:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─────────────────────────────────────────────────────────
// ★ 요청 인터셉터
//   모든 API 요청이 서버로 나가기 직전에 실행됨.
//   AsyncStorage에 저장된 토큰을 꺼내 Authorization 헤더에 자동 첨부.
//   ※ 키 이름 'token' 은 authStore.ts의 setItem 키와 동일해야 함!
// ─────────────────────────────────────────────────────────
axiosInstance.interceptors.request.use(
  async config => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('토큰 읽기 실패:', e);
    }
    return config;
  },
  error => Promise.reject(error),
);

// ─────────────────────────────────────────────────────────
// ★ 응답 인터셉터
//   401(인증 만료) 응답이 오면 저장된 토큰 삭제.
//   ※ 지금은 자동 로그아웃 처리는 생략. 이후 기능 확장 시 추가.
// ─────────────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
