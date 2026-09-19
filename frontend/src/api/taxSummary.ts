import axiosInstance from "./axiosInstance";
import type { ApiResponse } from "../types";

export type TaxMonthRow = {
  year_month: string;
  month: number;
  total_work_units: number;
  total_income: number;
  total_expenses: number;
  estimated_tax: number;
  net_income: number;
  work_days: number;
};

export type TaxSummary = {
  year: number;
  months: TaxMonthRow[];
  totals: Omit<TaxMonthRow, "year_month" | "month">;
};

export const getTaxSummary = async (year: number) => {
  const res = await axiosInstance.get<ApiResponse<TaxSummary>>("/api/tax-summary", {
    params: { year },
  });
  return res.data;
};

export const downloadTaxSummaryPdf = async (year: number) => {
  const res = await axiosInstance.get("/api/tax-summary/pdf", {
    params: { year },
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${year}년_수입경비정리.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
