// ═══════════════════════════════════════════════════════════════
// 📄 src/api/workTypesApi.ts
//   공정 목록 API
//   GET /api/work-types
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse, WorkType } from '../types/api';

/**
 * 공정 목록 조회
 * - 공용 공정(team_id=null) + 내 팀 커스텀 공정
 * - is_active=true만 반환
 * - sort_order 오름차순 정렬
 */
export async function getWorkTypes(): Promise<WorkType[]> {
  const res = await axios.get<ApiResponse<WorkType[]>>('/work-types');
  return res.data.data;
}
