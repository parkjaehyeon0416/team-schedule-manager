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
//   ★ v18.48 — teamId를 주면 그 팀만(팀 상세 "활동" 탭) + 공지 작성·사진 올림도 포함
export interface TeamActivity {
  type: 'schedule' | 'join' | 'notice' | 'photos';
  actor_name: string;
  actor_color?: string | null;
  actor_avatar?: string | null;
  team_id: number;
  team_name: string;
  schedule_id: number | null;
  count?: number | null; // photos: 올린 사진 수
  created_at: string;
}

export async function getTeamActivities(teamId?: number, limit?: number): Promise<TeamActivity[]> {
  const res = await axios.get<ApiResponse<TeamActivity[]>>('/team-activities', {
    params: teamId ? { team_id: teamId, limit: limit ?? 20 } : undefined,
  });
  return res.data.data;
}

// ═══════════════════════════════════════════════════════════════
// ★ v18.48 — 팀 요금제 기능: 부팀장 · 팀 공지 · 팀원 정산표 · 팀 현장 앨범
// ═══════════════════════════════════════════════════════════════
export type TeamRoleLabel = '팀장' | '부팀장' | '팀원' | '나간 팀원';

export async function setSubLeader(teamId: number, userId: number, enabled: boolean): Promise<void> {
  await axios.put(`/teams/${teamId}/members/${userId}/sub-leader`, { enabled });
}

export interface TeamNotice {
  id: number;
  body: string;
  pinned: boolean;
  author: { id: number; name: string; avatar_color?: string | null; avatar_image_path?: string | null } | null;
  author_role: TeamRoleLabel;
  can_delete: boolean;
  created_at: string;
}

export interface TeamNoticeList {
  team_name: string;
  can_write: boolean;
  member_count: number;
  items: TeamNotice[];
}

export async function getTeamNotices(teamId: number): Promise<TeamNoticeList> {
  const res = await axios.get<ApiResponse<TeamNoticeList>>(`/teams/${teamId}/notices`);
  return res.data.data;
}

export async function postTeamNotice(teamId: number, body: string, pinned: boolean): Promise<TeamNotice & { notified: number }> {
  const res = await axios.post<ApiResponse<TeamNotice & { notified: number }>>(`/teams/${teamId}/notices`, { body, pinned });
  return res.data.data;
}

export async function toggleTeamNoticePin(teamId: number, noticeId: number): Promise<boolean> {
  const res = await axios.patch<ApiResponse<{ pinned: boolean }>>(`/teams/${teamId}/notices/${noticeId}/pin`);
  return res.data.data.pinned;
}

export async function deleteTeamNotice(teamId: number, noticeId: number): Promise<void> {
  await axios.delete(`/teams/${teamId}/notices/${noticeId}`);
}

export interface SettlementSchedule {
  schedule_id: number;
  date: string;
  site: string | null;
  work_type: string | null;
  work_units: number;
  daily_wage: number;
  amount: number;
  changed: { from_wage: number; from_units: number } | null; // 지급 처리 뒤 바뀐 단가·공수
  added_after_paid: boolean;
}

export interface SettlementMember {
  user_id: number;
  name: string;
  avatar_color?: string | null;
  avatar_image_path?: string | null;
  role: TeamRoleLabel;
  work_days: number;
  work_units: number;
  amount: number;
  paid: boolean;
  paid_at: string | null;
  paid_amount: number | null;
  amount_changed: boolean;
  memo: string | null;
  schedules: SettlementSchedule[];
}

export interface Settlement {
  team_id: number;
  month: string; // 2026-10
  members: SettlementMember[];
  totals: { work_units: number; amount: number; paid_amount: number; unpaid_count: number };
}

export async function getSettlement(teamId: number, month: string): Promise<Settlement> {
  const res = await axios.get<ApiResponse<Settlement>>(`/teams/${teamId}/settlements`, { params: { month } });
  return res.data.data;
}

/** paid를 빼면 메모만 저장 */
export async function markSettlement(teamId: number, userId: number, month: string, patch: { paid?: boolean; memo?: string | null }) {
  const res = await axios.post<ApiResponse<{ paid: boolean; paid_at: string | null; memo: string | null }>>(
    `/teams/${teamId}/settlements/${userId}`, { month, ...patch });
  return res.data.data;
}

export async function getSettlementXlsxLink(teamId: number, month: string): Promise<string> {
  const res = await axios.get<ApiResponse<{ url: string }>>(`/teams/${teamId}/settlements/xlsx-link`, { params: { month } });
  return res.data.data.url;
}

export type PhotoStage = 'before' | 'during' | 'after' | 'other';

export interface AlbumSite {
  id: number;
  name: string;
  address: string;
  status: string | null;
  photo_count: number;
  before_count: number;
  after_count: number;
  last_uploaded_at: string;
  previews: { url: string; category: PhotoStage }[];
}

export interface TeamAlbum {
  team_id: number;
  team_name: string;
  site_count: number;
  photo_count: number;
  sites: AlbumSite[];
}

export async function getTeamAlbum(teamId: number): Promise<TeamAlbum> {
  const res = await axios.get<ApiResponse<TeamAlbum>>(`/teams/${teamId}/album`);
  return res.data.data;
}

export interface AlbumPhoto {
  id: number;
  url: string;
  category: PhotoStage;
  description: string | null;
  site: { id: number; name: string };
  uploader: { id: number; name: string; avatar_color?: string | null; avatar_image_path?: string | null } | null;
  created_at: string;
}

export interface AlbumPhotoPage {
  site: { id: number; name: string; address: string; can_upload: boolean } | null;
  uploaders: { id: number; name: string }[];
  items: AlbumPhoto[];
  page: number;
  pages: number;
  total: number;
}

export async function getTeamAlbumPhotos(teamId: number, params: { site_id?: number; category?: PhotoStage; uploader?: number; page?: number }): Promise<AlbumPhotoPage> {
  const res = await axios.get<ApiResponse<AlbumPhotoPage>>(`/teams/${teamId}/album/photos`, { params });
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
