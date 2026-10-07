// ★ v18.48 — 요금제 안내(GET /plans): 요금제·가격·무료 한도 + 내 현재 요금제
import axios from './axiosInstance';
import type { ApiResponse } from '../types/api';

export interface PlanItem {
  key: 'free' | 'pro' | 'team' | 'team_pro';
  name: string;
  monthly: number;
  yearly: number;
}

export interface PlanInfo {
  plans: PlanItem[];
  free_limits: { quotes_per_month: number; reports_per_month: number; photos_per_site: number; team_members: number; led_teams: number };
  me: { plan: PlanItem['key']; plan_name: string; plan_expires_at: string | null; launch_free_until: string | null; launch_free?: boolean }; // ★ v18.53 launch_free: 종료일 없는 무료 기간
}

export async function getPlans(): Promise<PlanInfo> {
  const res = await axios.get<ApiResponse<PlanInfo>>('/plans');
  return res.data.data;
}
