import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { login as kakaoLogin } from '@react-native-seoul/kakao-login';
import axiosInstance from './axiosInstance';
import { GOOGLE_WEB_CLIENT_ID } from '../config/socialAuth';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

async function socialLogin(provider: 'google' | 'kakao', token: string) {
  const res = await axiosInstance.post('/auth/social-login', {
    provider,
    token,
    platform: 'mobile',
  });
  return res.data;
}

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices();
  const result = await GoogleSignin.signIn();
  const idToken = result.data?.idToken;
  if (!idToken) {
    throw new Error('구글에서 idToken을 받지 못했습니다.');
  }
  return socialLogin('google', idToken);
}

export async function signInWithKakao() {
  const token = await kakaoLogin();
  return socialLogin('kakao', token.accessToken);
}
