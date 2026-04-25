// ═══════════════════════════════════════════════════════════════
// 📄 src/utils/format.ts
//   포맷 유틸 — 금액 콤마, 공수 소수점 등
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
