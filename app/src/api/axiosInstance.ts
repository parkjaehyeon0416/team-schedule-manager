import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────
// ★ 10.0.2.2 = Android 에뮬레이터에서 내 PC의 localhost를 가리키는 주소
//
// API_BASE_URL: API 호출용 (예: GET /api/schedules → http://10.0.2.2:8000/api/schedules)
// SERVER_BASE_URL: 정적 자원 (사진/파일) 접근용
//   사진 URL 예: http://10.0.2.2:8000/storage/site-photos/abc123.jpg
//   /api 가 빠진 루트 경로로 접근해야 storage:link로 연결된 폴더에 닿음
// ─────────────────────────────────────────────────────────
// export const SERVER_BASE_URL = 'http://10.0.2.2:8000';
// 로컬 개발용 (에뮬·핸드폰 둘 다 됨, adb reverse 사용) — 개발 중엔 이 줄로 되돌릴 것
// export const SERVER_BASE_URL = 'http://localhost:8000';
// ★ v18.14 — 실기기 APK 배포용. localhost는 폰 자기 자신을 가리켜서 실제 폰에선
//   백엔드에 연결이 안 됨. 실서버(NCP) 주소로 고정해야 wifi/데이터 상관없이 어디서든 접속됨.
export const SERVER_BASE_URL = 'http://211.233.210.85';
export const API_BASE_URL = `${SERVER_BASE_URL}/api`;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
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
