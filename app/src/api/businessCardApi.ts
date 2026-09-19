// ═══════════════════════════════════════════════════════════════
// 📄 src/api/businessCardApi.ts — 모바일 명함 (★ v14, 모바일 연동 ★ 이번 작업)
// ═══════════════════════════════════════════════════════════════
import axios, { SERVER_BASE_URL } from './axiosInstance';
import type { ApiResponse, BusinessCard } from '../types/api';

export interface BusinessCardInput {
  display_name?: string;
  contact_phone?: string;
  job_title?: string;
  years_experience?: number;
  service_area?: string;
  specialty?: string;
  tagline?: string;
  is_public?: boolean;
}

export async function getMyBusinessCard(): Promise<BusinessCard | null> {
  const res = await axios.get<ApiResponse<BusinessCard | null>>('/business-card');
  return res.data.data;
}

export async function saveBusinessCard(
  payload: BusinessCardInput,
): Promise<BusinessCard> {
  const res = await axios.put<ApiResponse<BusinessCard>>('/business-card', payload);
  return res.data.data;
}

export async function deleteBusinessCard(): Promise<void> {
  await axios.delete('/business-card');
}

/** 명함 공개 페이지 — 인증 불필요, Linking.openURL로 바로 열람 가능 */
export function getPublicCardUrl(shareCode: string): string {
  return `${SERVER_BASE_URL}/c/${shareCode}`;
}
