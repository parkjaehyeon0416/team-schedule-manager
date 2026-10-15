/**
 * ★ v18.68 — 본인 확인 시트 (DESIGN-CANVAS MY_LOGIN_LINKS_VERIFY / _VERIFY_CODE / _VERIFY_ERR)
 *   로그인 연결 관리에서 소셜 [연결]·[해제] 전에 띄움. 비밀번호 | 인증번호(문자·이메일) 탭.
 *   비밀번호가 없으면 비밀번호 탭은 흐리게 막고 인증번호로 확인. 비밀번호도 받을 곳도 없으면(소셜로만 가입)
 *   연결된 소셜 계정으로 다시 로그인해서 확인. 통과하면 onVerified(reauth_token) — 토큰은 한 번만, 10분.
 *
 *   시트 겉모양은 TeamUi의 BottomSheet와 같음(반투명 배경 + 둥근 흰 판 + 손잡이). 다만 키보드를 피하려면
 *   KeyboardAvoidingView가 화면 전체를 덮는 바깥 틀이어야 해서(시트 안에 넣으면 좌표가 안 맞아 늘 0)
 *   여기서 직접 Modal을 그림. 작은 화면에서 키보드까지 올라오면 시트 안을 스크롤, 빈 곳을 누르면 키보드 내림.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Modal, ScrollView, Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from './Gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SocialButton } from './AuthUi';
import ModalBottomSafeArea from './ModalBottomSafeArea';
import {
  reauthSend, reauthVerify, getSocialCredential, isSocialCancel, APPLE_LOGIN_AVAILABLE,
  ReauthInfo, ReauthChannel, ReauthPurpose, SocialProvider,
} from '../api/socialAuthApi';
import { colors } from '../theme/designTokens';

type Props = {
  visible: boolean;
  /** 제목 아래 한 줄 — 예) '카카오 연결을 해제하기 전에 본인인지 확인할게요.' */
  subtitle: string;
  info: ReauthInfo;
  purpose: ReauthPurpose;
  /** 처음부터 보여줄 오류(예: 연결 요청이 ERR_AUTH_018로 돌아와 다시 연 경우 서버 메시지) */
  notice?: string;
  onClose: () => void;
  onVerified: (reauthToken: string) => void;
  onForgotPassword: () => void;
};

const PW_MIN = 6; // 디자인: 6자 이상 입력하면 [확인] 활성(옛 비밀번호도 있을 수 있어 가입 규칙보다 느슨하게)
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

function ErrorLine({ children }: { children: string }) {
  return (
    <View style={s.errRow} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="information-outline" size={13} color={colors.danger} />
      <Text style={s.errText}>{children}</Text>
    </View>
  );
}

