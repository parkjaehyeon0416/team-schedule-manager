import axios from "axios";
import { useAuthStore } from "../store/authStore";

// ★ 에뮬레이터에서 localhost는 PC를 가리키지 않습니다!
//    Android 에뮬레이터에서 PC의 localhost는 10.0.2.2 로 접근합니다.
const BASE_URL = "http://localhost:8000";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// 요청 인터셉터: 토큰 자동 추가
axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 응답 인터셉터: 401 토큰 만료 시 자동 로그아웃
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
