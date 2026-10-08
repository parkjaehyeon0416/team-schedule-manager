// ═══════════════════════════════════════════════════════════════
// 📄 src/api/profileApi.ts — 내 프로필 설정 (★ v18.23)
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse } from '../types/api';

export interface UpdateProfilePayload {
  phone?: string;
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
// ★ v18.63 — 탈퇴 본인 확인 방법: password(비밀번호) | email(이메일 인증번호) | social(소셜 다시 로그인)
export type WithdrawMethod = {
  method: 'password' | 'email' | 'social';
  email: string | null; // 가린 이메일(chu****@gmail.com)
  providers: ('google' | 'kakao' | 'apple')[];
  minutes: number;
};

/** send=true면 이메일로 인증번호 발송(method=email일 때만) */
export async function requestWithdraw(send = false): Promise<WithdrawMethod> {
  const res = await axios.post('/account/withdraw-request', { send });
  return res.data.data;
}

export async function withdrawAccount(body: { password?: string; code?: string; provider?: string; token?: string }): Promise<void> {
  await axios.delete('/account', { data: body });
}
