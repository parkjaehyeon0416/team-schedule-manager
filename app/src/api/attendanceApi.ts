// ═══════════════════════════════════════════════════════════════
// 📄 src/api/attendanceApi.ts
//   근태 현황 (팀장 전용) — GET /api/attendance?year=&month=
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse } from '../types/api';

export interface AttendanceMember {
  id: number;
  name: string;
  role_id: number;
  role?: '팀장' | '부팀장' | '팀원'; // ★ v18.48
  avatar_color?: string | null;
  avatar_image_path?: string | null;
  work_days: number;
  dates: string[];
}

export interface AttendanceSummary {
  team_id?: number;
  year: number;
  month: number;
  members: AttendanceMember[];
}

// ★ v18.44 — teamId로 내가 팀장인 팀 중 하나를 지정(활성 팀이 아니어도 됨)
export async function getAttendance(
  year: number,
  month: number,
  teamId?: number | null,
): Promise<AttendanceSummary> {
  const res = await axios.get<ApiResponse<AttendanceSummary>>('/attendance', {
    params: teamId ? { year, month, team_id: teamId } : { year, month },
  });
  return res.data.data;
}
