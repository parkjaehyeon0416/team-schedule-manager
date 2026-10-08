// ★ v18.62 — 비밀번호 규칙(서버 backend/app/Support/PasswordPolicy.php, 앱과 같음): 영문 + 특수문자 포함, 8~16자, 공백·한글 불가
export const PASSWORD_HINT = '영문과 특수문자를 포함해 8~16자로 입력해주세요.';
export const PASSWORD_PLACEHOLDER = '영문+특수문자 8~16자';

/** 규칙에 맞으면 null, 아니면 안내 문구 */
export function passwordError(pw: string): string | null {
  if (
    pw.length < 8 || pw.length > 16 ||
    !/^[\x21-\x7E]+$/.test(pw) ||
    !/[A-Za-z]/.test(pw) ||
    !/[!-/:-@[-`{-~]/.test(pw)
  ) {
    return PASSWORD_HINT;
  }
  return null;
}
