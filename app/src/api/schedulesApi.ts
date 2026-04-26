// ═══════════════════════════════════════════════════════════════
// 📄 src/api/schedulesApi.ts
//   일정 관련 API 모음
//   v9.0 필드 (work_type_id, daily_wage, work_units, expenses 등) 포함
//   ★ v10.3: getMonthlySummary 추가
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type {
  ApiResponse,
  Schedule,
  TeamMember,
  MonthlySummary, // ★ v10.3 추가
} from '../types/api';

// ─────────────────────────────────────────────────────────────────
// [타입] 일정 등록 payload
// ─────────────────────────────────────────────────────────────────
export interface CreateSchedulePayload {
  date: string; // "2026-04-15"
  site_id?: number | null;

  // v7 기존 필드
  district?: string | null;
  work_type?: '도배' | '타일' | '필름' | null; // 기존 ENUM
  area_m2?: number | null;
  memo?: string | null;
  user_ids?: number[];

  // ★ v9.0 / v10.2 신규 필드
  work_type_id?: number | null;
  daily_wage?: number | null;
  work_units?: number;
  expenses?: number;
  expenses_memo?: string | null;
}

// 수정은 "일부 필드만" 보낼 수 있으므로 Partial 사용
export type UpdateSchedulePayload = Partial<CreateSchedulePayload>;

// ─────────────────────────────────────────────────────────────────
// [조회] 일정 목록 조회
// GET /api/schedules?year=&month=
// ─────────────────────────────────────────────────────────────────
export async function getSchedules(
  year?: number,
  month?: number,
): Promise<Schedule[]> {
  const params: Record<string, number> = {};
  if (year) params.year = year;
  if (month) params.month = month;

  const res = await axios.get<ApiResponse<Schedule[]>>('/schedules', {
    params,
  });
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────────
// [조회] 일정 단일 조회
// GET /api/schedules/{id}
// ─────────────────────────────────────────────────────────────────
export async function getScheduleById(id: number): Promise<Schedule> {
  const res = await axios.get<ApiResponse<Schedule>>(`/schedules/${id}`);
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────────
// [등록] 일정 신규 생성
// POST /api/schedules
// ─────────────────────────────────────────────────────────────────
export async function createSchedule(
  payload: CreateSchedulePayload,
): Promise<Schedule> {
  const res = await axios.post<ApiResponse<Schedule>>('/schedules', payload);
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────────
// [수정] 일정 수정
// PUT /api/schedules/{id}
// ─────────────────────────────────────────────────────────────────
export async function updateSchedule(
  id: number,
  payload: UpdateSchedulePayload,
): Promise<Schedule> {
  const res = await axios.put<ApiResponse<Schedule>>(
    `/schedules/${id}`,
    payload,
  );
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────────
// [삭제] 일정 삭제 (SoftDelete)
// DELETE /api/schedules/{id}
// ─────────────────────────────────────────────────────────────────
export async function deleteSchedule(id: number): Promise<void> {
  await axios.delete(`/schedules/${id}`);
}

// ─────────────────────────────────────────────────────────────────
// [조회] 팀원 목록 (ScheduleCreateScreen에서 사용)
// GET /api/team/members
// ─────────────────────────────────────────────────────────────────
export async function getTeamMembers(): Promise<TeamMember[]> {
  const res = await axios.get<ApiResponse<TeamMember[]>>('/team/members');
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────────
// ★ v10.3 추가
// [조회] 월별 수입 집계
// GET /api/monthly-summary?year=2026&month=4
//
// year/month로 지정한 달의 집계 데이터를 가져옵니다.
// 해당 월에 일정이 없으면 모든 숫자가 "0"이고
// last_calculated_at은 null로 응답됩니다.
// ─────────────────────────────────────────────────────────────────
export async function getMonthlySummary(
  year: number,
  month: number,
): Promise<MonthlySummary> {
  const res = await axios.get<ApiResponse<MonthlySummary>>('/monthly-summary', {
    params: { year, month },
  });
  return res.data.data;
}
