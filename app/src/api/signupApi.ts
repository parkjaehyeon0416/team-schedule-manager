// ═══════════════════════════════════════════════════════════════
// 📄 src/api/signupApi.ts — 이메일 회원가입 (★ v18.68)
//   디자인 AUTH_SIGNUP_PROFILE: 가입 전에 휴대폰 문자 인증을 마쳐야 함.
//   ① 인증번호 받기 → ② 6자리 확인(phone_token 받음) → ③ 가입할 때 phone_token 같이 보냄
//   (로그인 전이라 토큰 없이 호출. phone은 숫자만)
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse } from '../types/api';

/** 가입 화면 '주요 공정' 칩 — 디자인에 정해진 목록(선택 안 해도 됨) */
export const SIGNUP_WORK_TYPES = ['도배', '타일', '필름', '도장', '목공', '기타'] as const;

/** ① 인증번호 발송. 409 ERR_AUTH_019 = 이미 가입된 번호, 429 = 대기/하루 상한/잠금 */
export async function sendSignupPhoneCode(phone: string): Promise<{ minutes?: number }> {
  const res = await axios.post<ApiResponse<{ minutes?: number } | null>>('/auth/signup/phone/send', { phone });
  return res.data.data ?? {};
}

/** ② 인증번호 확인 → 가입 때 보낼 phone_token(30분 유효). 422 ERR_AUTH_010 = 틀렸거나 만료 */
export async function verifySignupPhoneCode(
  phone: string,
  code: string,
): Promise<{ phone_token: string; expires_in?: number }> {
  const res = await axios.post<ApiResponse<{ phone_token: string; expires_in?: number }>>(
    '/auth/signup/phone/verify',
    { phone, code },
  );
  return res.data.data;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string; // 숫자만 — 인증한 번호와 같아야 함
  password: string;
  password_confirmation: string;
  platform: 'mobile';
  agree_terms: true;
  phone_token: string;
  main_work_types?: string[];
}

/** ③ 가입 — 성공하면 바로 로그인 상태(user, token). 422 ERR_AUTH_020 = 휴대폰 인증 만료 → 다시 인증 */
export async function registerAccount(payload: RegisterPayload): Promise<ApiResponse<{ user: any; token: string }>> {
  const res = await axios.post<ApiResponse<{ user: any; token: string }>>('/auth/register', payload);
  return res.data;
}
