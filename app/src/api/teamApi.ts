// ═══════════════════════════════════════════════════════════════
// 📄 src/api/teamApi.ts — 팀 관리 (★ v11.8, 모바일 연동 ★ 이번 작업)
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse, Team, TeamMember, TeamPreview } from '../types/api';

export interface TeamFormPayload {
  name: string;
  description?: string;
  specialty?: string; // 콤마 구분 공정명 목록
  activity_area?: string;
  photo?: { uri: string; name: string; type: string } | null;
}

// ★ v18.38 — 홈 "팀 활동": 내 팀들의 최근 일정 추가·팀원 참여 (최대 5건)
export interface TeamActivity {
  type: 'schedule' | 'join';
  actor_name: string;
  team_id: number;
  team_name: string;
  schedule_id: number | null;
  created_at: string;
}

export async function getTeamActivities(): Promise<TeamActivity[]> {
  const res = await axios.get<ApiResponse<TeamActivity[]>>('/team-activities');
  return res.data.data;
}

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

function buildTeamForm(payload: TeamFormPayload): FormData {
  const form = new FormData();
  form.append('name', payload.name);
  if (payload.description) form.append('description', payload.description);
  if (payload.specialty) form.append('specialty', payload.specialty);
  if (payload.activity_area) form.append('activity_area', payload.activity_area);
  if (payload.photo) form.append('photo', payload.photo as any);
  return form;
}

export async function createTeam(payload: TeamFormPayload): Promise<Team> {
  const res = await axios.post<ApiResponse<Team>>('/teams', buildTeamForm(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function joinTeam(inviteCode: string): Promise<void> {
  await axios.post('/teams/join', { invite_code: inviteCode });
}

// ★ DESIGN-CANVAS(TEAM_JOIN) 추가 — 가입 전 초대코드로 팀 정보 미리보기
export async function previewTeam(inviteCode: string): Promise<TeamPreview> {
  const res = await axios.post<ApiResponse<TeamPreview>>('/teams/preview', { invite_code: inviteCode });
  return res.data.data;
}

export async function leaveTeam(teamId?: number): Promise<void> {
  await axios.post('/teams/leave', teamId ? { team_id: teamId } : {});
}

// ★ v18.21 — 여러 팀 동시 소속 중 "지금 활동할 팀" 전환
export async function switchActiveTeam(teamId: number): Promise<void> {
  await axios.post('/teams/switch-active', { team_id: teamId });
}

export async function updateTeam(id: number, payload: TeamFormPayload): Promise<Team> {
  const form = buildTeamForm(payload);
  form.append('_method', 'PUT');
  const res = await axios.post<ApiResponse<Team>>(`/teams/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function deleteTeam(id: number): Promise<void> {
  await axios.delete(`/teams/${id}`);
}

// ★ v18.43 — 초대 코드·링크 (7일 만료, 만료됐으면 서버가 새로 발급)
export interface TeamInviteInfo {
  team_id: number;
  team_name: string;
  member_count: number;
  invite_code: string;
  expires_at: string;
  invite_url: string;
}

export async function getTeamInvite(teamId: number): Promise<TeamInviteInfo> {
  const res = await axios.get<ApiResponse<TeamInviteInfo>>(`/teams/${teamId}/invite`);
  return res.data.data;
}
