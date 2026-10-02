// ═══════════════════════════════════════════════════════════════
// 📄 src/api/pdfDownload.ts — ★ v18.36 견적서/세무자료 PDF 다운로드
//   PDF 주소는 인증 헤더가 필요해 브라우저로 바로 못 열어서, 서버에서 10분짜리 서명 링크를
//   받아 브라우저로 염 → 브라우저가 다운로드 폴더에 저장(앱에 파일 저장 라이브러리 불필요).
// ═══════════════════════════════════════════════════════════════
import { Linking } from 'react-native';
import axios, { SERVER_BASE_URL } from './axiosInstance';
import type { ApiResponse } from '../types/api';

async function openSignedPath(apiPath: string, params?: Record<string, unknown>): Promise<void> {
  const res = await axios.get<ApiResponse<{ path: string }>>(apiPath, { params });
  await Linking.openURL(`${SERVER_BASE_URL}${res.data.data.path}`);
}

export function downloadQuotePdf(quoteId: number): Promise<void> {
  return openSignedPath(`/quotes/${quoteId}/pdf-link`);
}

export function downloadTaxPdf(year: number): Promise<void> {
  return openSignedPath('/tax-summary/pdf-link', { year });
}
