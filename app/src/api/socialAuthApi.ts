import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { login as kakaoLogin } from '@react-native-seoul/kakao-login';
import axiosInstance from './axiosInstance';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '../config/socialAuth';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
  offlineAccess: false,
});

export type SocialProvider = 'google' | 'kakao';

export const PROVIDER_NAME: Record<SocialProvider, string> = { kakao: '카카오', google: '구글' };

// ★ v18.51 — 연결된 계정이 없을 때 서버가 돌려주는 정보("WorkMate가 처음이신가요?" 화면용)
export type SocialSignupNeeded = {
  needs_signup: true;
  link_ticket: string;
  social: { provider: SocialProvider; display: string };
};

/** 소셜 SDK로 로그인해 서버 검증용 토큰을 받음(구글: id_token, 카카오: access_token) */
export async function getSocialToken(provider: SocialProvider): Promise<string> {
  if (provider === 'kakao') {
    const token = await kakaoLogin();
    return token.accessToken;
  }
  await GoogleSignin.hasPlayServices();
  // 이전에 고른 구글 계정이 자동 선택되지 않게 매번 계정 선택창을 띄움(다른 계정 연결 대비)
  await GoogleSignin.signOut().catch(() => {});
  const result = await GoogleSignin.signIn();
  const idToken = result.data?.idToken;
  if (!idToken) {
    // 선택창에서 취소하면 data가 없음
    throw Object.assign(new Error('cancelled'), { code: 'SIGN_IN_CANCELLED' });
  }
  return idToken;
}

/**
 * 소셜 로그인. 응답 data는 {user, token} 또는 SocialSignupNeeded.
 * linkTicket을 주면 "쓰던 계정으로 로그인" — 로그인한 계정에 티켓의 소셜 계정을 연결.
 */
export async function socialLogin(provider: SocialProvider, linkTicket?: string) {
  const token = await getSocialToken(provider);
  const res = await axiosInstance.post('/auth/social-login', {
    provider,
    token,
    platform: 'mobile',
    flow: 'v2',
    ...(linkTicket ? { link_ticket: linkTicket } : {}),
  });
  return res.data;
}

/** "처음이에요" → 약관 동의 후 가입 */
export async function socialSignup(linkTicket: string, marketingOptIn: boolean) {
  const res = await axiosInstance.post('/auth/social-signup', {
    link_ticket: linkTicket,
    agree_terms: true,
    marketing_opt_in: marketingOptIn,
  });
  return res.data;
}

/** 소셜 사용자가 취소한 경우(에러 알림 생략용) */
export function isSocialCancel(error: any): boolean {
  const msg = String(error?.message ?? '').toLowerCase();
  return error?.code === 'SIGN_IN_CANCELLED' || error?.code === '12501' || msg.includes('cancel');
}

// ── 로그인 연결 관리 (내 정보) ──
export type LoginLinks = {
  kakao: { linked: boolean; linked_at: string | null };
  google: { linked: boolean; linked_at: string | null };
  email: { set: boolean; email: string | null };
  count: number;
};

export async function getLoginLinks(): Promise<LoginLinks> {
  const res = await axiosInstance.get('/me/login-links');
  return res.data.data;
}

export async function linkSocial(provider: SocialProvider): Promise<LoginLinks> {
  const token = await getSocialToken(provider);
  const res = await axiosInstance.post('/me/login-links', { provider, token });
  return res.data.data;
}

/** ★ v18.52 — 이메일·비밀번호 설정(소셜 가입자)/변경. email은 이메일 없는 계정만, currentPassword는 변경일 때만 */
export async function setPassword(body: {
  email?: string;
  current_password?: string;
  password: string;
  password_confirmation: string;
}): Promise<LoginLinks> {
  const res = await axiosInstance.put('/me/password', body);
  return res.data.data;
}

export async function unlinkSocial(provider: SocialProvider): Promise<LoginLinks> {
  const res = await axiosInstance.delete(`/me/login-links/${provider}`);
  return res.data.data;
}
