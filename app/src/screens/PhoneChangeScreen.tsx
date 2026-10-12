// ★ v18.66 — 휴대폰 번호 변경(없으면 등록). 프로필 설정 › 휴대폰 번호 [변경]에서 들어옴.
//   번호는 탈퇴·처음 비밀번호 설정의 문자 본인 확인에 쓰여서, 바꾸려면 둘 다 통과해야 함:
//   ① 본인 확인 — 비밀번호(있으면) / 지금 번호·이메일 인증번호 / 둘 다 없으면 연결된 소셜로 다시 로그인
//   ② 새 번호로 받은 6자리 인증번호
//   화면 모양은 MyPasswordScreen(이메일 로그인 설정·비밀번호 변경)과 같게 맞춤.
//   ★ v18.66 리뷰 반영: 지금 번호를 못 쓰는 비밀번호 없는 사용자는 연결된 소셜로 다시 로그인해 ①을 통과할 수 있음,
//     새 번호 [다시 받기]는 서버가 정한 대기 시간(60초) 동안 남은 초를 보여주며 막아 둠.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSocialCredential, isSocialCancel, SocialProvider } from '../api/socialAuthApi';
import { requestPhoneReauth, sendNewPhoneCode, changePhone } from '../api/profileApi';
import type { WithdrawMethod, WithdrawChannel } from '../api/profileApi';
import { SocialButton } from '../components/AuthUi';
import GradientButton from '../components/GradientButton';
import { useAuthStore } from '../store/authStore';
import { formatPhoneInput, stripPhoneFormatting } from '../utils/phone';

const border = (err: boolean, val: string) => (err ? '#E5484D' : val ? '#7DBBFF' : '#DDEAF7');
const MOBILE_RE = /^01[016789]\d{7,8}$/; // 서버(PhoneChangeController)와 같은 규칙

function ErrorText({ children }: { children: string }) {
  return (
    <View style={s.errRow} accessibilityRole="alert">
      <Icon name="information-outline" size={13} color="#E5484D" />
      <Text style={s.errText}>{children}</Text>
    </View>
  );
}

function PwField({ value, onChange, err }: { value: string; onChange: (v: string) => void; err: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <View style={[s.input, { borderColor: border(err, value) }]}>
      <Icon name="lock-outline" size={18} color="#8FA3BF" />
      <TextInput
        accessibilityLabel="현재 비밀번호"
        style={s.inputText}
        value={value}
        onChangeText={onChange}
        placeholder="현재 비밀번호 입력"
        placeholderTextColor="#9AACC4"
        secureTextEntry={!show}
        autoCapitalize="none"
        autoComplete="current-password"
      />
      <Pressable onPress={() => setShow(v => !v)} style={s.eye} accessibilityLabel="비밀번호 보기 또는 숨기기">
        <Icon name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color="#8FA3BF" />
      </Pressable>
    </View>
  );
}

