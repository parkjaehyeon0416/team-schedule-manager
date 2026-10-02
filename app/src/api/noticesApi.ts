// ═══════════════════════════════════════════════════════════════
// 📄 src/api/noticesApi.ts — 공지사항·이벤트 (★ DESIGN-CANVAS(NOTICE_LIST/DETAIL, EVENT_DETAIL))
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse } from '../types/api';

export type NoticeType = 'notice' | 'event';

export interface NoticeSummary {
  id: number;
  type: NoticeType;
  title: string;
  summary: string | null;
  banner_path: string | null;
  is_pinned: boolean;
  starts_at: string | null;
  ends_at: string | null;
  published_at: string;
}

export interface NoticeDetail extends NoticeSummary {
  body: string | null;
  info: { label: string; value: string }[] | null;
  steps: { title: string; desc?: string }[] | null;
  cautions: string[] | null;
  cta_label: string | null;
  cta_route: string | null;
  author: string;
  prev: { id: number; title: string } | null;
  next: { id: number; title: string } | null;
}

export async function getNotices(type?: NoticeType): Promise<NoticeSummary[]> {
  const res = await axios.get<ApiResponse<NoticeSummary[]>>('/notices', { params: type ? { type } : undefined });
  return res.data.data;
}

export async function getLatestNotice(): Promise<NoticeSummary | null> {
  const res = await axios.get<ApiResponse<NoticeSummary | null>>('/notices/latest');
  return res.data.data;
}

export async function getNotice(id: number): Promise<NoticeDetail> {
  const res = await axios.get<ApiResponse<NoticeDetail>>(`/notices/${id}`);
  return res.data.data;
}
