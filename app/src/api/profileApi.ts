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
// ★ v18.62 — 비밀번호 없는 소셜 가입자는 password 대신 confirm('탈퇴')
export async function withdrawAccount(body: { password?: string; confirm?: string }): Promise<void> {
  await axios.delete('/account', { data: body });
}
