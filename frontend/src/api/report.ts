import axiosInstance from "./axiosInstance";
import type { ApiResponse } from "../types";

export type SiteReport = {
  id: number;
  schedule_id: number;
  user_id: number;
  title: string;
  client_name: string | null;
  client_contact: string | null;
  greeting_message: string | null;
  template_id: string;
  pdf_path: string | null;
  created_at: string;
};

export type ReportInput = {
  title: string;
  client_name?: string;
  client_contact?: string;
  greeting_message?: string;
};

export const getReports = async (scheduleId: number) => {
  const res = await axiosInstance.get<ApiResponse<SiteReport[]>>(
    `/api/schedules/${scheduleId}/reports`,
  );
  return res.data;
};

export const createReport = async (scheduleId: number, data: ReportInput) => {
  const res = await axiosInstance.post<ApiResponse<SiteReport>>(
    `/api/schedules/${scheduleId}/reports`,
    data,
  );
  return res.data;
};

export const deleteReport = async (id: number) => {
  const res = await axiosInstance.delete<ApiResponse<null>>(`/api/reports/${id}`);
  return res.data;
};

export const downloadReport = async (id: number, filename: string) => {
  const res = await axiosInstance.get(`/api/reports/${id}/download`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
