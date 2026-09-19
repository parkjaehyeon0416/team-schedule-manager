import axiosInstance from "./axiosInstance";
import type { ApiResponse } from "../types";

export type WorkType = {
  id: number;
  name: string;
  code: string | null;
  color: string;
};

export const getWorkTypes = async () => {
  const res = await axiosInstance.get<ApiResponse<WorkType[]>>("/api/work-types");
  return res.data;
};
