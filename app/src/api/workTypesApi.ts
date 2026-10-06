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

export interface CreateWorkTypePayload {
  name: string;
  color?: string;
  is_personal?: boolean;
  team_id?: number | null; // ★ v18.44 어느 팀 공정으로 넣을지 (생략 시 활성 팀)
}

/**
 * 커스텀 공정 추가
 * - 팀 공정은 그 팀의 팀장만 가능 — 서버에서 검증
 * - is_personal: true면 팀 소속이어도 나만 쓰는 개인 공정으로 등록
 */
export async function createWorkType(
  payload: CreateWorkTypePayload,
): Promise<WorkType> {
  const res = await axios.post<ApiResponse<WorkType>>('/work-types', payload);
  return res.data.data;
}
