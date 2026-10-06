// ★ v18.43 — 고객 문의 (내 문의 목록/상세/작성/삭제)
import axios from './axiosInstance';
import type { ApiResponse } from '../types/api';

export type InquiryCategory = 'usage' | 'bug' | 'account' | 'payment' | 'etc';

export const INQUIRY_CATEGORY_LABEL: Record<InquiryCategory, string> = {
  usage: '이용 방법',
  bug: '오류 신고',
  account: '계정',
  payment: '결제',
  etc: '기타',
};

export interface InquirySummary {
  id: number;
  category: InquiryCategory;
  title: string;
  status: 'pending' | 'answered';
  created_at: string;
  answered_at: string | null;
}

export interface InquiryDetail extends InquirySummary {
  content: string;
  answer: string | null;
}

export async function getMyInquiries(): Promise<InquirySummary[]> {
  const res = await axios.get<ApiResponse<InquirySummary[]>>('/inquiries');
  return res.data.data;
}

export async function getInquiry(id: number): Promise<InquiryDetail> {
  const res = await axios.get<ApiResponse<InquiryDetail>>(`/inquiries/${id}`);
  return res.data.data;
}

export async function createInquiry(payload: { category: InquiryCategory; title: string; content: string }): Promise<InquiryDetail> {
  const res = await axios.post<ApiResponse<InquiryDetail>>('/inquiries', payload);
  return res.data.data;
}

export async function deleteInquiry(id: number): Promise<void> {
  await axios.delete(`/inquiries/${id}`);
}
