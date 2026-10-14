// ═══════════════════════════════════════════════════════════════
// 📄 src/api/businessCardApi.ts — 모바일 명함 (★ v14, 모바일 연동 ★ 이번 작업)
// ═══════════════════════════════════════════════════════════════
import axios, { SERVER_BASE_URL } from './axiosInstance';
import type { ApiResponse, BusinessCard, BusinessCardShowcaseMode } from '../types/api';

export interface BusinessCardInput {
  display_name?: string;
  contact_phone?: string;
  job_title?: string;
  years_experience?: number;
  service_area?: string;
  specialty?: string;
  tagline?: string;
  is_public?: boolean;
  /** ★ v18.68 — 현장 사진 공개 범위. PUT은 부분 갱신({ is_public } / { showcase_mode }만 보내도 됨) */
  showcase_mode?: BusinessCardShowcaseMode;
}

/**
 * ★ v18.68 — 지금 공개 명함 웹페이지(/c/{code})에 보이는 현장 사진 한 장.
 *   url은 서버 기준 상대 주소(/c/{code}/p/{id}) — 웹페이지와 같은 EXIF 없는 640px 사진. showcasePhotoUri()로 열기.
 *   after 모드는 시공 후 사진만(pair_index 없음), both 모드는 같은 pair_index의 시공 전·후가 한 쌍.
 */
export interface BusinessCardShowcasePhoto {
  url: string;
  category: 'before' | 'after';
  pair_index?: number;
}

/** ★ v18.68 — GET/PUT /business-card 응답: 명함 + showcase_photos(비공개·사진 공개 안 함·사진 없음이면 빈 배열) */
export type MyBusinessCard = BusinessCard & { showcase_photos?: BusinessCardShowcasePhoto[] };

export async function getMyBusinessCard(): Promise<MyBusinessCard | null> {
  const res = await axios.get<ApiResponse<MyBusinessCard | null>>('/business-card');
  return res.data.data;
}

/** ★ v18.68 — 공개 명함 사진 주소(상대 경로)를 앱에서 열 수 있는 전체 주소로 */
export function showcasePhotoUri(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${SERVER_BASE_URL}${url}`;
}

export async function saveBusinessCard(
  payload: BusinessCardInput,
): Promise<MyBusinessCard> {
  const res = await axios.put<ApiResponse<MyBusinessCard>>('/business-card', payload);
  return res.data.data;
}

/** ★ v18.68 — 명함 공개 / 현장 사진 공개만 바꾸기 (부분 PUT, 전체 명함을 돌려받음) */
export async function updateBusinessCardVisibility(
  patch: Pick<BusinessCardInput, 'is_public' | 'showcase_mode'>,
): Promise<MyBusinessCard> {
  return saveBusinessCard(patch);
}

export async function deleteBusinessCard(): Promise<void> {
  await axios.delete('/business-card');
}

/** 명함 공개 페이지 — 인증 불필요, Linking.openURL로 바로 열람 가능 */
export function getPublicCardUrl(shareCode: string): string {
  return `${SERVER_BASE_URL}/c/${shareCode}`;
}
