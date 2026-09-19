import axiosInstance from "./axiosInstance";
import type { ApiResponse } from "../types";

export type BusinessCard = {
  id: number;
  user_id: number;
  share_code: string;
  display_name: string | null;
  contact_phone: string | null;
  job_title: string | null;
  years_experience: number | null;
  service_area: string | null;
  specialty: string | null;
  tagline: string | null;
  profile_photo_path: string | null;
  showcase_photo_ids: number[] | null;
  is_public: boolean;
  view_count: number;
  monthly_view_count: number;
  last_viewed_at: string | null;
};

export type BusinessCardInput = {
  display_name?: string;
  contact_phone?: string;
  job_title?: string;
  years_experience?: number;
  service_area?: string;
  specialty?: string;
  tagline?: string;
  is_public?: boolean;
};

export const getMyBusinessCard = async () => {
  const res = await axiosInstance.get<ApiResponse<BusinessCard | null>>(
    "/api/business-card",
  );
  return res.data;
};

export const saveBusinessCard = async (data: BusinessCardInput) => {
  const res = await axiosInstance.put<ApiResponse<BusinessCard>>(
    "/api/business-card",
    data,
  );
  return res.data;
};

export const deleteBusinessCard = async () => {
  const res = await axiosInstance.delete<ApiResponse<null>>("/api/business-card");
  return res.data;
};

export const getPublicCardUrl = (shareCode: string) => {
  const origin = axiosInstance.defaults.baseURL ?? "";
  // /c/{code}는 web.php 라우트라 /api 프리픽스 없이 백엔드 origin에 바로 붙음
  return `${origin}/c/${shareCode}`;
};
