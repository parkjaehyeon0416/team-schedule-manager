// ★ v18.48 — 요금제 한도에 걸렸을 때(서버 403 ERR_PLAN_001) 띄우는 "잠금 안내 시트"(PLAN_LOCKED) 상태.
//   axiosInstance 응답 인터셉터가 show()를 부르고, App 최상단의 PlanLockedSheet가 그림.
import { create } from 'zustand';

export interface PlanLockInfo {
  feature: string;
  upgrade_plan: 'pro' | 'team';
  limit: number | null;
  used: number | null;
  unit: string | null;
  resets_on: string | null; // 2026-11-01
  message: string;
}

interface PlanLockState {
  info: PlanLockInfo | null;
  show: (info: PlanLockInfo) => void;
  hide: () => void;
}

export const usePlanLockStore = create<PlanLockState>(set => ({
  info: null,
  show: info => set({ info }),
  hide: () => set({ info: null }),
}));
