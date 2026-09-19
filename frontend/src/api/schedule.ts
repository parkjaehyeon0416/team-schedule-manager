import axiosInstance from "./axiosInstance";
import type { ApiResponse, Schedule } from "../types";

export type ScheduleWithRelations = Schedule & {
  site: { id: number; apt_name: string; dong: string; ho: string } | null;
  users: { id: number; name: string }[];
  district: string | null;
  work_type: string | null;
  daily_wage: number | null;
  work_units: number | null;
  memo: string | null;
};

export type ScheduleInput = {
  date: string;
  district?: string;
  work_type?: "도배" | "타일" | "필름";
  daily_wage?: number;
  work_units?: number;
  expenses?: number;
  expenses_memo?: string;
  area_m2?: number;
  memo?: string;
  user_ids?: number[];
  site_id?: number;
};

export const getSchedules = async (params?: { year?: number; month?: number }) => {
  const res = await axiosInstance.get<ApiResponse<ScheduleWithRelations[]>>(
    "/api/schedules",
    { params },
  );
  return res.data;
};

export const getSchedule = async (id: number) => {
  const res = await axiosInstance.get<ApiResponse<ScheduleWithRelations>>(
    `/api/schedules/${id}`,
  );
  return res.data;
};

export const createSchedule = async (data: ScheduleInput) => {
  const res = await axiosInstance.post<ApiResponse<ScheduleWithRelations>>(
    "/api/schedules",
    data,
  );
  return res.data;
};

export const updateSchedule = async (id: number, data: Partial<ScheduleInput>) => {
  const res = await axiosInstance.put<ApiResponse<ScheduleWithRelations>>(
    `/api/schedules/${id}`,
    data,
  );
  return res.data;
};

export const deleteSchedule = async (id: number) => {
  const res = await axiosInstance.delete<ApiResponse<null>>(
    `/api/schedules/${id}`,
  );
  return res.data;
};