export default function ReauthSheet({ visible, subtitle, info, purpose, notice, onClose, onVerified, onForgotPassword }: Props) {
  const insets = useSafeAreaInsets();
  const canPw = !!info.has_password;
  const channels = info.channels ?? [];
  const canCode = channels.length > 0;
  const socialOnly = !canPw && !canCode;
  // 소셜 다시 로그인 — 안드로이드에선 Apple 로그인이 안 되니 빼고 그림
  const providers = (info.providers ?? []).filter(p => p !== 'apple' || APPLE_LOGIN_AVAILABLE);

  const [tab, setTab] = useState<0 | 1>(canPw ? 0 : 1);
  // 받을 곳 기본값은 디자인대로 '문자'(없으면 서버가 준 첫 번째)
  const [ch, setCh] = useState<ReauthChannel['type']>(
    channels.find(c => c.type === 'phone')?.type ?? channels[0]?.type ?? 'phone',
  );
  const [pw, setPw] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState<boolean | SocialProvider>(false);
  const [err, setErr] = useState<{ msg: string; field: boolean } | null>(notice ? { msg: notice, field: false } : null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // 다시 그려지기 전 연타·완료 키 겹침으로 요청이 두 번 나가지 않게(쿨다운 429·비밀번호 실패 횟수 두 번 방지)
  const inFlight = useRef(false);
  // 확인 요청 중에 시트를 닫았거나(배경·뒤로) 새 시트로 바뀌었으면 늦게 온 성공은 버림 — 취소한 줄 아는데 다음 창이 뜨지 않게
  const live = useRef(visible);
  useEffect(() => {
    live.current = visible;
    return () => { live.current = false; };
  }, [visible]);
  const done = (token: string) => {
    if (live.current) onVerified(token);
  };

  const pwTab = canPw && (tab === 0 || !canCode);
  const codeTab = !pwTab && canCode;
  const target = channels.find(c => c.type === ch) ?? channels[0];

  // 인증번호 유효 시간(빨간 3:00) — 보낸 뒤부터 1초마다
  useEffect(() => {
    if (!deadline || !visible) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= deadline) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, visible]);
  const left = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
  const expired = sent && !!deadline && left === 0;

  const ready = pwTab ? pw.length >= PW_MIN : codeTab && sent && !expired && /^[0-9]{6}$/.test(code);

  const goPw = () => { if (canPw) { setTab(0); setErr(null); } };
  const goCode = () => { if (canCode) { setTab(1); setErr(null); } };
  const pickChannel = (type: ReauthChannel['type']) => {
    if (type === ch || inFlight.current) return;
    setCh(type);
    setSent(false);
    setCode('');
    setDeadline(null);
    setErr(null);
  };

  const send = async () => {
    if (!target || inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setErr(null);
    try {
      const r = await reauthSend(purpose, target.type);
      const mins = r?.minutes ?? info.minutes ?? 3;
      const n = Date.now();
      setSent(true);
      setCode('');
      setNow(n);
      setDeadline(n + mins * 60 * 1000);
    } catch (e: any) {
      setErr({ msg: e?.response?.data?.message ?? '인증번호를 보내지 못했어요. 잠시 후 다시 시도해주세요.', field: false });
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  const verify = async () => {
    if (!ready || inFlight.current) return;
    inFlight.current = true;
    setVerifying(true);
    setErr(null);
    try {
      const token = await reauthVerify(
        pwTab ? { purpose, password: pw } : { purpose, channel: target?.type ?? ch, code },
      );
      done(token);
    } catch (e: any) {
      const body = e?.response?.data;
      const fallback = body?.error_code === 'ERR_AUTH_001'
        ? '비밀번호가 맞지 않아요. 다시 입력해주세요.'
        : body?.error_code === 'ERR_AUTH_010'
          ? '인증번호가 맞지 않아요. 다시 확인해주세요.'
          : '확인하지 못했어요. 다시 시도해주세요.';
      setErr({ msg: body?.message ?? fallback, field: !!body?.error_code });
    } finally {
      inFlight.current = false;
      setVerifying(false);
    }
  };

  // 소셜로만 가입한 계정 — 연결된 소셜로 다시 로그인
  const socialVerify = async (p: SocialProvider) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setVerifying(p);
    setErr(null);
    try {
      const { token } = await getSocialCredential(p);
      done(await reauthVerify({ purpose, provider: p, token }));
    } catch (e: any) {
      if (!isSocialCancel(e)) {
        setErr({ msg: e?.response?.data?.message ?? '다시 로그인하지 못했어요. 다시 시도해주세요.', field: false });
      }
    } finally {
      inFlight.current = false;
      setVerifying(false);
    }
  };

  // 키보드가 올라와 있으면 배경을 눌러도 먼저 키보드만 내림(바로 닫히면 입력하던 게 사라짐)
  const onBackdrop = () => {
    if (Keyboard.isVisible()) Keyboard.dismiss();
    else onClose();
  };

  const tabText = (on: boolean, dis: boolean) => ({
    color: dis ? '#B4C2D4' : on ? colors.textPrimary : colors.textSecondary,
    fontWeight: (on ? '700' : '600') as '700' | '600',
  });

  const pwBorder = err?.field && pwTab ? colors.danger : pw ? '#7DBBFF' : colors.border;
  const codeBorder = (err?.field || expired) && codeTab ? colors.danger : code ? '#7DBBFF' : colors.border;
  const errMsg = err?.msg ?? (expired && codeTab ? '입력 시간이 지났어요. 인증번호를 다시 받아주세요.' : '');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* 화면 전체를 덮는 틀이 키보드를 피해야 시트가 키보드 위로 올라옴(안드로이드도 TeamJoinScreen처럼 padding) */}
      <KeyboardAvoidingView style={[s.wrap, { paddingTop: insets.top }]} behavior="padding">
        <Pressable style={s.backdrop} onPress={onBackdrop} accessibilityLabel="닫기" />
        {/* 닫기 = 배경 누르기 · 뒤로가기(onRequestClose) · iOS VoiceOver 문지르기(onAccessibilityEscape)
            ★ v18.70 — 흰 판 아래 여백 = 30 + 기기 하단 바와 겹치는 높이(ModalBottomSafeArea). 키보드로 시트가 올라가면 겹침이 없어 30만 */}
        <ModalBottomSafeArea style={s.sheet} accessibilityViewIsModal accessibilityLabel="본인 확인" onAccessibilityEscape={onClose}>
          <View style={s.handle} />
          <ScrollView
            contentContainerStyle={s.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* 머리 — 방패 아이콘 · 본인 확인 · 무엇 때문인지
                ★ v18.68 QA — 디자인에 없는 오른쪽 위 X를 뺌(폭을 잡아먹어 부제 끝 '요.'만 다음 줄로 넘어갔음).
                  닫기는 다른 시트(TeamUi BottomSheet)처럼 배경 누르기 · 뒤로가기 */}
            <View style={s.head}>
              <View style={s.headIcon}>
                <Icon name="shield-check-outline" size={22} color={colors.primaryDark} />
              </View>
              <View style={s.headText}>
                <Text style={s.title} accessibilityRole="header">본인 확인</Text>
                <Text style={s.subtitle}>{subtitle}</Text>
              </View>
            </View>

            {socialOnly ? (
              providers.length > 0 ? (
                <>
                  <Text style={s.socialLead}>연결된 소셜 계정으로 다시 로그인해서 확인해요</Text>
                  {providers.map(p => (
                    <SocialButton
                      key={p}
                      provider={p}
                      onPress={() => socialVerify(p)}
                      loading={verifying === p}
                      disabled={!!verifying}
                    />
                  ))}
                  {!!errMsg && <ErrorLine>{errMsg}</ErrorLine>}
                </>
              ) : (
                // 확인할 방법이 하나도 없음(예: 안드로이드에서 Apple만 연결) — 버튼 대신 안내
                <View style={s.noWay} accessibilityRole="alert">
                  <Icon name="information-outline" size={16} color="#B95E00" style={s.noWayIcon} />
                  <Text style={s.noWayText}>
                    이 기기에서 확인할 수 있는 방법이 없어요. 이메일 · 비밀번호를 먼저 설정해주세요.
                  </Text>
                </View>
              )
            ) : (
              <>
                {/* 비밀번호 | 인증번호 */}
                <View style={s.tabs} accessibilityRole="tablist" accessibilityLabel="확인 방법">
                  <Pressable
                    onPress={goPw}
                    disabled={!canPw}
                    style={[s.tab, pwTab && s.tabOn]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: pwTab, disabled: !canPw }}
                  >
                    <Text style={[s.tabText, tabText(pwTab, !canPw)]}>비밀번호</Text>
                  </Pressable>
                  <Pressable
                    onPress={goCode}
                    disabled={!canCode}
                    style={[s.tab, codeTab && s.tabOn]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: codeTab, disabled: !canCode }}
                  >
                    <Text style={[s.tabText, tabText(codeTab, !canCode)]}>인증번호</Text>
                  </Pressable>
                </View>
                {!canPw && <Text style={s.note}>설정한 비밀번호가 없어서 인증번호로 확인해요</Text>}

                {pwTab ? (
                  <View style={s.pwBox}>
                    <Text style={s.label}>비밀번호</Text>
                    <View style={[s.input, { borderColor: pwBorder }]}>
                      <Icon name="lock-outline" size={18} color={colors.muted} />
                      <TextInput
                        accessibilityLabel="비밀번호"
                        style={s.inputText}
                        value={pw}
                        onChangeText={v => { setPw(v); setErr(null); }}
                        placeholder="로그인 비밀번호"
                        placeholderTextColor="#9AACC4"
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="current-password"
                        textContentType="password"
                        returnKeyType="done"
                        onSubmitEditing={verify}
                      />
                    </View>
                    {!!errMsg && <ErrorLine>{errMsg}</ErrorLine>}
                    <Pressable onPress={onForgotPassword} style={s.forgot} accessibilityRole="link" hitSlop={6}>
                      <Text style={s.forgotText}>비밀번호를 잊으셨나요?</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={s.codeBox}>
                    {/* 받을 곳 — 서버가 준 것만(문자 · 이메일) */}
                    <View style={s.chRow} accessibilityRole="radiogroup" accessibilityLabel="받을 곳">
                      {channels.map(c => {
                        const on = c.type === target?.type;
                        return (
                          <Pressable
                            key={c.type}
                            onPress={() => pickChannel(c.type)}
                            style={[s.chBtn, on ? s.chBtnOn : null]}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: on }}
                          >
                            <View style={s.chHead}>
                              <Icon name={c.type === 'phone' ? 'cellphone' : 'email-outline'} size={15} color={colors.primaryDark} />
                              <Text style={s.chName}>{c.type === 'phone' ? '문자' : '이메일'}</Text>
                            </View>
                            <Text style={s.chTarget} numberOfLines={1}>{c.target}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Pressable
                      onPress={send}
                      disabled={sending}
                      style={s.sendBtn}
                      accessibilityRole="button"
                      accessibilityLabel={sent ? '다시 받기' : '인증번호 받기'}
                      accessibilityState={{ disabled: sending, busy: sending }}
                    >
                      {sending
                        ? <ActivityIndicator color={colors.primaryDark} size="small" />
                        : <Text style={s.sendText}>{sent ? '다시 받기' : '인증번호 받기'}</Text>}
                    </Pressable>
                    {sent && target ? (
                      <View style={s.sentBox}>
                        <View style={s.sentRow} accessibilityLiveRegion="polite">
                          <Icon name="check" size={13} color="#0B8574" />
                          <Text style={s.sentText}>
                            {target.target}{target.type === 'email' ? '으로' : '로'} 인증번호를 보냈어요
                          </Text>
                        </View>
                        <View style={[s.input, { borderColor: codeBorder }]}>
                          <Icon name="shield-check-outline" size={18} color={colors.muted} />
                          <TextInput
                            accessibilityLabel="인증번호"
                            style={[s.inputText, s.codeText]}
                            value={code}
                            onChangeText={v => { setCode(v.replace(/[^0-9]/g, '').slice(0, 6)); setErr(null); }}
                            placeholder="인증번호 6자리"
                            placeholderTextColor="#9AACC4"
                            keyboardType="number-pad"
                            maxLength={6}
                            autoComplete="one-time-code"
                            textContentType="oneTimeCode"
                            returnKeyType="done"
                            onSubmitEditing={verify}
                          />
                          <Text style={s.timer} accessibilityLabel={`남은 시간 ${mmss(left)}`}>{mmss(left)}</Text>
                        </View>
                        {!!errMsg && <ErrorLine>{errMsg}</ErrorLine>}
                      </View>
                    ) : (
                      !!errMsg && <ErrorLine>{errMsg}</ErrorLine>
                    )}
                  </View>
                )}

                {ready ? (
                  <Pressable
                    onPress={verify}
                    disabled={!!verifying}
                    accessibilityRole="button"
                    accessibilityLabel="확인"
                    accessibilityState={{ busy: !!verifying, disabled: !!verifying }}
                  >
                    <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.submit}>
                      {verifying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.submitText}>확인</Text>}
                    </LinearGradient>
                  </Pressable>
                ) : (
                  <View style={[s.submit, s.submitOff]} accessibilityRole="button" accessibilityState={{ disabled: true }}>
                    <Text style={s.submitText}>확인</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </ModalBottomSafeArea>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  // 시트 틀 — TeamUi BottomSheet와 같은 값(sheetWrap/sheetBackdrop/sheet/sheetHandle) + 작은 화면에서 줄어들 수 있게 flexShrink
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16,42,86,0.45)' },
  sheet: {
    flexShrink: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 10, paddingHorizontal: 20, paddingBottom: 30, gap: 12,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#D5DFEB', marginBottom: 4 },
  body: { gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1, gap: 2 },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, lineHeight: 19.5, color: colors.textSecondary },
  tabs: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, backgroundColor: '#EEF3F9' },
  tab: { flex: 1, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: colors.textPrimary, shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  tabText: { fontSize: 14 },
  note: { fontSize: 12, color: colors.textSecondary },
  socialLead: { fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  noWay: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#FFF1DE' },
  noWayIcon: { marginTop: 1 },
  noWayText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#B95E00' },
  pwBox: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  input: {
    height: 48, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, backgroundColor: '#FFFFFF',
  },
  inputText: { flex: 1, fontSize: 15, color: colors.textPrimary, paddingVertical: 0 },
  codeText: { letterSpacing: 2 },
  timer: { fontSize: 13, fontWeight: '700', color: colors.danger, fontVariant: ['tabular-nums'] },
  forgot: { alignSelf: 'flex-start', paddingVertical: 4 },
  forgotText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.danger },
  codeBox: { gap: 10 },
  chRow: { flexDirection: 'row', gap: 8 },
  chBtn: {
    flex: 1, minWidth: 0, gap: 2, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF',
  },
  chBtnOn: { borderColor: '#7DBBFF', backgroundColor: '#F3F9FF' },
  chHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  chTarget: { fontSize: 12, color: colors.textSecondary },
  sendBtn: {
    height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFB', backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  sendText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  sentBox: { gap: 6 },
  sentRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sentText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#0B8574' },
  submit: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitOff: { backgroundColor: '#B9D6F7' },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
