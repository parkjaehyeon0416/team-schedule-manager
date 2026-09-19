// ═══════════════════════════════════════════════════════════════
// 📄 src/api/teamApi.ts — 팀 관리 (★ v11.8, 모바일 연동 ★ 이번 작업)
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse, Team, TeamMember } from '../types/api';

export async function getMyTeams(): Promise<Team[]> {
  const res = await axios.get<ApiResponse<Team[]>>('/teams');
  return res.data.data;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const res = await axios.get<ApiResponse<TeamMember[]>>('/team/members');
  return res.data.data;
}

export async function createTeam(name: string): Promise<Team> {
  const res = await axios.post<ApiResponse<Team>>('/teams', { name });
  return res.data.data;
}

export async function joinTeam(inviteCode: string): Promise<void> {
  await axios.post('/teams/join', { invite_code: inviteCode });
}

export async function updateTeam(id: number, name: string): Promise<Team> {
  const res = await axios.put<ApiResponse<Team>>(`/teams/${id}`, { name });
  return res.data.data;
}

export async function deleteTeam(id: number): Promise<void> {
  await axios.delete(`/teams/${id}`);
}
