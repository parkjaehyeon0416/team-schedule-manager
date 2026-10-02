// ★ v18.40 — 운영자 대시보드 API
import axiosInstance from "./axiosInstance";
import type { ApiResponse } from "../types";

export interface DashboardStats {
  members_total: number;
  members_today: number;
  members_this_month: number;
  teams_total: number;
  schedules_this_month: number;
  quotes_this_month: number;
  push_devices: number;
  notices_published: number;
}

export interface RecentMember {
  id: number;
  name: string;
  email: string;
  user_type: "team" | "freelancer";
  created_at: string;
}

export const getDashboard = async () => {
  const res = await axiosInstance.get<ApiResponse<{ stats: DashboardStats; recent_members: RecentMember[] }>>(
    "/api/admin/dashboard",
  );
  return res.data.data;
};
