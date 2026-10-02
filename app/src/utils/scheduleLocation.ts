import type { Schedule } from '../types/api';

// ★ v18.34 — 일정 위치 표시: 등록 현장이 있으면 현장 기준, 없으면 일정에 직접 적은 주소 기준.
//   address_detail(동·호수 등)은 둘 다에 덧붙임.

type ScheduleLike = Pick<Schedule, 'site'> & { address?: string | null; address_detail?: string | null };

// "래미안 101동 1203호" 같은 짧은 이름 — 목록 제목 등에 사용
export function scheduleLocationLabel(s: ScheduleLike): string | null {
  if (s.site) {
    const site = s.site;
    const base = [site.apt_name, site.dong && `${site.dong}동`, site.ho && `${site.ho}호`].filter(Boolean).join(' ') || site.address;
    return [base, s.address_detail].filter(Boolean).join(' ') || null;
  }
  return s.address_detail || s.address || null;
}

// 도로명 주소 — 주소 복사/부제 등에 사용
export function scheduleAddress(s: ScheduleLike): string | null {
  return s.site?.address || s.address || null;
}
