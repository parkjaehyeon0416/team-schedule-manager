// ★ v18.43 — 고객 문의 (디자인 INQUIRY_LIST / INQUIRY_CREATE / INQUIRY_DETAIL)
import { Platform } from 'react-native';
import axios from './axiosInstance';
import type { ApiResponse } from '../types/api';

export type InquiryCategory = 'usage' | 'bug' | 'account' | 'payment' | 'etc';

// 디자인 순서대로
export const INQUIRY_CATEGORIES: { key: InquiryCategory; label: string }[] = [
  { key: 'usage', label: '이용 방법' },
  { key: 'bug', label: '오류 신고' },
  { key: 'account', label: '계정' },
  { key: 'payment', label: '결제' },
  { key: 'etc', label: '기타' },
];

export const INQUIRY_CATEGORY_LABEL: Record<InquiryCategory, string> = Object.fromEntries(
  INQUIRY_CATEGORIES.map(c => [c.key, c.label]),
) as Record<InquiryCategory, string>;

export interface InquirySummary {
  id: number;
  category: InquiryCategory;
  title: string;
  status: 'pending' | 'answered';
  created_at: string;
  answered_at: string | null;
  unread: boolean;
}

export interface InquiryDetail {
  id: number;
  category: InquiryCategory;
  title: string;
  content: string;
  status: 'pending' | 'answered';
  answer: string | null;
  helpful: boolean | null;
  files: string[]; // "/storage/…" — 앞에 SERVER_BASE_URL을 붙여서 사용
  created_at: string;
  answered_at: string | null;
}

export interface InquiryPhoto { uri: string; name: string; type: string }

export async function getMyInquiries(): Promise<{ items: InquirySummary[]; unread_answers: number }> {
  const res = await axios.get<ApiResponse<{ items: InquirySummary[]; unread_answers: number }>>('/inquiries');
  return res.data.data;
}

export async function getInquiry(id: number): Promise<InquiryDetail> {
  const res = await axios.get<ApiResponse<InquiryDetail>>(`/inquiries/${id}`);
  return res.data.data;
}

export async function createInquiry(payload: {
  category: InquiryCategory;
  title: string;
  content: string;
  notify: boolean;
  appVersion: string;
  pushEnabled: boolean | null;
  photos: InquiryPhoto[];
}): Promise<{ id: number }> {
  const form = new FormData();
  form.append('category', payload.category);
  form.append('title', payload.title);
  form.append('content', payload.content);
  form.append('notify', payload.notify ? '1' : '0');
  form.append('app_version', payload.appVersion);
  // 운영자가 참고하는 기기 정보 (예: Android 15)
  form.append('device', Platform.OS === 'android' ? `Android ${androidRelease()}` : `iOS ${Platform.Version}`);
  if (payload.pushEnabled !== null) form.append('push_enabled', payload.pushEnabled ? '1' : '0');
  payload.photos.forEach(p => form.append('photos[]', p as any));
  const res = await axios.post<ApiResponse<{ id: number }>>('/inquiries', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function sendInquiryFeedback(id: number, helpful: boolean): Promise<void> {
  await axios.post(`/inquiries/${id}/feedback`, { helpful });
}

export async function deleteInquiry(id: number): Promise<void> {
  await axios.delete(`/inquiries/${id}`);
}

// 안드로이드 버전 이름 (Platform.constants.Release, 없으면 API 레벨)
function androidRelease(): string {
  const c = Platform.constants as any;
  return String(c?.Release ?? `API ${Platform.Version}`);
}
