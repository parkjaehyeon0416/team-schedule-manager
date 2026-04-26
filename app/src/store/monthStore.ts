// ═══════════════════════════════════════════════════════════════
// 📄 src/store/monthStore.ts
//   "현재 보고 있는 년/월" 전역 상태
//
//   Home 캘린더 ↔ MySummary 양방향 동기화의 진실의 원천
//   어느 화면이든 같은 store를 보고, 누가 바꾸면 모두 자동 갱신
//
//   사용법:
//     const year = useMonthStore(s => s.year);
//     const setYearMonth = useMonthStore(s => s.setYearMonth);
//     setYearMonth(2026, 4);
// ═══════════════════════════════════════════════════════════════
import { create } from 'zustand';

interface MonthStore {
  year: number;
  month: number; // 1~12
  setYearMonth: (year: number, month: number) => void;
  resetToToday: () => void;
}

// 초기값: 오늘이 속한 월
const now = new Date();

export const useMonthStore = create<MonthStore>(set => ({
  year: now.getFullYear(),
  month: now.getMonth() + 1,

  setYearMonth: (year, month) => set({ year, month }),

  resetToToday: () => {
    const today = new Date();
    set({
      year: today.getFullYear(),
      month: today.getMonth() + 1,
    });
  },
}));
