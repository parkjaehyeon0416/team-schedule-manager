import axiosInstance from "./axiosInstance";
import type { ApiResponse, Site } from "../types";

export type SiteInput = {
  address: string;
  apt_name?: string;
  dong?: string;
  ho?: string;
  area_m2?: number;
  memo?: string;
};

export const getSites = async () => {
  const res = await axiosInstance.get<ApiResponse<Site[]>>("/api/sites");
  return res.data;
};

export const getSite = async (id: number | string) => {
  const res = await axiosInstance.get<ApiResponse<Site>>(`/api/sites/${id}`);
  return res.data;
};

export const createSite = async (data: SiteInput) => {
  const res = await axiosInstance.post<ApiResponse<Site>>("/api/sites", data);
  return res.data;
};

export const updateSite = async (id: number | string, data: Partial<SiteInput>) => {
  const res = await axiosInstance.put<ApiResponse<Site>>(`/api/sites/${id}`, data);
  return res.data;
};

export const deleteSite = async (id: number | string) => {
  const res = await axiosInstance.delete<ApiResponse<null>>(`/api/sites/${id}`);
  return res.data;
};
