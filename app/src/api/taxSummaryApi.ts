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

// ★ DESIGN-CANVAS(TAX_EXPORT) 추가 (2026-10-02) — CSV 자료 내보내기
// PDF와 달리 인증된 axios 요청으로 텍스트를 직접 받아서, 모바일에서는 OS 공유 시트로 전달함.
export async function exportTaxCsv(from: string, to: string, items: string[]): Promise<string> {
  const res = await axios.get<string>('/tax-summary/export', {
    params: { from, to, items: items.join(',') },
    responseType: 'text',
    transformResponse: [(data) => data], // axios가 JSON으로 파싱하지 않도록
  });
  return res.data;
}
