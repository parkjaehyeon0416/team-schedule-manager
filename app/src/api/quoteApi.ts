// ═══════════════════════════════════════════════════════════════
// 📄 src/api/quoteApi.ts — 견적서 (★ v12.1, 모바일 연동 ★ 이번 작업)
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse, Quote, QuoteLine, UserMaterial } from '../types/api';

export interface QuoteInput {
  client_name?: string;
  client_contact?: string;
  address?: string;
  site_id?: number;
  work_type_id?: number;
  desired_date?: string;
  memo?: string;
  discount_amount?: number;
  tax_type?: 'separate' | 'included' | 'exempt';
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

export async function updateQuote(id: number, payload: QuoteInput): Promise<Quote> {
  const res = await axios.put<ApiResponse<Quote>>(`/quotes/${id}`, payload);
  return res.data.data;
}

export async function updateQuoteStatus(
  id: number,
  status: 'draft' | 'sent' | 'rejected',
): Promise<Quote> {
  const res = await axios.patch<ApiResponse<Quote>>(`/quotes/${id}/status`, { status });
  return res.data.data;
}

/** ★ v18.68 desiredDate — 희망 시공일이 없는 견적은 고른 날짜를 같이 보냄. 응답 message에 "일당은 직접 입력" 안내 */
export async function approveQuote(
  id: number,
  desiredDate?: string,
): Promise<{ quote: Quote; schedule: unknown; message?: string }> {
  const res = await axios.post<ApiResponse<{ quote: Quote; schedule: unknown }>>(
    `/quotes/${id}/approve`,
    desiredDate ? { desired_date: desiredDate } : {},
  );
  return { ...res.data.data, message: res.data.message };
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
