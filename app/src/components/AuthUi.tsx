// ★ v18.51 — 로그인·소셜 연결 화면 공통 조각 (디자인 AUTH_LOGIN / SOCIAL_FIRST_LOGIN / SOCIAL_LINK_SIGNIN / MY_LOGIN_LINKS)
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, TextInputProps } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { SocialProvider } from '../api/socialAuthApi';

const BRAND: Record<SocialProvider | 'email', { bg: string; fg: string; border?: string; letter: string }> = {
  kakao: { bg: '#FEE500', fg: '#191600', letter: 'K' },
  google: { bg: '#FFFFFF', fg: '#1F2937', border: '#DDE6F0', letter: 'G' },
  apple: { bg: '#111111', fg: '#FFFFFF', letter: '' }, // ★ v18.60 글자 대신 애플 로고(애플 디자인 지침)
  email: { bg: '#EAF4FF', fg: '#0A6CE0', letter: '@' },
};

/** 동그란 로그인 수단 표시(K·G·애플로고·@) */
export function ProviderBadge({ provider, size = 40, ring = false, style }: {
  provider: SocialProvider | 'email'; size?: number; ring?: boolean; style?: object;
}) {
  const b = BRAND[provider];
  return (
    <View
      style={[
        {
          width: size, height: size, borderRadius: size / 2, backgroundColor: b.bg,
          alignItems: 'center', justifyContent: 'center',
        },
        b.border ? { borderWidth: 1, borderColor: b.border } : null,
        ring ? { borderWidth: 2, borderColor: '#FFFFFF' } : null,
        style,
      ]}
    >
      {provider === 'apple' ? (
        <Icon name="apple" size={Math.round(size * 0.5)} color={b.fg} />
      ) : (
        <Text style={{ color: b.fg, fontSize: Math.round(size * 0.4), fontWeight: '800' }}>{b.letter}</Text>
      )}
    </View>
  );
}

/** 카카오로 로그인 / 구글로 로그인 / Apple로 로그인 — 가로 꽉 찬 버튼 */
export function SocialButton({ provider, onPress, loading, disabled }: {
  provider: SocialProvider; onPress: () => void; loading?: boolean; disabled?: boolean;
}) {
  const b = BRAND[provider];
  const label = { kakao: '카카오로 로그인', google: '구글로 로그인', apple: 'Apple로 로그인' }[provider];
  return (
    <Pressable
      accessibilityRole="button"
      // 장식용 K·G 글자는 읽지 않게(아이폰 VoiceOver가 "K, 카카오로 로그인"으로 읽던 것)
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.socialBtn,
        { backgroundColor: b.bg, opacity: pressed ? 0.85 : 1 },
        b.border ? { borderWidth: 1, borderColor: b.border } : null,
      ]}
    >
      {provider === 'apple' ? (
        <Icon name="apple" size={20} color={b.fg} style={s.socialIcon} />
      ) : (
        <Text style={[s.socialLetter, { color: b.fg }]}>{b.letter}</Text>
      )}
      {loading ? (
        <ActivityIndicator color={b.fg} size="small" />
      ) : (
        <Text style={[s.socialLabel, { color: b.fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

/** ───── 또는 이메일로 로그인 ───── */
export function OrDivider({ label = '또는 이메일로 로그인' }: { label?: string }) {
  return (
    <View style={s.divider}>
      <View style={s.dividerLine} />
      <Text style={s.dividerText}>{label}</Text>
      <View style={s.dividerLine} />
    </View>
  );
}

/** 아이콘 달린 입력칸(이메일·비밀번호). ref는 "다음" 키로 비밀번호 칸에 포커스 넘길 때 씀 */
export const AuthInput = React.forwardRef<TextInput, { icon: string; secure?: boolean } & TextInputProps>(function AuthInput(
  { icon, secure, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={s.inputWrap}>
      <Icon name={icon} size={18} color="#8FA3BF" />
      <TextInput
        ref={ref}
        style={s.input}
        placeholderTextColor="#9AACC4"
        secureTextEntry={secure && !visible}
        autoCapitalize="none"
        {...props}
      />
      {secure && (
        <Pressable onPress={() => setVisible(v => !v)} hitSlop={8} accessibilityLabel="비밀번호 보기">
          <Icon name={visible ? 'eye-off-outline' : 'eye-outline'} size={18} color="#8FA3BF" />
        </Pressable>
      )}
    </View>
  );
});

/** 흰 바탕 파란 테두리 버튼(이미 계정이 있어요) */
export function OutlineButton({ children, onPress }: { children: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.outlineBtn, pressed && { opacity: 0.8 }]}>
      <Text style={s.outlineText}>{children}</Text>
    </Pressable>
  );
}

/** 아이디 찾기 | 비밀번호 찾기 (| 이메일로 회원가입) */
export function FindLinks({ onFindId, onFindPw, onSignup }: { onFindId: () => void; onFindPw: () => void; onSignup?: () => void }) {
  return (
    <View style={s.findRow}>
      <Pressable onPress={onFindId} hitSlop={6}><Text style={s.findText}>아이디 찾기</Text></Pressable>
      <View style={s.findBar} />
      <Pressable onPress={onFindPw} hitSlop={6}><Text style={s.findText}>비밀번호 찾기</Text></Pressable>
      {onSignup && (
        <>
          <View style={s.findBar} />
          <Pressable onPress={onSignup} hitSlop={6}><Text style={[s.findText, s.findStrong]}>이메일로 회원가입</Text></Pressable>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  socialBtn: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  socialLetter: { position: 'absolute', left: 18, width: 22, textAlign: 'center', fontSize: 17, fontWeight: '900' },
  socialIcon: { position: 'absolute', left: 19 },
  socialLabel: { fontSize: 15, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#DDEAF7' },
  dividerText: { fontSize: 12, color: '#5F7290' },
  inputWrap: {
    height: 48, borderWidth: 1, borderColor: '#DDEAF7', borderRadius: 10, backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 14, color: '#102A56', paddingVertical: 0 },
  outlineBtn: {
    height: 52, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BFDBFB',
    alignItems: 'center', justifyContent: 'center',
  },
  outlineText: { fontSize: 15, fontWeight: '700', color: '#0A6CE0' },
  findRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  findText: { fontSize: 13, fontWeight: '600', color: '#5F7290', paddingVertical: 6 },
  findStrong: { color: '#0A6CE0', fontWeight: '700' },
  findBar: { width: 1, height: 12, backgroundColor: '#DDEAF7' },
});
