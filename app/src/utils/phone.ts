// ★ v18.24 — 전화번호 입력 자동 하이픈 포맷 유틸.
//   화면에는 하이픈 포함해서 보여주고, 서버 전송 직전엔 숫자만 남겨서
//   보냄(기존에 저장된 번호들이 전부 하이픈 없는 순수 숫자 형식이라
//   일관성을 유지하기 위함 — 아이디/비번찾기의 전화번호 일치 비교에 영향).
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 11);

  if (digits.length < 4) return digits;
  if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

export function stripPhoneFormatting(formatted: string): string {
  return formatted.replace(/[^0-9]/g, '');
}
