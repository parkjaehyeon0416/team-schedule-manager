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
