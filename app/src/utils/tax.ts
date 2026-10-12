// ═══════════════════════════════════════════════════════════════
// 📄 src/utils/tax.ts
//   ★ v18.66 — 예상 원천세 계산 (서버 backend/app/Services/MonthlySummaryService.php taxBreakdown과 같은 식)
//   한쪽을 바꾸면 같이 바꿀 것.
//
//   일정 1건 = 1회 지급분(하루치) 기준, 원 단위 미만 절사
//   - 지급액 = 일당 × 공수
//   - 일용근로: 소득세 = (지급액 − 15만원) × 2.7%  (세율 6% × (1 − 근로소득세액공제 55%))
//   - 프리랜서(사업소득 3.3%): 소득세 = 지급액 × 3%
//   - 소액부징수: 소득세가 1,000원 미만이면 떼지 않음 → 0원 (지방소득세도 0원)
//   - 지방소득세 = 소득세 × 10%
//   - 예상 원천세 = 소득세 + 지방소득세
// ═══════════════════════════════════════════════════════════════

export type EmploymentType = 'daily' | 'freelance';

export interface Withholding {
  /** 지급액(일당 × 공수, 원 미만 절사) */
  pay: number;
  /** 소득세 */
  incomeTax: number;
  /** 지방소득세(소득세의 10%) */
  localTax: number;
  /** 예상 원천세 합계 = 소득세 + 지방소득세 */
  total: number;
  /** 소액부징수로 0원이 됐는지(계산상 소득세가 1~999원) */
  exempt: boolean;
}

const DAILY_DEDUCTION = 150000; // 일용근로 하루 근로소득공제
const DAILY_RATE_PER_MILLE = 27; // 2.7% → 1000분의 27
const FREELANCE_RATE_PERCENT = 3; // 사업소득 원천징수 3% (지방소득세 별도)
const SMALL_AMOUNT_LIMIT = 1000; // 소액부징수 기준

/** 세무 화면 공통 안내 문구 */
export const TAX_NOTE =
  '소득세+지방소득세(10%) 포함 · 1회 지급분 소득세가 1,000원 미만이면 0원(소액부징수) · 여러 날을 한꺼번에 받으면 합산 기준이라 달라질 수 있어요';

export function estimateWithholding(
  wage: number | string | null | undefined,
  units: number | string | null | undefined,
  employmentType?: EmploymentType | string | null,
): Withholding {
  // 소수 오차 없이 정수로 계산 — 일당은 소수 2자리, 공수는 소수 1자리까지 저장됨
  const payX1000 = Math.round((Number(wage) || 0) * 100) * Math.round((Number(units) || 0) * 10);
  const pay = Math.floor(Math.max(0, payX1000) / 1000);

  let incomeTax =
    employmentType === 'freelance'
      ? Math.floor((pay * FREELANCE_RATE_PERCENT) / 100)
      : Math.floor((Math.max(0, pay - DAILY_DEDUCTION) * DAILY_RATE_PER_MILLE) / 1000);

  const exempt = incomeTax > 0 && incomeTax < SMALL_AMOUNT_LIMIT;
  if (incomeTax < SMALL_AMOUNT_LIMIT) incomeTax = 0;
  const localTax = Math.floor(incomeTax / 10);

  return { pay, incomeTax, localTax, total: incomeTax + localTax, exempt };
}