export default function PhoneChangeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuthStore();
  const hasPhone = !!user?.phone;

  // ① 본인 확인
  const [vm, setVm] = useState<WithdrawMethod | null>(null);
  const [vmFail, setVmFail] = useState(false);
  const [cur, setCur] = useState('');
  const [wrong, setWrong] = useState(false);
  const [sentTo, setSentTo] = useState<WithdrawChannel | null>(null);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [sending, setSending] = useState(false);
  const [social, setSocial] = useState<{ provider: SocialProvider; token: string } | null>(null);
  const [altOpen, setAltOpen] = useState(false); // ★ v18.66 "지금 번호를 쓸 수 없나요?" → 소셜 다시 로그인 버튼 펼침

  // ② 새 번호 문자 인증
  const [newPhone, setNewPhone] = useState('');
  const [phoneSent, setPhoneSent] = useState(''); // 인증번호를 보낸 번호(숫자만)
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [phoneCodeErr, setPhoneCodeErr] = useState('');
  const [phoneSending, setPhoneSending] = useState(false);
  const [minutes, setMinutes] = useState(3);
  // ★ v18.66 다시 받기 대기(번호별) — until까지 남은 초를 버튼에 표시
  const [cool, setCool] = useState<{ phone: string; until: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadMethod = useCallback(() => {
    setVmFail(false);
    requestPhoneReauth().then(setVm).catch(() => setVmFail(true));
  }, []);
  useEffect(loadMethod, [loadMethod]);

  const sendCode = async (ch: WithdrawChannel) => {
    setSending(true);
    setCodeErr('');
    try {
      await requestPhoneReauth(ch.type);
      setSentTo(ch);
      setCode('');
    } catch (e: any) {
      setCodeErr(e?.response?.data?.message ?? '인증번호를 보내지 못했어요.');
    } finally {
      setSending(false);
    }
  };

  const socialReauth = async (provider: SocialProvider) => {
    try {
      const { token } = await getSocialCredential(provider);
      setSocial({ provider, token });
      setCodeErr('');
    } catch (e: any) {
      if (!isSocialCancel(e)) setCodeErr('다시 로그인하지 못했어요.');
    }
  };

  const digits = stripPhoneFormatting(newPhone);
  const codeShown = !!phoneSent && phoneSent === digits; // 번호를 고치면 인증번호를 다시 받아야 함

  // ★ v18.66 다시 받기 남은 초 — 대기 중인 번호를 입력하고 있을 때만(다른 번호는 바로 받을 수 있음)
  useEffect(() => {
    if (!cool) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= cool.until) setCool(null);
    }, 1000);
    return () => clearInterval(t);
  }, [cool]);
  const left = cool && cool.phone === digits ? Math.max(0, Math.ceil((cool.until - now) / 1000)) : 0;
  const startCool = (phone: string, sec: number) => {
    const n = Date.now();
    setNow(n);
    setCool({ phone, until: n + sec * 1000 });
  };

  const sendPhoneCode = async () => {
    setPhoneSending(true);
    setPhoneErr('');
    setPhoneCodeErr('');
    try {
      const r = await sendNewPhoneCode(digits);
      setPhoneSent(digits);
      setPhoneCode('');
      if (r?.minutes) setMinutes(r.minutes);
      startCool(digits, r?.resend_after ?? 60);
    } catch (e: any) {
      const body = e?.response?.data;
      const retry = Number(body?.data?.retry_after);
      if (retry > 0) {
        // 방금 보낸 번호 — 이미 받은 인증번호를 넣을 수 있게 입력칸은 열어 두고, 버튼에 남은 초 표시
        setPhoneSent(digits);
        startCool(digits, retry);
      } else {
        setPhoneErr(body?.errors?.phone?.[0] ?? body?.message ?? '인증번호를 보내지 못했어요.');
      }
    } finally {
      setPhoneSending(false);
    }
  };
  const sendOff = !MOBILE_RE.test(digits) || phoneSending || left > 0;

  // ★ v18.66 소셜 다시 로그인은 method=code(지금 번호를 못 쓰는 경우)에서도 통과로 봄
  const verified = vm?.method === 'password'
    ? cur.length > 0 && !wrong
    : !!social || (vm?.method === 'code' && !!sentTo && code.length === 6);
  const ok = !!vm && verified && codeShown && phoneCode.length === 6;

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await changePhone({
        phone: digits,
        phone_code: phoneCode,
        ...(vm?.method === 'password'
          ? { password: cur }
          : social
            ? { provider: social.provider, token: social.token }
            : sentTo ? { channel: sentTo.type, code } : {}),
      });
      await updateUser(updated); // 프로필 설정 화면이 바로 새 번호를 보여줌
      navigation.goBack();
      Alert.alert('완료', hasPhone ? '휴대폰 번호를 변경했어요.' : '휴대폰 번호를 등록했어요.');
    } catch (e: any) {
      const body = e?.response?.data;
      const errs = body?.errors;
      if (errs?.phone) setPhoneErr(errs.phone[0]);
      else if (errs?.phone_code) setPhoneCodeErr(errs.phone_code[0]);
      else if (body?.error_code === 'ERR_AUTH_001') setWrong(true);
      else if (['ERR_AUTH_010', 'ERR_AUTH_017', 'ERR_AUTH_018'].includes(body?.error_code)) {
        setCodeErr(body?.message ?? '본인 확인에 실패했어요.');
        setSocial(null);
      }
      else setError(errs ? String(Object.values(errs)[0]) : body?.message ?? '저장하지 못했어요. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const action = hasPhone ? '변경하기' : '등록하기';

  return (
    <KeyboardAvoidingView style={[s.screen, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.iconBtn} accessibilityLabel="뒤로가기">
          <Icon name="chevron-left" size={26} color="#102A56" />
        </Pressable>
        <Text style={s.headerTitle}>{hasPhone ? '휴대폰 번호 변경' : '휴대폰 번호 등록'}</Text>
        <View style={s.iconBtn} />
      </View>
      <ScrollView contentContainerStyle={s.main} keyboardShouldPersistTaps="handled">
        <Text style={s.lead}>
          본인 확인 후 {hasPhone ? '새 번호' : '등록할 번호'}로 받은 인증번호를 입력하면 {hasPhone ? '바뀌어요' : '등록돼요'}.
          {'\n'}이 번호는 탈퇴 등 중요한 작업의 본인 확인에 쓰여요.
        </Text>

        {hasPhone && (
          <View style={s.field}>
            <Text style={s.label}>지금 번호</Text>
            <View style={s.readonly} accessibilityState={{ disabled: true }}>
              <Icon name="cellphone" size={18} color="#8FA3BF" />
              <Text style={s.readonlyText} numberOfLines={1}>{formatPhoneInput(user?.phone ?? '')}</Text>
              <Icon name="lock-outline" size={16} color="#8FA3BF" accessibilityLabel="수정할 수 없음" />
            </View>
          </View>
        )}

        {/* ① 본인 확인 */}
        <View style={s.field}>
          <Text style={s.label}>{vm?.method === 'password' ? '현재 비밀번호' : '본인 확인'}</Text>
          {!vm ? (
            vmFail ? (
              <Pressable onPress={loadMethod} style={{ alignSelf: 'flex-start', paddingVertical: 2 }}>
                <Text style={s.link}>본인 확인 방법을 불러오지 못했어요 · 다시 시도</Text>
              </Pressable>
            ) : (
              <ActivityIndicator color="#0A6CE0" style={{ alignSelf: 'flex-start' }} />
            )
          ) : vm.method === 'password' ? (
            <>
              <PwField value={cur} onChange={v => { setCur(v); setWrong(false); }} err={wrong} />
              {wrong && <ErrorText>현재 비밀번호가 맞지 않아요.</ErrorText>}
              <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-start', paddingVertical: 2 }}>
                <Text style={s.link}>비밀번호를 잊으셨나요?</Text>
              </Pressable>
            </>
          ) : social ? (
            <View style={s.readonly}>
              <Icon name="check-circle" size={18} color="#0B8574" />
              <Text style={[s.readonlyText, { color: '#0B8574' }]}>본인 확인됐어요</Text>
            </View>
          ) : vm.method === 'code' ? (
            <>
              {!sentTo ? vm.channels.map(ch => (
                <Pressable key={ch.type} onPress={() => sendCode(ch)} disabled={sending} style={s.chBtn} accessibilityRole="button">
                  <Icon name={ch.type === 'phone' ? 'cellphone-message' : 'email-fast-outline'} size={18} color="#0A6CE0" />
                  <Text style={s.chText}>{ch.type === 'phone' ? '지금 번호로 받기' : '이메일로 받기'} · {ch.target}</Text>
                  {sending && <ActivityIndicator color="#0A6CE0" size="small" />}
                </Pressable>
              )) : (
                <>
                  <View style={[s.input, { borderColor: border(!!codeErr, code), paddingRight: 14 }]}>
                    <Icon name="shield-check-outline" size={18} color="#8FA3BF" />
                    <TextInput
                      accessibilityLabel="본인 확인 인증번호"
                      style={s.inputText}
                      value={code}
                      onChangeText={v => { setCode(v.replace(/\D/g, '')); setCodeErr(''); }}
                      placeholder="인증번호 6자리"
                      placeholderTextColor="#9AACC4"
                      keyboardType="number-pad"
                      maxLength={6}
                      autoComplete="one-time-code"
                    />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={s.help}>{sentTo.target}로 보냈어요 · {vm.minutes}분간 유효</Text>
                    <Pressable onPress={() => sendCode(sentTo)} disabled={sending} hitSlop={6}>
                      <Text style={s.link}>다시 받기</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </>
          ) : (
            vm.providers.map(p => <SocialButton key={p} provider={p} onPress={() => socialReauth(p)} />)
          )}
          {!!codeErr && <ErrorText>{codeErr}</ErrorText>}
          {vm && vm.method !== 'password' && !sentTo && !social && (
            <Text style={s.help}>{vm.method === 'code' ? '인증번호를 받을 곳을 골라주세요' : '연결된 계정으로 다시 로그인해 본인을 확인해요'}</Text>
          )}
          {/* ★ v18.66 인증번호를 받을 수 없을 때(지금 번호 해지 등) — 연결된 소셜 계정으로 다시 로그인 */}
          {vm?.method === 'code' && !social && vm.providers.length > 0 && (
            altOpen ? (
              <View style={s.altBox}>
                <Text style={s.help}>연결된 계정으로 다시 로그인하면 인증번호 없이 확인돼요</Text>
                {vm.providers.map(p => <SocialButton key={p} provider={p} onPress={() => socialReauth(p)} />)}
              </View>
            ) : (
              <Pressable onPress={() => setAltOpen(true)} style={{ alignSelf: 'flex-start', paddingVertical: 2 }} accessibilityRole="button" hitSlop={6}>
                <Text style={s.link}>
                  {vm.channels.some(c => c.type === 'phone') ? '지금 번호를 쓸 수 없나요?' : '인증번호를 받을 수 없나요?'} 연결된 계정으로 확인
                </Text>
              </Pressable>
            )
          )}
        </View>

        {/* ② 새 번호 문자 인증 */}
        <View style={s.field}>
          <Text style={s.label}>{hasPhone ? '새 휴대폰 번호' : '휴대폰 번호'}</Text>
          <View style={s.phoneRow}>
            <View style={[s.input, { flex: 1, borderColor: border(!!phoneErr, newPhone), paddingRight: 14 }]}>
              <Icon name="cellphone" size={18} color="#8FA3BF" />
              <TextInput
                accessibilityLabel={hasPhone ? '새 휴대폰 번호' : '휴대폰 번호'}
                style={s.inputText}
                value={newPhone}
                onChangeText={v => { setNewPhone(formatPhoneInput(v)); setPhoneErr(''); setPhoneCodeErr(''); }}
                placeholder="010-0000-0000"
                placeholderTextColor="#9AACC4"
                keyboardType="phone-pad"
                maxLength={13}
                autoComplete="tel"
              />
            </View>
            <Pressable
              onPress={sendPhoneCode}
              disabled={sendOff}
              style={[s.sendBtn, sendOff && s.sendBtnOff]}
              accessibilityRole="button"
              accessibilityState={{ disabled: sendOff }}
            >
              {phoneSending
                ? <ActivityIndicator color="#0A6CE0" size="small" />
                : (
                  <Text style={[s.sendText, (!MOBILE_RE.test(digits) || left > 0) && s.sendTextOff]}>
                    {left > 0 ? `다시 받기 ${left}초` : codeShown ? '다시 받기' : '인증번호 받기'}
                  </Text>
                )}
            </Pressable>
          </View>
          {!!phoneErr && <ErrorText>{phoneErr}</ErrorText>}
        </View>

        {codeShown && (
          <View style={s.field}>
            <Text style={s.label}>인증번호</Text>
            <View style={[s.input, { borderColor: border(!!phoneCodeErr, phoneCode), paddingRight: 14 }]}>
              <Icon name="shield-check-outline" size={18} color="#8FA3BF" />
              <TextInput
                accessibilityLabel="새 번호 인증번호"
                style={s.inputText}
                value={phoneCode}
                onChangeText={v => { setPhoneCode(v.replace(/\D/g, '')); setPhoneCodeErr(''); }}
                placeholder="인증번호 6자리"
                placeholderTextColor="#9AACC4"
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
              />
            </View>
            {!!phoneCodeErr && <ErrorText>{phoneCodeErr}</ErrorText>}
            <Text style={s.help}>{formatPhoneInput(phoneSent)}로 보냈어요 · {minutes}분간 유효</Text>
          </View>
        )}

        {!!error && <ErrorText>{error}</ErrorText>}
        <View style={{ flex: 1, minHeight: 16 }} />
        {ok ? (
          <GradientButton onPress={submit} loading={saving}>{action}</GradientButton>
        ) : (
          <View style={s.btnOff} accessibilityState={{ disabled: true }}>
            <Text style={s.btnOffText}>{action}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#102A56' },
  main: { flexGrow: 1, paddingTop: 4, paddingHorizontal: 20, paddingBottom: 28, gap: 16 },
  lead: { marginTop: 4, marginBottom: 6, fontSize: 15, lineHeight: 24, color: '#5F7290' },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#102A56' },
  input: {
    height: 50, borderRadius: 10, borderWidth: 1, backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 6,
  },
  inputText: { flex: 1, fontSize: 15, color: '#102A56', paddingVertical: 0 },
  eye: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  readonly: {
    height: 50, borderRadius: 10, borderWidth: 1, borderColor: '#E6ECF3', backgroundColor: '#F3F6FA',
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
  },
  readonlyText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#102A56' },
  help: { fontSize: 12, color: '#5F7290' },
  link: { fontSize: 12, fontWeight: '600', color: '#0A6CE0' },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errText: { fontSize: 12, fontWeight: '600', color: '#E5484D' },
  btnOff: { height: 52, borderRadius: 12, backgroundColor: '#B9D6F7', alignItems: 'center', justifyContent: 'center' },
  btnOffText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  chBtn: {
    height: 50, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFB', backgroundColor: '#F3F9FF',
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
  },
  chText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0A6CE0' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  altBox: { gap: 8, marginTop: 4 }, // ★ v18.66
  sendBtn: {
    height: 50, minWidth: 104, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFB', backgroundColor: '#F3F9FF',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12,
  },
  sendBtnOff: { borderColor: '#E6ECF3', backgroundColor: '#F3F6FA' },
  sendText: { fontSize: 14, fontWeight: '700', color: '#0A6CE0' },
  sendTextOff: { color: '#9AACC4' },
});
