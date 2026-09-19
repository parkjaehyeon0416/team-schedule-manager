// ═══════════════════════════════════════════════════════════════
// 📄 src/api/taxSummaryApi.ts — 수입·경비 정리 세무자료 (★ v17, 모바일 연동 ★ 이번 작업)
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse, TaxSummary } from '../types/api';

export async function getTaxSummary(year: number): Promise<TaxSummary> {
  const res = await axios.get<ApiResponse<TaxSummary>>('/tax-summary', {
    params: { year },
  });
  return res.data.data;
}

/**
 * PDF 다운로드 경로 — 인증 헤더가 필요해 Linking.openURL로 바로 열 수 없음.
 * 모바일은 "웹 대시보드에서 다운로드하세요" 안내로 대체(이번 범위 밖).
 */
export function getTaxSummaryPdfPath(year: number): string {
  return `/tax-summary/pdf?year=${year}`;
}
