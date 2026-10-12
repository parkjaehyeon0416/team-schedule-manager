// ═══════════════════════════════════════════════════════════════
// 📄 src/api/reportApi.ts — 자동 보고서 (★ v12~v13, 모바일 연동 ★ 이번 작업)
// ═══════════════════════════════════════════════════════════════
import axios, { SERVER_BASE_URL } from './axiosInstance';
import type { ApiResponse, SiteReport, ReportContext } from '../types/api';

/** ★ v18.66 — 보고서 목록 + 화면 위쪽 정보(현장·사진 수·이번 달 사용량) */
export async function getReportsWithContext(scheduleId: number): Promise<{ reports: SiteReport[]; context: ReportContext }> {
  const res = await axios.get<ApiResponse<{ reports: SiteReport[]; context: ReportContext }>>(
    `/schedules/${scheduleId}/reports`,
    { params: { with_context: 1 } },
  );
  return res.data.data;
}

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

/** ★ v18.63 — 공유 링크 받기(3일 유효). 만료됐으면 서버가 새 주소로 바꿔 줌 */
export async function shareReport(id: number): Promise<{ share_token: string; share_expires_at: string }> {
  const res = await axios.post<ApiResponse<{ share_token: string; share_expires_at: string }>>(`/reports/${id}/share`);
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
