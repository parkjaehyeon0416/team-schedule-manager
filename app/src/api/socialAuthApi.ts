import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { login as kakaoLogin } from '@react-native-seoul/kakao-login';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { Platform } from 'react-native';
import axiosInstance from './axiosInstance';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '../config/socialAuth';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
  offlineAccess: false,
});

export type SocialProvider = 'google' | 'kakao' | 'apple';

export const PROVIDER_NAME: Record<SocialProvider, string> = { kakao: '카카오', google: '구글', apple: 'Apple' };

// ★ v18.51 — 연결된 계정이 없을 때 서버가 돌려주는 정보("현장메이트가 처음이신가요?" 화면용)
export type SocialSignupNeeded = {
  needs_signup: true;
  link_ticket: string;
  social: { provider: SocialProvider; display: string };
};

/** ★ v18.60 — Apple 로그인은 아이폰(iOS 13+)에서만 */
export const APPLE_LOGIN_AVAILABLE = Platform.OS === 'ios' && appleAuth.isSupported;

/**
 * 소셜 SDK로 로그인해 서버 검증용 토큰을 받음(구글: id_token, 카카오: access_token, 애플: identity token).
 * name은 애플만 — 애플은 이름을 토큰에 안 넣고 처음 로그인 때 앱에만 한 번 알려 줌.
 */
export async function getSocialCredential(provider: SocialProvider): Promise<{ token: string; name?: string }> {
  if (provider === 'apple') {
    const res = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });
    if (!res.identityToken) {
      throw Object.assign(new Error('cancelled'), { code: 'SIGN_IN_CANCELLED' });
    }
    // 한국식 이름 순서(성+이름)
    const name = [res.fullName?.familyName, res.fullName?.givenName].filter(Boolean).join('') || undefined;
    return { token: res.identityToken, name };
  }
  return { token: await getSocialToken(provider) };
}

async function getSocialToken(provider: 'google' | 'kakao'): Promise<string> {
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
  const { token, name } = await getSocialCredential(provider);
  const res = await axiosInstance.post('/auth/social-login', {
    provider,
    token,
    ...(name ? { name } : {}),
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
  // 애플 취소: code '1001'(ERR_REQUEST_CANCELED)
  return error?.code === 'SIGN_IN_CANCELLED' || error?.code === '12501' || error?.code === appleAuth.Error.CANCELED || msg.includes('cancel');
}

// ── 로그인 연결 관리 (내 정보) ──
export type LoginLinks = {
  kakao: { linked: boolean; linked_at: string | null };
  google: { linked: boolean; linked_at: string | null };
  apple: { linked: boolean; linked_at: string | null };
  email: { set: boolean; email: string | null };
  count: number;
};

export async function getLoginLinks(): Promise<LoginLinks> {
  const res = await axiosInstance.get('/me/login-links');
  return res.data.data;
}

export async function linkSocial(provider: SocialProvider): Promise<LoginLinks> {
  const { token } = await getSocialCredential(provider);
  const res = await axiosInstance.post('/me/login-links', { provider, token });
  return res.data.data;
}

/** ★ v18.52 — 이메일·비밀번호 설정(소셜 가입자)/변경. email은 이메일 없는 계정만, currentPassword는 변경일 때만 */
export async function setPassword(body: {
  email?: string;
  current_password?: string;
  password: string;
  password_confirmation: string;
  // ★ v18.63 처음 설정 때 본인 확인(문자·이메일 인증번호 또는 소셜 재로그인)
  channel?: 'phone' | 'email';
  code?: string;
  provider?: SocialProvider;
  token?: string;
}): Promise<LoginLinks> {
  const res = await axiosInstance.put('/me/password', body);
  return res.data.data;
}

/** ★ v18.63 — 처음 비밀번호 설정 전 본인 확인 방법(channel 주면 그쪽으로 인증번호 발송) */
export async function verifyPasswordSetup(channel?: 'phone' | 'email'): Promise<import('./profileApi').WithdrawMethod> {
  const res = await axiosInstance.post('/me/password/verify', channel ? { send: true, channel } : {});
  return res.data.data;
}

export async function unlinkSocial(provider: SocialProvider): Promise<LoginLinks> {
  const res = await axiosInstance.delete(`/me/login-links/${provider}`);
  return res.data.data;
}
