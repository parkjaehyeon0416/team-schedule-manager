// ★ v18.48 — 요금제 한도로 막힌 오류인지(이 경우 잠금 안내 시트가 이미 떠 있으니 화면별 실패 알림은 생략)
export function isPlanLocked(e: any): boolean {
  return e?.response?.status === 403 && e?.response?.data?.error_code === 'ERR_PLAN_001';
}
