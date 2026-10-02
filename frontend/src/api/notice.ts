// ★ v18.40 — 운영자용 공지·이벤트 관리 API (/api/admin/notices, 운영자 계정만 접근)
import axiosInstance from "./axiosInstance";
import type { ApiResponse } from "../types";

export type NoticeType = "notice" | "event";

export interface AdminNotice {
  id: number;
  type: NoticeType;
  title: string;
  summary: string | null;
  body: string | null;
  info: { label: string; value: string }[] | null;
  steps: { title: string; desc?: string | null }[] | null;
  cautions: string[] | null;
  banner_path: string | null;
  cta_label: string | null;
  cta_route: string | null;
  is_pinned: boolean;
  author: string;
  starts_at: string | null;
  ends_at: string | null;
  published_at: string | null;
  created_at: string;
}

export interface NoticeInput {
  type: NoticeType;
  title: string;
  summary?: string | null;
  body?: string | null;
  info?: { label: string; value: string }[];
  steps?: { title: string; desc?: string | null }[];
  cautions?: string[];
  cta_label?: string | null;
  cta_route?: string | null;
  is_pinned?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  published: boolean;
  banner?: File | null;
  remove_banner?: boolean;
}

// 배너 이미지 때문에 multipart로 보냄 — 배열 항목은 JSON 문자열로
function toFormData(input: NoticeInput): FormData {
  const fd = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === "banner") {
      fd.append("banner", value as File);
    } else if (Array.isArray(value)) {
      fd.append(key, JSON.stringify(value));
    } else if (typeof value === "boolean") {
      fd.append(key, value ? "1" : "0");
    } else {
      fd.append(key, String(value));
    }
  });
  return fd;
}

export const getAdminNotices = async (type?: NoticeType) => {
  const res = await axiosInstance.get<ApiResponse<AdminNotice[]>>("/api/admin/notices", {
    params: type ? { type } : undefined,
  });
  return res.data.data;
};

export const createNotice = async (input: NoticeInput) => {
  const res = await axiosInstance.post<ApiResponse<AdminNotice>>("/api/admin/notices", toFormData(input), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
};

export const updateNotice = async (id: number, input: NoticeInput) => {
  const res = await axiosInstance.post<ApiResponse<AdminNotice>>(`/api/admin/notices/${id}`, toFormData(input), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
};

export const deleteNotice = async (id: number) => {
  await axiosInstance.delete(`/api/admin/notices/${id}`);
};
