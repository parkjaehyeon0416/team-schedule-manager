import axiosInstance from "./axiosInstance";
import type { ApiResponse, User } from "../types";

// v9: platform 파라미터 추가 ('web' | 'mobile', default 'web')

type LoginData = { user: User; token: string };
type LoginResponse = ApiResponse<LoginData>;

export const login = async (
  email: string,
  password: string,
  platform: "web" | "mobile" = "web",
) => {
  const res = await axiosInstance.post<LoginResponse>("/api/auth/login", {
    email,
    password,
    platform,
  });
  return res.data;
};

export const logout = async () => {
  const res = await axiosInstance.post<ApiResponse<null>>("/api/auth/logout");
  return res.data;
};

export const getMe = async () => {
  const res = await axiosInstance.get<ApiResponse<User>>("/api/me");
  return res.data;
};
