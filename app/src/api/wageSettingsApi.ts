// ═══════════════════════════════════════════════════════════════
// 📄 src/api/wageSettingsApi.ts
//   내 단가 설정 API
//   GET/POST/DELETE /api/wage-settings
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse, WageSetting } from '../types/api';

/**
 * 내 단가 목록 조회
 */
export async function getWageSettings(): Promise<WageSetting[]> {
  const res = await axios.get<ApiResponse<WageSetting[]>>('/wage-settings');
  return res.data.data;
}

/**
 * 단가 등록/수정 (updateOrCreate)
 * - 같은 work_type_id가 있으면 UPDATE, 없으면 INSERT
 */
export interface SaveWagePayload {
  work_type_id: number;
  default_wage: number;
  default_work_units?: number;
  memo?: string | null;
}

export async function saveWageSetting(
  payload: SaveWagePayload,
): Promise<WageSetting> {
  const res = await axios.post<ApiResponse<WageSetting>>(
    '/wage-settings',
    payload,
  );
  return res.data.data;
}

/**
 * 단가 삭제 (SoftDelete)
 */
export async function deleteWageSetting(id: number): Promise<void> {
  await axios.delete(`/wage-settings/${id}`);
}
