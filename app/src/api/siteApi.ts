// ═══════════════════════════════════════════════════════════════
// 📄 src/api/siteApi.ts
//   현장 목록 API
//   GET/POST/PUT/DELETE /api/sites
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse, PhotoCategory, PhotoListResponse, Site, SiteFile } from '../types/api';

export async function getSites(): Promise<Site[]> {
  const res = await axios.get<ApiResponse<Site[]>>('/sites');
  return res.data.data;
}

export interface SitePayload {
  address: string;
  apt_name?: string | null;
  dong?: string | null;
  ho?: string | null;
  area_m2?: number | null;
  memo?: string | null;
  // ★ DESIGN-CANVAS(SITE_CREATE/EDIT) 추가 필드
  start_date?: string | null;
  end_date?: string | null;
  customer?: string | null;
  status?: 'scheduled' | 'in_progress' | 'done';
  team_id?: number | null;
}

export async function createSite(payload: SitePayload): Promise<Site> {
  const res = await axios.post<ApiResponse<Site>>('/sites', payload);
  return res.data.data;
}

export async function updateSite(
  id: number,
  payload: Partial<SitePayload>,
): Promise<Site> {
  const res = await axios.put<ApiResponse<Site>>(`/sites/${id}`, payload);
  return res.data.data;
}

export async function deleteSite(id: number): Promise<void> {
  await axios.delete(`/sites/${id}`);
}

// ★ DESIGN-CANVAS(SITE_DETAIL/CREATE) — 현장 단위 사진 (일정 경유 없이 현장에 직접 업로드)
export async function getSitePhotos(siteId: number): Promise<PhotoListResponse> {
  const res = await axios.get<ApiResponse<PhotoListResponse>>(`/sites/${siteId}/photos`);
  return res.data.data;
}

export async function uploadSitePhoto(
  siteId: number,
  photo: { uri: string; name: string; type: string },
  category: PhotoCategory,
  description?: string,
): Promise<SiteFile> {
  const formData = new FormData();
  formData.append('photo', photo as any);
  formData.append('photo_category', category);
  if (description) formData.append('description', description);
  const res = await axios.post<ApiResponse<SiteFile>>(`/sites/${siteId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function deleteSitePhoto(siteId: number, photoId: number): Promise<void> {
  await axios.delete(`/sites/${siteId}/photos/${photoId}`);
}
