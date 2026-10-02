// ★ v18.40~41 — 운영자 대시보드 / 회원 관리 API
import axiosInstance from "./axiosInstance";
import type { ApiResponse } from "../types";

export interface DashboardStats {
  members_total: number;
  members_today: number;
  members_yesterday: number;
  members_this_month: number;
  teams_total: number;
  schedules_this_month: number;
  quotes_this_month: number;
  push_devices: number;
  notices_published: number;
  events_published: number;
}

export interface RecentMember {
  id: number;
  name: string;
  email_masked: string;
  specialty: string | null;
  service_area: string | null;
  signup_method: string;
  created_at: string;
}

export interface PublishedNotice {
  id: number;
  type: "notice" | "event";
  title: string;
  is_pinned: boolean;
  ends_at: string | null;
}

export interface Dashboard {
  stats: DashboardStats;
  recent_members: RecentMember[];
  published_notices: PublishedNotice[];
  generated_at: string;
}

export const getDashboard = async () => {
  const res = await axiosInstance.get<ApiResponse<Dashboard>>("/api/admin/dashboard");
  return res.data.data;
};

// ── 회원 관리 ──────────────────────────
export interface MemberRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  signup_method: string;
  teams: string[];
  specialty: string | null;
  service_area: string | null;
  created_at: string;
  suspended: boolean;
}

export interface MemberPage {
  items: MemberRow[];
  total: number;
  page: number;
  pages: number;
  counts: { all: number; suspended: number };
}

export interface MemberDetail {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  signup_method: string;
  created_at: string;
  last_active_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  specialty: string | null;
  service_area: string | null;
  years_experience: number | null;
  teams: { id: number; name: string; is_leader: boolean; joined_at: string }[];
  activity: { schedules: number; sites: number; quotes: number; push_devices: number };
}

export const getMembers = async (params: { q?: string; type?: string; status?: string; page?: number }) => {
  const res = await axiosInstance.get<ApiResponse<MemberPage>>("/api/admin/members", { params });
  return res.data.data;
};

export const getMember = async (id: number) => {
  const res = await axiosInstance.get<ApiResponse<MemberDetail>>(`/api/admin/members/${id}`);
  return res.data.data;
};

export const suspendMember = async (id: number, reason: string) => {
  const res = await axiosInstance.post<ApiResponse<null>>(`/api/admin/members/${id}/suspend`, { reason });
  return res.data;
};

export const unsuspendMember = async (id: number) => {
  const res = await axiosInstance.post<ApiResponse<null>>(`/api/admin/members/${id}/unsuspend`);
  return res.data;
};
