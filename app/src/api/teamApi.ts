// ═══════════════════════════════════════════════════════════════
// 📄 src/api/teamApi.ts — 팀 관리 (★ v11.8, 모바일 연동 ★ 이번 작업)
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse, Team, TeamMember } from '../types/api';

export async function getMyTeams(): Promise<Team[]> {
  const res = await axios.get<ApiResponse<Team[]>>('/teams');
  return res.data.data;
}

export async function getTeamMembers(teamId?: number): Promise<TeamMember[]> {
  const res = await axios.get<ApiResponse<TeamMember[]>>('/team/members', {
    params: teamId ? { team_id: teamId } : undefined,
  });
  return res.data.data;
}

export async function createTeam(name: string): Promise<Team> {
  const res = await axios.post<ApiResponse<Team>>('/teams', { name });
  return res.data.data;
}

export async function joinTeam(inviteCode: string): Promise<void> {
  await axios.post('/teams/join', { invite_code: inviteCode });
}

export async function leaveTeam(teamId?: number): Promise<void> {
  await axios.post('/teams/leave', teamId ? { team_id: teamId } : {});
}

// ★ v18.21 — 여러 팀 동시 소속 중 "지금 활동할 팀" 전환
export async function switchActiveTeam(teamId: number): Promise<void> {
  await axios.post('/teams/switch-active', { team_id: teamId });
}

export async function updateTeam(id: number, name: string): Promise<Team> {
  const res = await axios.put<ApiResponse<Team>>(`/teams/${id}`, { name });
  return res.data.data;
}

export async function deleteTeam(id: number): Promise<void> {
  await axios.delete(`/teams/${id}`);
}
