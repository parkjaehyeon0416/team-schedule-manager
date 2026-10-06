// ★ v18.43 — 운영 메뉴 API: 고객 문의 / 문자 템플릿·발송 / 통계
import axiosInstance from "./axiosInstance";
import type { ApiResponse } from "../types";

// ── 고객 문의 ──────────────────────────
export type InquiryCategory = "usage" | "bug" | "account" | "payment" | "etc";
export const CATEGORY_LABEL: Record<InquiryCategory, string> = {
  usage: "이용 방법", bug: "오류 신고", account: "계정", payment: "결제", etc: "기타",
};

export interface InquiryRow {
  id: number;
  no: string;
  category: InquiryCategory;
  title: string;
  status: "pending" | "answered";
  user: { id: number; name: string } | null;
  created_at: string;
  answered_at: string | null;
}

export interface InquiryPage {
  items: InquiryRow[];
  total: number;
  page: number;
  pages: number;
  counts: { all: number; pending: number; answered: number };
  summary: {
    pending: number;
    oldest_pending_hours: number | null;
    today: number;
    answered_week: number;
    avg_first_answer_minutes: number | null;
    month: number;
    month_by_category: Partial<Record<InquiryCategory, number>>;
  };
}

export interface InquiryDetail extends InquiryRow {
  content: string;
  answer: string | null;
  notify: boolean;
  helpful: boolean | null;
  files: string[];
  app_version: string | null;
  device: string | null;
  push_enabled: boolean | null;
  member: { id: number; name: string; email: string; phone: string | null; joined_at: string; team: string | null; region: string | null } | null;
  previous: { id: number; title: string; status: string; created_at: string }[];
  previous_count: number;
}

export const getInquiries = async (params: { status?: string; category?: string; q?: string; page?: number }) =>
  (await axiosInstance.get<ApiResponse<InquiryPage>>("/api/admin/inquiries", { params })).data.data;

export const getInquiry = async (id: number) =>
  (await axiosInstance.get<ApiResponse<InquiryDetail>>(`/api/admin/inquiries/${id}`)).data.data;

export const answerInquiry = async (id: number, answer: string, notify: boolean) =>
  (await axiosInstance.post<ApiResponse<InquiryRow & { answer: string; notified: boolean }>>(`/api/admin/inquiries/${id}/answer`, { answer, notify })).data.data;

// ── 문자 ────────────────────────────────
export type SmsKind = "ad" | "info";
export type SmsTarget = "all" | "recent30" | "inactive30";
export const TARGET_LABEL: Record<SmsTarget, string> = { all: "전체 회원", recent30: "최근 30일 가입", inactive30: "30일 이상 미접속" };

export interface SmsTemplate {
  id: number;
  name: string;
  kind: SmsKind;
  body: string;
  notice_id: number | null;
  notice: { id: number; type: string; title: string } | null;
  type: "SMS" | "LMS";
  final_body: string; // 실제 나가는 문구((광고)·링크·수신거부 포함, {이름}은 그대로)
  updated_at: string;
}

export interface SmsConfig { ad_opt_out: string; sender: string | null; link_base: string }
export const getSmsConfig = async () => (await axiosInstance.get<ApiResponse<SmsConfig>>("/api/admin/sms/config")).data.data;

// 서버 AdminSmsController::finalBody와 같은 규칙 (작성 화면 실시간 미리보기용)
export function buildSmsBody(kind: SmsKind, body: string, noticeId: number | null, cfg: SmsConfig | null): string {
  let text = body.trim();
  const link = noticeId && cfg ? `\n${cfg.link_base}${noticeId}` : "";
  if (kind !== "ad") return text + link;
  text = text.replace(/^\(광고\)\s*/, "");
  if (!text.includes("WorkMate")) text = `[WorkMate] ${text}`;
  return `(광고)${text}${link}\n${cfg?.ad_opt_out ?? ""}`;
}

export interface SmsPreview {
  recipient_count: number;
  excluded_count: number;
  target_counts: Record<SmsTarget, number>;
  final_body: string;
  bytes: number;
  type: "SMS" | "LMS";
  blocked_reason: string | null;
}

export interface SmsCampaign {
  id: number;
  template: string | null;
  kind: SmsKind;
  type: "SMS" | "LMS";
  target: string | null;
  recipient_count: number;
  success_count: number;
  fail_count: number;
  status: "sending" | "done" | "failed";
  sent_by: string | null;
  created_at: string;
}

export type TemplateInput = { name: string; kind: SmsKind; body: string; notice_id: number | null };

export const getSmsTemplates = async () => (await axiosInstance.get<ApiResponse<SmsTemplate[]>>("/api/admin/sms/templates")).data.data;
export const getSmsTemplate = async (id: number) => (await axiosInstance.get<ApiResponse<SmsTemplate>>(`/api/admin/sms/templates/${id}`)).data.data;
export const createSmsTemplate = async (t: TemplateInput) => (await axiosInstance.post<ApiResponse<SmsTemplate>>("/api/admin/sms/templates", t)).data.data;
export const updateSmsTemplate = async (id: number, t: TemplateInput) => (await axiosInstance.put<ApiResponse<SmsTemplate>>(`/api/admin/sms/templates/${id}`, t)).data.data;
export const deleteSmsTemplate = async (id: number) => { await axiosInstance.delete(`/api/admin/sms/templates/${id}`); };
export const sendTestSms = async (t: { kind: SmsKind; body: string; notice_id: number | null; phone: string }) =>
  (await axiosInstance.post<ApiResponse<null>>("/api/admin/sms/test", t)).data;
export const previewSms = async (template_id: number, target: SmsTarget) =>
  (await axiosInstance.post<ApiResponse<SmsPreview>>("/api/admin/sms/preview", { template_id, target })).data.data;
export const sendSms = async (template_id: number, target: SmsTarget) =>
  (await axiosInstance.post<ApiResponse<SmsCampaign>>("/api/admin/sms/send", { template_id, target })).data.data;
export const getSmsCampaigns = async () => (await axiosInstance.get<ApiResponse<SmsCampaign[]>>("/api/admin/sms/campaigns")).data.data;

// 문자 요금 기준 바이트 (한글 2, 영문·숫자 1) — 서버와 같은 계산
export function smsBytes(s: string): number {
  let b = 0;
  for (const ch of s) b += ch.charCodeAt(0) > 127 ? 2 : 1;
  return b;
}

// ── 통계 ────────────────────────────────
export interface StatsDay { date: string; signups: number; inquiries: number; active_users: number }
export interface Stats {
  from: string;
  to: string;
  series: StatsDay[];
  totals: { signups: number; inquiries: number; active_users_avg: number; active_users_unique: number };
  now: { members: number; signups_today: number; active_today: number; pending_inquiries: number; oldest_pending_hours: number | null };
}
export const getStats = async (from: string, to: string) =>
  (await axiosInstance.get<ApiResponse<Stats>>("/api/admin/stats", { params: { from, to } })).data.data;
