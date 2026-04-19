import axiosInstance from "./axiosInstance";
import type { ApiResponse, User } from "../types";

// ────────────────────────────────────
// login() — 로그인 API 호출 함수
// 파라미터: email(이메일), password(비밀번호)
// 반환: 사용자 정보 + 토큰
// ────────────────────────────────────
export const login = async (email: string, password: string) => {
  const res = await axiosInstance.post<
    ApiResponse<{ user: User; token: string }>
  >("/api/auth/login", { email, password });
  return res.data;
};

// ────────────────────────────────────
// logout() — 로그아웃 API 호출 함수
// ────────────────────────────────────
export const logout = async () => {
  const res = await axiosInstance.post<ApiResponse<null>>("/api/auth/logout");
  return res.data;
};

// ────────────────────────────────────
// getMe() — 내 정보 조회 API
// ────────────────────────────────────
export const getMe = async () => {
  const res = await axiosInstance.get<ApiResponse<User>>("/api/me");
  return res.data;
};
