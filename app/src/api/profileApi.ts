// ═══════════════════════════════════════════════════════════════
// 📄 src/api/profileApi.ts — 내 프로필 설정 (★ v18.23)
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse } from '../types/api';

// ★ v18.66 — 휴대폰 번호는 여기서 안 보냄(서버가 다른 번호면 거절) → changePhone()으로만 변경
export interface UpdateProfilePayload {
  kakao_talk_id?: string;
  avatar_color?: string;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<any> {
  const res = await axios.put<ApiResponse<any>>('/profile', payload);
  return res.data.data;
}

export async function uploadAvatar(fileUri: string, fileName: string, mimeType: string): Promise<any> {
  const form = new FormData();
  form.append('avatar', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  const res = await axios.post<ApiResponse<any>>('/profile/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function deleteAvatar(): Promise<any> {
  const res = await axios.delete<ApiResponse<any>>('/profile/avatar');
  return res.data.data;
}

// ★ DESIGN-CANVAS(APP_INFO) 추가 — 회원 탈퇴 (2026-10-02)
// ★ v18.63 — 탈퇴 본인 확인 방법: password(비밀번호) | code(문자·이메일 인증번호) | social(소셜 다시 로그인)
export type WithdrawChannel = { type: 'phone' | 'email'; target: string }; // target은 가린 값(010-****-1234)
export type WithdrawMethod = {
  method: 'password' | 'code' | 'social';
  channels: WithdrawChannel[];
  providers: ('google' | 'kakao' | 'apple')[];
  minutes: number;
};

/** channel을 주면 그쪽으로 인증번호 발송(method=code일 때만) */
export async function requestWithdraw(channel?: 'phone' | 'email'): Promise<WithdrawMethod> {
  const res = await axios.post('/account/withdraw-request', channel ? { send: true, channel } : {});
  return res.data.data;
}

export async function withdrawAccount(body: { password?: string; channel?: string; code?: string; provider?: string; token?: string }): Promise<void> {
  await axios.delete('/account', { data: body });
}

// ★ v18.66 — 휴대폰 번호 변경(등록): ① 본인 확인 + ② 새 번호 문자 인증 → 둘 다 맞아야 저장
/** ① 본인 확인 방법(비밀번호/인증번호/소셜). channel을 주면 그쪽(지금 번호·이메일)으로 인증번호 발송
 *  ★ v18.66 여기선 method=code여도 providers(연결된 소셜)가 옴 — 지금 번호를 못 쓰면 소셜 다시 로그인으로 확인 */
export async function requestPhoneReauth(channel?: 'phone' | 'email'): Promise<WithdrawMethod> {
  const res = await axios.post('/profile/phone/reauth', channel ? { send: true, channel } : {});
  return res.data.data;
}

/** ② 새 번호로 인증번호 발송(phone은 숫자만). ★ v18.66 resend_after: 같은 번호로 다시 받기까지 남은 초
 *  (너무 빨리 다시 누르면 429 + data.retry_after) */
export async function sendNewPhoneCode(phone: string): Promise<{ minutes: number; resend_after?: number }> {
  const res = await axios.post('/profile/phone/code', { phone });
  return res.data.data;
}

/** 저장 — 성공하면 바뀐 사용자 정보. 에러의 errors.phone / errors.phone_code는 ② 쪽, 나머지는 ① 쪽 */
export async function changePhone(body: {
  phone: string; phone_code: string;
  password?: string; channel?: string; code?: string; provider?: string; token?: string;
}): Promise<any> {
  const res = await axios.put<ApiResponse<any>>('/profile/phone', body);
  return res.data.data;
}
