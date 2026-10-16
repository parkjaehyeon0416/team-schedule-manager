// ★ v18.72 — 신고·차단 (Apple 1.2: 부적절한 콘텐츠 신고 + 다른 사용자 차단)
//   신고 대상: 팀 공지 / 팀 앨범 사진 / 팀원. 운영자가 24시간 안에 확인해 숨김·이용 정지.
//   차단은 한쪽만 적용 — 차단한 사람 화면에서 그 사람의 팀 공지·팀 앨범 사진·팀 활동이 안 보이고 알림도 안 옴.
//   일정 배정·정산 같은 업무 기록은 그대로(팀원 목록에는 is_blocked 표시만).
//   성공 메시지는 서버 문구를 그대로 돌려줌(토스트용, kickTeamMember와 같은 방식).
import axios from './axiosInstance';
import type { ApiResponse } from '../types/api';

export type ReportTargetType = 'team_notice' | 'photo' | 'user';
export type ReportReason = 'spam' | 'abuse' | 'sexual' | 'privacy' | 'etc';

// 신고 시트 사유 5개 — 디자인 순서대로, 백엔드 ContentReport::REASONS와 같은 키·문구
export const REPORT_REASONS: { key: ReportReason; label: string }[] = [
  { key: 'spam', label: '스팸·광고' },
  { key: 'abuse', label: '욕설·비하·혐오' },
  { key: 'sexual', label: '음란·선정적인 내용' },
  { key: 'privacy', label: '개인정보 노출' },
  { key: 'etc', label: '기타' },
];

export const REPORT_REASON_LABEL: Record<ReportReason, string> = Object.fromEntries(
  REPORT_REASONS.map(r => [r.key, r.label]),
) as Record<ReportReason, string>;

// 자세한 내용(선택) 글자 수 — 앱은 300자까지(서버는 500자까지 받음)
export const REPORT_DETAIL_MAX = 300;

export interface ReportPayload {
  target_type: ReportTargetType;
  target_id: number;
  team_id?: number; // 팀원(user) 신고일 때 필수 — 어느 팀에서 신고했는지
  reason: ReportReason;
  detail?: string;
  block?: boolean; // "이 사람 차단하기도 함께"
}

export interface ReportResult {
  id: number;
  no: string; // 신고 번호 (R-1042)
  blocked: boolean; // block=true로 함께 차단됐는지
  message?: string; // 서버 문구 ("신고를 접수했어요. 운영자가 24시간 안에 확인할게요.")
}

/** 신고하기. 같은 대상을 이미 신고해 확인 대기 중이면 서버가 기존 신고를 그대로 돌려줌 */
export async function reportContent(p: ReportPayload): Promise<ReportResult> {
  const detail = p.detail?.trim();
  const res = await axios.post<ApiResponse<Omit<ReportResult, 'message'>>>('/content-reports', {
    target_type: p.target_type,
    target_id: p.target_id,
    ...(p.team_id ? { team_id: p.team_id } : {}),
    reason: p.reason,
    ...(detail ? { detail } : {}),
    ...(p.block ? { block: true } : {}),
  });
  return { ...res.data.data, message: res.data?.message || undefined };
}

export interface BlockedUser {
  id: number;
  name: string;
  avatar_color?: string | null;
  avatar_image_path?: string | null;
  blocked_at: string;
}

/** 내정보 › 차단한 사용자 (최근 차단 순) */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const res = await axios.get<ApiResponse<BlockedUser[]>>('/blocks');
  return res.data.data;
}

/** 차단하기 — 성공 시 서버 메시지("차단했어요. 이 사람의 공지·사진·활동이 더 이상 보이지 않아요.") */
export async function blockUser(userId: number): Promise<string | undefined> {
  const res = await axios.post<ApiResponse<{ user_id: number; blocked: boolean }>>('/blocks', { user_id: userId });
  return res.data?.message || undefined;
}

/** 차단 풀기 — 차단돼 있지 않아도 성공. 성공 시 서버 메시지("차단을 풀었어요.") */
export async function unblockUser(userId: number): Promise<string | undefined> {
  const res = await axios.delete<ApiResponse<{ user_id: number; blocked: boolean }>>(`/blocks/${userId}`);
  return res.data?.message || undefined;
}
