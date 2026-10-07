// ★ v18.51 — 디자인 SOCIAL_LINK_SIGNIN: "이미 계정이 있어요" → 쓰던 방법으로 로그인하면 들어온 소셜 계정이 자동 연결.
//   완료 상태(SOCIAL_LINK_SIGNIN_DONE)는 같은 화면에서 보여주고 "홈으로"를 눌러야 로그인 상태로 전환.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import axiosInstance from '../api/axiosInstance';
import { socialLogin, isSocialCancel, PROVIDER_NAME, SocialProvider } from '../api/socialAuthApi';
import GradientButton from '../components/GradientButton';
import { ProviderBadge, SocialButton, OrDivider, AuthInput, FindLinks } from '../components/AuthUi';
import { ICONS } from '../assets/icons';
import type { SocialFlowParams } from './SocialFirstLoginScreen';

const GA: Record<SocialProvider, string> = { kakao: '카카오가', google: '구글이' };
const OTHERS: SocialProvider[] = ['kakao', 'google'];

export default function SocialLinkSigninScreen() {
  const navigation = useNavigation<any>();
  const params = useRoute<any>().params as SocialFlowParams;
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<SocialProvider | 'email' | null>(null);
  const [done, setDone] = useState<{ user: any; token: string } | null>(null);
  const via = PROVIDER_NAME[params.provider];

  const onFail = (e: any) => {
    if (isSocialCancel(e)) return;
    const code = e?.response?.data?.error_code;
    const msg = code === 'ERR_AUTH_001'
      ? '이메일 또는 비밀번호를 확인해주세요.'
      : e?.response?.data?.message ?? '잠시 후 다시 시도해주세요.';
    Alert.alert(code === 'ERR_AUTH_014' ? `${via}를 연결하지 못했어요` : '로그인하지 못했어요', msg, [
      // 티켓 만료면 처음(로그인 화면)부터 다시
      { text: '확인', onPress: () => code === 'ERR_AUTH_013' && navigation.popToTop() },
    ]);
  };

  const loginWith = async (provider: SocialProvider) => {
    setBusy(provider);
    try {
      const res = await socialLogin(provider, params.ticket);
      setDone({ user: res.data.user, token: res.data.token });
    } catch (e: any) {
      onFail(e);
    } finally {
      setBusy(null);
    }
  };

  const loginWithEmail = async () => {
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setBusy('email');
    try {
      const res = await axiosInstance.post('/auth/login', { email, password, platform: 'mobile', link_ticket: params.ticket });
      setDone({ user: res.data.data.user, token: res.data.data.token });
    } catch (e: any) {
      onFail(e);
    } finally {
      setBusy(null);
    }
  };

  const goHome = () => done && setAuth(done.user, done.token, params.keepLoggedIn ?? true);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => (done ? goHome() : navigation.goBack())} style={styles.iconBtn} accessibilityLabel="뒤로가기">
          <Icon name="chevron-left" size={26} color="#102A56" />
        </Pressable>
      </View>

      {done ? (
        <View style={styles.doneWrap} accessibilityLiveRegion="polite">
          <View>
            <Image source={ICONS.logo} style={{ width: 84, height: 84, resizeMode: 'contain' }} />
            <ProviderBadge provider={params.provider} size={36} style={styles.doneBadge} />
          </View>
          <Text style={styles.doneTitle}>{GA[params.provider]} 연결됐어요</Text>
          <Text style={styles.desc}>
            다음부터는 {via}로 바로 로그인할 수 있어요.{'\n'}연결은 내 정보 › 로그인 연결 관리에서 바꿀 수 있어요.
          </Text>
          <View style={{ height: 24 }} />
          <GradientButton onPress={goHome} style={{ alignSelf: 'stretch' }}>홈으로</GradientButton>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.main} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Image source={ICONS.logo} style={{ width: 64, height: 64, resizeMode: 'contain' }} />
            <Text style={styles.title}>쓰던 계정으로 로그인</Text>
            <Text style={styles.desc}>원래 쓰던 방법으로 로그인하면{'\n'}{GA[params.provider]} 자동으로 연결돼요.</Text>
          </View>

          <View style={styles.chip}>
            <ProviderBadge provider={params.provider} size={30} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.chipSub}>로그인 후 연결될 계정</Text>
              <Text style={styles.chipName} numberOfLines={1}>{params.display}</Text>
            </View>
            <Icon name="link-variant" size={18} color="#0A6CE0" />
          </View>

          <View style={{ gap: 10 }}>
            {OTHERS.filter(p => p !== params.provider).map(p => (
              <SocialButton key={p} provider={p} onPress={() => loginWith(p)} loading={busy === p} disabled={busy !== null} />
            ))}
          </View>

          <OrDivider />
          <AuthInput icon="email-outline" placeholder="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" accessibilityLabel="이메일" />
          <AuthInput icon="lock-outline" placeholder="비밀번호" value={password} onChangeText={setPassword} secure accessibilityLabel="비밀번호" />
          <GradientButton onPress={loginWithEmail} loading={busy === 'email'} disabled={busy !== null && busy !== 'email'}>
            로그인하고 연결하기
          </GradientButton>
          <FindLinks onFindId={() => navigation.navigate('FindEmail')} onFindPw={() => navigation.navigate('ForgotPassword')} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  main: { paddingHorizontal: 24, paddingBottom: 28, gap: 12 },
  hero: { alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 6 },
  title: { marginTop: 4, fontSize: 22, fontWeight: '800', letterSpacing: -0.3, color: '#102A56' },
  desc: { fontSize: 14, lineHeight: 22, color: '#5F7290', textAlign: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 12, backgroundColor: '#F3F9FF', borderWidth: 1, borderStyle: 'dashed', borderColor: '#9CC9FA',
  },
  chipSub: { fontSize: 11, color: '#5F7290' },
  chipName: { fontSize: 13, fontWeight: '700', color: '#102A56' },
  doneWrap: { alignItems: 'center', gap: 14, paddingTop: 60, paddingHorizontal: 24 },
  doneBadge: { position: 'absolute', right: -10, bottom: -6 },
  doneTitle: { marginTop: 10, fontSize: 22, fontWeight: '800', color: '#102A56' },
});
