// ═══════════════════════════════════════════════════════════════
// 📄 src/api/siteApi.ts
//   현장 목록 API
//   GET/POST/PUT/DELETE /api/sites
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse, Site } from '../types/api';

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
