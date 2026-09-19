import axiosInstance from "./axiosInstance";
import type { ApiResponse } from "../types";

export type QuoteLine = {
  id?: number;
  name: string;
  spec?: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  amount?: number;
};

export type Quote = {
  id: number;
  user_id: number;
  team_id: number | null;
  site_id: number | null;
  work_type_id: number | null;
  client_name: string | null;
  client_contact: string | null;
  address: string | null;
  desired_date: string | null;
  memo: string | null;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  status: "draft" | "sent" | "approved" | "rejected";
  approved_schedule_id: number | null;
  created_at: string;
  lines?: QuoteLine[];
  site?: { id: number; apt_name: string | null; dong: string | null; ho: string | null } | null;
};

export type QuoteInput = {
  client_name?: string;
  client_contact?: string;
  address?: string;
  work_type_id?: number;
  desired_date?: string;
  memo?: string;
  discount_amount?: number;
  lines: QuoteLine[];
};

export type UserMaterial = {
  id: number;
  name: string;
  unit: string;
  default_unit_price: number | null;
  usage_count: number;
};

export const getQuotes = async () => {
  const res = await axiosInstance.get<ApiResponse<Quote[]>>("/api/quotes");
  return res.data;
};

export const getQuote = async (id: number) => {
  const res = await axiosInstance.get<ApiResponse<Quote>>(`/api/quotes/${id}`);
  return res.data;
};

export const createQuote = async (data: QuoteInput) => {
  const res = await axiosInstance.post<ApiResponse<Quote>>("/api/quotes", data);
  return res.data;
};

export const updateQuoteStatus = async (id: number, status: "draft" | "sent" | "rejected") => {
  const res = await axiosInstance.patch<ApiResponse<Quote>>(`/api/quotes/${id}/status`, { status });
  return res.data;
};

export const approveQuote = async (id: number) => {
  const res = await axiosInstance.post<ApiResponse<{ quote: Quote; schedule: unknown }>>(
    `/api/quotes/${id}/approve`,
  );
  return res.data;
};

export const deleteQuote = async (id: number) => {
  const res = await axiosInstance.delete<ApiResponse<null>>(`/api/quotes/${id}`);
  return res.data;
};

export const downloadQuotePdf = async (id: number) => {
  const res = await axiosInstance.get(`/api/quotes/${id}/pdf`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = `견적서_${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const getMaterials = async (workTypeId?: number) => {
  const res = await axiosInstance.get<ApiResponse<UserMaterial[]>>("/api/materials", {
    params: workTypeId ? { work_type_id: workTypeId } : undefined,
  });
  return res.data;
};
