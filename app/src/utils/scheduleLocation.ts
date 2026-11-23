import type { Schedule } from '../types/api';

// ★ v18.34 — 일정 위치 표시: 등록 현장이 있으면 현장 기준, 없으면 일정에 직접 적은 주소 기준.
//   address_detail(동·호수 등)은 둘 다에 덧붙임.

type ScheduleLike = Pick<Schedule, 'site'> & { address?: string | null; address_detail?: string | null };

type SiteLike = { apt_name?: string | null; dong?: string | null; ho?: string | null; address?: string | null };

/**
 * ★ v18.74 — 현장 짧은 이름 "OO아파트 101동 1203호"(동·호 글자 붙임). 견적서 화면들이 "OO아파트 101 1203"으로
 *   동·호를 빼고 보여 주던 것을 이 함수 하나로 통일. 이미 '동'·'호'로 끝나거나 글자·숫자만이 아닌 값("상가 2층")은 그대로.
 */
export function siteShortLabel(site: SiteLike): string {
  const unit = (v: string | null | undefined, suffix: string) => {
    const t = (v ?? '').trim();
    if (!t) return null;
    return t.endsWith(suffix) || !/^[0-9A-Za-z가-힣]+$/.test(t) ? t : `${t}${suffix}`;
  };
  return [site.apt_name, unit(site.dong, '동'), unit(site.ho, '호')].filter(Boolean).join(' ') || site.address || '';
}

// "OO아파트 101동 1203호" 같은 짧은 이름 — 목록 제목 등에 사용
export function scheduleLocationLabel(s: ScheduleLike): string | null {
  if (s.site) {
    const site = s.site;
    const base = siteShortLabel(site);
    return [base, s.address_detail].filter(Boolean).join(' ') || null;
  }
  return s.address_detail || s.address || null;
}

// 도로명 주소 — 주소 복사/부제 등에 사용
export function scheduleAddress(s: ScheduleLike): string | null {
  return s.site?.address || s.address || null;
}
