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
  work_days: number;
  dates: string[];
}

export interface AttendanceSummary {
  year: number;
  month: number;
  members: AttendanceMember[];
}

export async function getAttendance(
  year: number,
  month: number,
): Promise<AttendanceSummary> {
  const res = await axios.get<ApiResponse<AttendanceSummary>>('/attendance', {
    params: { year, month },
  });
  return res.data.data;
}
