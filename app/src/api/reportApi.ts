// ═══════════════════════════════════════════════════════════════
// 📄 src/api/reportApi.ts — 자동 보고서 (★ v12~v13, 모바일 연동 ★ 이번 작업)
// ═══════════════════════════════════════════════════════════════
import axios, { SERVER_BASE_URL } from './axiosInstance';
import type { ApiResponse, SiteReport } from '../types/api';

export interface ReportInput {
  title: string;
  client_name?: string;
  client_contact?: string;
  greeting_message?: string;
}

export async function getReports(scheduleId: number): Promise<SiteReport[]> {
  const res = await axios.get<ApiResponse<SiteReport[]>>(
    `/schedules/${scheduleId}/reports`,
  );
  return res.data.data;
}

export async function createReport(
  scheduleId: number,
  payload: ReportInput,
): Promise<SiteReport> {
  const res = await axios.post<ApiResponse<SiteReport>>(
    `/schedules/${scheduleId}/reports`,
    payload,
  );
  return res.data.data;
}

export async function deleteReport(id: number): Promise<void> {
  await axios.delete(`/reports/${id}`);
}

/**
 * 공유 링크 — share_token 자체가 접근 키라 인증 없이 열 수 있음.
 * Linking.openURL(getPublicReportUrl(token))으로 브라우저/PDF 뷰어에서 바로 열람 가능.
 */
export function getPublicReportUrl(shareToken: string): string {
  return `${SERVER_BASE_URL}/api/report/${shareToken}`;
}
