// ═══════════════════════════════════════════════════════════════
// 📄 src/utils/format.ts
//   포맷 유틸 — 금액 콤마, 공수 소수점 등
//   ★ v10.3: formatLastCalculated, formatShortKRW 추가
// ═══════════════════════════════════════════════════════════════

/**
 * 숫자 → 천단위 콤마 문자열
 * 280000 → "280,000"
 * "280000.00" → "280,000"
 * null/undefined → ""
 */
export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return Math.round(num).toLocaleString('ko-KR');
}

/**
 * "280,000" 같은 문자열 → 숫자
 * TextInput의 onChangeText에서 사용
 * 숫자 이외 문자 제거 후 parseFloat
 */
export function parseMoney(input: string): number {
  const cleaned = input.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * 공수 포맷: 1 → "1.0", 1.5 → "1.5"
 */
export function formatWorkUnits(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === '') return '1.0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '1.0';
  return num.toFixed(1);
}

// ═══════════════════════════════════════════════════════════════
// ★ v10.3 추가
// ═══════════════════════════════════════════════════════════════

/**
 * 큰 금액을 짧게 표시 (홈 화면 요약 스트립용)
 *   1,234,567  → "123만"
 *   36,000,000 → "3.6천만"
 *   950        → "950"
 *   0/null     → "0"
 */
export function formatShortKRW(value: number | null | undefined): string {
  if (!value || isNaN(value)) return '0';
  if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)}천만`;
  if (value >= 10_000) return `${Math.floor(value / 10_000)}만`;
  return value.toLocaleString('ko-KR');
}

/**
 * 두 자리 숫자 문자열로 변환 (시각 표시 도우미)
 *   9 → "09", 12 → "12"
 *   formatLastCalculated 내부에서만 사용
 */
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * UTC ISO 8601 문자열 → 한국 시각 친화 표시
 *   "2026-04-25T03:12:48.000000Z" → "오늘 12:12"  (한국 휴대폰 기준)
 *
 * 같은 날: "오늘 HH:mm"
 * 어제:    "어제 HH:mm"
 * 그 외:   "M월 D일 HH:mm"
 * null/잘못된 값: "—"
 */
export function formatLastCalculated(
  utcIso: string | null | undefined,
): string {
  if (!utcIso) return '—';

  // 1) UTC 문자열을 Date로 파싱
  //    Date 객체는 휴대폰 시간대에 맞춰서 자동으로 로컬 시각을 반환해줌
  //    → 한국 휴대폰이면 자동으로 KST(+9시간) 적용됨
  const date = new Date(utcIso);
  if (isNaN(date.getTime())) return '—';

  // 2) "오늘/어제" 비교를 위해 시·분·초를 떼고 날짜만 비교
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // 86,400,000 = 하루 = 24 * 60 * 60 * 1000 (밀리초)
  const diffDays = Math.floor(
    (today.getTime() - target.getTime()) / 86_400_000,
  );

  // 3) 시각 부분 (HH:mm)
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

  if (diffDays === 0) return `오늘 ${time}`;
  if (diffDays === 1) return `어제 ${time}`;

  // 4) 그 외: 월/일
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${time}`;
}
