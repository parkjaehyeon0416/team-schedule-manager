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

// ★ v18.68 — 실패 응답(JSON 글자)을 객체로 바꿈. 예전엔 오류 본문도 글자 그대로라
//   e.response.data.message(기간 오류·1시간 횟수 제한 등)가 안 읽혀 "자료 생성에 실패했습니다."만 보였고,
//   요금제 잠금(403 ERR_PLAN_001) 안내 시트도 안 떴음(axios 인터셉터가 data.error_code를 못 읽어서).
function parseErrorBody(data: unknown): unknown {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return data; // JSON이 아니면(프록시 HTML 오류 등) 그대로 — 화면은 기본 문구로 안내
  }
}

// ★ DESIGN-CANVAS(TAX_EXPORT) 추가 (2026-10-02) — CSV 자료 내보내기
// PDF와 달리 인증된 axios 요청으로 텍스트를 직접 받아서, 모바일에서는 OS 공유 시트로 전달함.
export async function exportTaxCsv(from: string, to: string, items: string[]): Promise<string> {
  const res = await axios.get<string>('/tax-summary/export', {
    params: { from, to, items: items.join(',') },
    responseType: 'text',
    // 성공(CSV)은 JSON으로 파싱하지 않고 글자 그대로, 실패(4xx·5xx)만 JSON으로 파싱 ★ v18.68
    transformResponse: [(data, _headers, status) => (status !== undefined && status >= 400 ? parseErrorBody(data) : data)],
  });
  return res.data;
}
