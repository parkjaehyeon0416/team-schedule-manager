// ═══════════════════════════════════════════════════════════════
// 📄 src/api/quoteApi.ts — 견적서 (★ v12.1, 모바일 연동 ★ 이번 작업)
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse, Quote, QuoteLine, UserMaterial } from '../types/api';

export interface QuoteInput {
  client_name?: string;
  client_contact?: string;
  address?: string;
  work_type_id?: number;
  desired_date?: string;
  memo?: string;
  discount_amount?: number;
  lines: QuoteLine[];
}

export async function getQuotes(): Promise<Quote[]> {
  const res = await axios.get<ApiResponse<Quote[]>>('/quotes');
  return res.data.data;
}

export async function getQuote(id: number): Promise<Quote> {
  const res = await axios.get<ApiResponse<Quote>>(`/quotes/${id}`);
  return res.data.data;
}

export async function createQuote(payload: QuoteInput): Promise<Quote> {
  const res = await axios.post<ApiResponse<Quote>>('/quotes', payload);
  return res.data.data;
}

export async function approveQuote(
  id: number,
): Promise<{ quote: Quote; schedule: unknown }> {
  const res = await axios.post<ApiResponse<{ quote: Quote; schedule: unknown }>>(
    `/quotes/${id}/approve`,
  );
  return res.data.data;
}

export async function deleteQuote(id: number): Promise<void> {
  await axios.delete(`/quotes/${id}`);
}

export async function getMaterials(workTypeId?: number): Promise<UserMaterial[]> {
  const res = await axios.get<ApiResponse<UserMaterial[]>>('/materials', {
    params: workTypeId ? { work_type_id: workTypeId } : undefined,
  });
  return res.data.data;
}

/**
 * 견적서 PDF 다운로드 URL — 인증 헤더가 필요해 Linking.openURL로 바로 열 수 없음.
 * 모바일은 우선 "웹 대시보드에서 다운로드하세요" 안내로 대체(이번 범위 밖).
 */
export function getQuotePdfPath(id: number): string {
  return `/quotes/${id}/pdf`;
}
