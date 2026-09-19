import axiosInstance from "./axiosInstance";
import type { ApiResponse } from "../types";

export type MonthlySummary = {
  id: number;
  user_id: number;
  year_month: string;
  total_work_units: number;
  total_income: number;
  total_expenses: number;
  estimated_tax: number;
  net_income: number;
  work_days: number;
  site_count: number;
  last_calculated_at: string | null;
};

export const getMonthlySummary = async (year: number, month: number) => {
  const res = await axiosInstance.get<ApiResponse<MonthlySummary>>(
    "/api/monthly-summary",
    { params: { year, month } },
  );
  return res.data;
};
