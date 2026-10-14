// ★ v18.68 — 디자인 AUTH_SIGNUP_PROFILE(_SENT / _CODE_ERR / _VERIFIED): 이메일 회원가입 '기본정보 입력'
//   - 가입 전에 휴대폰 문자 인증 필수: [인증번호 받기] → 6자리 + 남은 시간 → [확인] → '확인됨'
//     인증하면 서버가 phone_token(30분)을 주고, 가입할 때 같이 보냄(번호는 인증한 번호 그대로, 고칠 수 없음)
//   - '주요 공정 (복수 선택)' 칩 — 선택 안 해도 가입 가능(main_work_types)
//   - 디자인의 약관→기본정보→완료 3단계는 예전에 한 화면으로 줄였음 → 약관 동의 체크·이메일(=아이디) 칸은 그대로 둠
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { formatPhoneInput, stripPhoneFormatting } from '../utils/phone';
import { colors, radius, spacing } from '../theme/designTokens';
import { passwordError, PASSWORD_PLACEHOLDER } from '../utils/passwordPolicy';
import {
  registerAccount,
  sendSignupPhoneCode,
  verifySignupPhoneCode,
  SIGNUP_WORK_TYPES,
} from '../api/signupApi';

// ★ v18.15 — 서버 validation 에러(errors 객체)의 필드명+영문 메시지를
//   한국어로 번역해서 "어느 항목이 왜 문제인지" 바로 보이게 함.
const FIELD_LABELS: Record<string, string> = {
  name: '이름',
  email: '이메일',
  phone: '휴대폰 번호',
  password: '비밀번호',
  password_confirmation: '비밀번호 확인',
  agree_terms: '약관 동의',
  phone_token: '휴대폰 인증', // ★ v18.68
  main_work_types: '주요 공정', // ★ v18.68
};

function translateFieldError(field: string, rawMessage: string): string {
  const label = FIELD_LABELS[field] ?? field;
  if (rawMessage.includes('already been taken')) return `이미 사용 중인 ${label}입니다.`;
  if (rawMessage.includes('field is required')) return `${label}을(를) 입력해주세요.`;
  if (rawMessage.includes('must be a valid email')) return '올바른 이메일 형식이 아닙니다.';
  if (rawMessage.includes('must be at least')) return `${label}이(가) 너무 짧습니다.`;
  if (rawMessage.includes('confirmation does not match')) return '비밀번호가 일치하지 않습니다.';
  return `${label}: ${rawMessage}`;
}

const MOBILE_RE = /^01[016789]\d{7,8}$/; // 디자인·서버와 같은 휴대폰 번호 규칙
const GRAD = [colors.primaryLight, colors.primaryDark];
const PLACEHOLDER = '#9AACC4';
const MSG = {
  phoneFormat: '휴대폰 번호 형식이 맞지 않아요.',
  phoneTaken: '이미 가입된 휴대폰 번호예요. 아이디 찾기에서 확인해주세요.',
  sendFail: '인증번호를 보내지 못했어요. 잠시 후 다시 시도해주세요.',
  codeLen: '인증번호 6자리를 입력해주세요.',
  codeWrong: '인증번호가 맞지 않아요. 다시 확인해주세요.',
  verifyFail: '인증하지 못했어요. 다시 시도해주세요.',
  expired: '인증 시간이 지났어요. [다시 받기]를 눌러주세요.',
  unverified: '휴대폰 인증이 만료됐어요. 다시 인증해주세요.',
};

function ErrorLine({ children }: { children: string }) {
  return (
    <View style={styles.errRow} accessibilityRole="alert">
      <Icon name="information-outline" size={13} color={colors.danger} />
      <Text style={styles.errText}>{children}</Text>
    </View>
  );
}

/** 입력칸 오른쪽 104×48 버튼(인증번호 받기 / 다시 받기 / 확인) — active면 그라데이션, 아니면 옅은 파랑
 *  스크린리더 '사용 불가'는 실제로 막힌 때만(옅은 파랑이어도 '확인'은 6자리 전에 눌러서 오류 안내를 볼 수 있음) */
function SideButton({ label, active, disabled, loading, onPress }: {
  label: string; active: boolean; disabled?: boolean; loading?: boolean; onPress: () => void;
}) {
  const content = loading
    ? <ActivityIndicator color="#FFFFFF" size="small" />
    : <Text style={styles.sideText}>{label}</Text>;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      style={({ pressed }) => [pressed && active && { opacity: 0.85 }]}
    >
      {active ? (
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sideBtn}>
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.sideBtn, styles.sideBtnOff]}>{content}</View>
      )}
    </Pressable>
  );
}

// ★ 가입 시점엔 '팀 없는 개인'으로 시작 — 팀 소속 여부는 회원가입 후
//   팀을 만들거나(TeamScreen) 초대코드로 가입하면 그때 바뀌는 상태값이라
//   여기서 미리 고를 필요가 없음.
export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // ★ v18.68 휴대폰 인증
  const [sentTo, setSentTo] = useState(''); // 인증번호를 보낸 번호(숫자만). 번호를 고치면 비움
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [phoneErr, setPhoneErr] = useState(''); // 휴대폰 칸 아래 빨간 줄(이미 가입된 번호·발송 실패·인증 만료)
  // ★ v18.68 QA — 번호 자체가 문제일 때만(형식 오류·이미 가입된 번호) 칸 테두리도 빨갛게.
  //   재발송 대기·하루 상한·잠금(429)·발송 실패(503)·인증 만료는 번호 잘못이 아니라 안내 줄만(디자인: 형식 오류만 빨간 테두리)
  const [phoneErrField, setPhoneErrField] = useState(false);
  const failPhone = (msg: string, field: boolean) => {
    setPhoneErr(msg);
    setPhoneErrField(field);
  };
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [minutes, setMinutes] = useState(3);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [phoneToken, setPhoneToken] = useState<string | null>(null);
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 발송 후 인증번호 칸으로 포커스 → iOS 키보드 위 코드 제안(oneTimeCode)·Android 자동 입력(sms-otp)이 바로 동작
  const codeRef = useRef<TextInput>(null);
  const [focusCodeTick, setFocusCodeTick] = useState(0);
  useEffect(() => {
    if (focusCodeTick) codeRef.current?.focus(); // 칸이 방금 나타난 경우라 렌더(커밋)가 끝난 뒤에 포커스
  }, [focusCodeTick]);

  const digits = stripPhoneFormatting(phone);
  const digitsRef = useRef(digits);
  digitsRef.current = digits; // 요청 도중 번호를 고쳤으면 늦게 온 응답은 버림
  const phoneOk = MOBILE_RE.test(digits);
  const phoneBad = digits.length >= 10 && !phoneOk;
  const sent = !!sentTo;
  const verified = !!phoneToken;
  const codeOk = /^\d{6}$/.test(code);

  // 남은 시간(서버가 준 분 기준) — 인증 완료 전까지만 1초마다
  useEffect(() => {
    if (!expiresAt || verified) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= expiresAt) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt, verified]);
  const remaining = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0;
  const expired = sent && !!expiresAt && remaining === 0;
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, '0');

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);
  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
    // accessibilityLiveRegion은 Android 전용 → iOS VoiceOver는 직접 읽어 줌(Android는 두 번 읽지 않게 건너뜀)
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(msg);
  };

  const resetVerification = () => {
    setSentTo('');
    setCode('');
    setCodeErr('');
    setExpiresAt(null);
    setPhoneToken(null);
  };

  const onChangePhone = (v: string) => {
    if (verified) return; // 인증한 번호는 고칠 수 없음
    const f = formatPhoneInput(v);
    if (stripPhoneFormatting(f) !== digits) {
      // 번호를 바꾸면 인증번호를 다시 받아야 함
      setSentTo('');
      setCode('');
      setCodeErr('');
      setExpiresAt(null);
      setPhoneErr('');
    }
    setPhone(f);
  };

  const sendCode = async () => {
    if (!phoneOk || sending || verified) return;
    const target = digits;
    const resend = sent;
    setSending(true);
    setPhoneErr('');
    setCodeErr('');
    try {
      const r = await sendSignupPhoneCode(target);
      if (digitsRef.current !== target) return;
      const m = r?.minutes && r.minutes > 0 ? r.minutes : 3;
      const n = Date.now();
      setMinutes(m);
      setNow(n);
      setExpiresAt(n + m * 60 * 1000);
      setSentTo(target);
      setCode('');
      setFocusCodeTick(t => t + 1);
      showToast(resend ? '인증번호를 다시 보냈어요' : '인증번호를 보냈어요');
    } catch (e: any) {
      if (digitsRef.current !== target) return;
      const body = e?.response?.data;
      if (body?.error_code === 'ERR_VALID_001') {
        resetVerification();
        failPhone(MSG.phoneFormat, true);
      } else if (body?.error_code === 'ERR_AUTH_019') {
        resetVerification();
        failPhone(body?.message ?? MSG.phoneTaken, true);
      } else {
        // 429(대기·하루 상한·잠금) / 503(발송 실패) — 이미 받은 인증번호는 계속 넣을 수 있게 입력칸은 그대로
        // 429 대기(retry_after)인데 칸이 아직 없으면 = 방금 이 번호로 이미 보냄(시간 초과로 응답만 못 받았거나
        // 뒤로 갔다가 다시 들어온 경우) → 받은 인증번호를 넣을 수 있게 칸을 열어 줌(PhoneChangeScreen과 같은 방식)
        const retry = Number(body?.data?.retry_after);
        if (retry > 0 && !sent) {
          const n = Date.now();
          setNow(n);
          setExpiresAt(n + minutes * 60_000);
          setSentTo(target);
          setCode('');
          setFocusCodeTick(t => t + 1);
        }
        failPhone(body?.message ?? MSG.sendFail, false);
      }
    } finally {
      setSending(false);
    }
  };

  const confirmCode = async () => {
    if (!sent || expired || verifying || verified) return;
    if (!codeOk) {
      setCodeErr(MSG.codeLen);
      return;
    }
    const target = sentTo;
    setVerifying(true);
    setCodeErr('');
    try {
      const r = await verifySignupPhoneCode(target, code);
      if (!r?.phone_token) throw new Error('no phone_token');
      if (digitsRef.current !== target) return;
      setPhoneToken(r.phone_token);
      setPhoneErr('');
    } catch (e: any) {
      if (digitsRef.current !== target) return;
      const body = e?.response?.data;
      setCodeErr(body?.message ?? (body?.error_code === 'ERR_AUTH_010' ? MSG.codeWrong : MSG.verifyFail));
    } finally {
      setVerifying(false);
    }
  };

  const toggleWorkType = (w: string) =>
    setWorkTypes(prev => (prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]));

  const handleRegister = async () => {
    if (!name || !email || !phone || !password || !passwordConfirm) {
      Alert.alert('오류', '모든 항목을 입력해주세요.');
      return;
    }
    if (passwordError(password)) {
      Alert.alert('비밀번호 확인', passwordError(password)!);
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!agreeTerms) {
      Alert.alert('오류', '이용약관 및 개인정보 처리방침에 동의해주세요.');
      return;
    }
    if (!phoneToken) return; // 버튼이 막혀 있어서 여기 올 일은 없음
    setLoading(true);
    try {
      const res = await registerAccount({
        name,
        email,
        phone: digits,
        password,
        password_confirmation: passwordConfirm,
        platform: 'mobile',
        agree_terms: true,
        phone_token: phoneToken,
        ...(workTypes.length ? { main_work_types: workTypes } : {}),
      });
      if (res.success) {
        await setAuth(res.data.user, res.data.token);
      }
    } catch (error: any) {
      const body = error.response?.data;
      // ★ v18.68 휴대폰 인증 만료(30분) / 인증한 뒤 그 번호로 다른 가입이 먼저 끝남(409 ERR_AUTH_019)
      //   → 인증을 풀고 '인증번호 받기'부터 다시(그대로 두면 번호 칸이 잠긴 채 같은 409만 반복)
      if (body?.error_code === 'ERR_AUTH_020' || body?.error_code === 'ERR_AUTH_019') {
        resetVerification();
        const msg = body?.message ?? (body?.error_code === 'ERR_AUTH_019' ? MSG.phoneTaken : MSG.unverified);
        failPhone(msg, body?.error_code === 'ERR_AUTH_019');
        Alert.alert('회원가입 실패', msg);
        return;
      }
      const errors = body?.errors as Record<string, string[]> | undefined;
      const message = body?.message;
      const firstFieldKey = errors ? Object.keys(errors)[0] : undefined;
      const firstFieldMsg = firstFieldKey ? errors![firstFieldKey][0] : undefined;
      if (firstFieldKey && firstFieldMsg) {
        Alert.alert('회원가입 실패', translateFieldError(firstFieldKey, firstFieldMsg));
      } else if (message) {
        Alert.alert('회원가입 실패', message);
      } else {
        Alert.alert('오류', '네트워크 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const phoneBorder = phoneBad || (phoneErr && phoneErrField) ? colors.danger : verified ? '#BDE8DF' : phone ? '#7DBBFF' : colors.border;
  const codeBorder = codeErr || expired ? colors.danger : code ? '#7DBBFF' : colors.border;

  return (
    // iOS: 키보드만큼 화면을 줄여서 아래 토스트·입력칸이 키보드에 가리지 않게(Android는 adjustResize)
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top, height: 52 + insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="뒤로가기">
          <Icon name="chevron-left" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>회원가입</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title}>기본정보 입력</Text>
          <Text style={styles.subtitle}>함께 더 나은 내일을 만들어가요.</Text>
        </View>

        <View style={styles.inputWrap}>
          <Icon name="account-outline" size={18} color={colors.muted} />
          <TextInput
            accessibilityLabel="이름"
            style={styles.input}
            placeholder="이름"
            placeholderTextColor={PLACEHOLDER}
            value={name}
            onChangeText={setName}
          />
        </View>
        <View style={styles.inputWrap}>
          <Icon name="email-outline" size={18} color={colors.muted} />
          <TextInput
            accessibilityLabel="이메일"
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor={PLACEHOLDER}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputWrap}>
          <Icon name="lock-outline" size={18} color={colors.muted} />
          <TextInput
            accessibilityLabel="비밀번호"
            style={styles.input}
            placeholder={`비밀번호 (${PASSWORD_PLACEHOLDER})`}
            placeholderTextColor={PLACEHOLDER}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        <View style={styles.inputWrap}>
          <Icon name="lock-outline" size={18} color={colors.muted} />
          <TextInput
            accessibilityLabel="비밀번호 확인"
            style={styles.input}
            placeholder="비밀번호 확인"
            placeholderTextColor={PLACEHOLDER}
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secureTextEntry
          />
        </View>

        {/* ★ v18.68 휴대폰 번호 + 인증번호 받기 */}
        <View style={styles.field}>
          <View style={styles.row}>
            <View style={[styles.inputWrap, styles.flex1, { borderColor: phoneBorder }, verified && styles.inputVerified]}>
              <Icon name="cellphone" size={18} color={colors.muted} />
              <TextInput
                accessibilityLabel="휴대폰 번호"
                style={styles.input}
                placeholder="휴대폰 번호"
                placeholderTextColor={PLACEHOLDER}
                value={phone}
                onChangeText={onChangePhone}
                editable={!verified}
                keyboardType="number-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                maxLength={13}
              />
              {verified && (
                <View style={styles.okPill}>
                  <Icon name="check-bold" size={13} color="#0B8574" />
                  <Text style={styles.okPillText}>확인됨</Text>
                </View>
              )}
            </View>
            {!verified && (
              <SideButton
                label={sent ? '다시 받기' : '인증번호 받기'}
                active={phoneOk}
                disabled={!phoneOk}
                loading={sending}
                onPress={sendCode}
              />
            )}
          </View>
          {phoneBad ? <ErrorLine>{MSG.phoneFormat}</ErrorLine> : !!phoneErr && <ErrorLine>{phoneErr}</ErrorLine>}
        </View>

        {/* 인증번호 6자리 + 남은 시간 + 확인 */}
        {sent && !verified && (
          <View style={styles.field}>
            <View style={styles.row}>
              <View style={[styles.inputWrap, styles.flex1, { borderColor: codeBorder }]}>
                <Icon name="shield-check-outline" size={18} color={colors.muted} />
                <TextInput
                  ref={codeRef}
                  accessibilityLabel="인증번호"
                  style={[styles.input, styles.codeInput]}
                  placeholder="인증번호 6자리"
                  placeholderTextColor={PLACEHOLDER}
                  value={code}
                  onChangeText={v => { setCode(v.replace(/\D/g, '').slice(0, 6)); setCodeErr(''); }}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={6}
                />
                <Text style={styles.timer} accessibilityLabel={`남은 시간 ${mm}분 ${ss}초`}>
                  {mm}:{ss}
                </Text>
              </View>
              <SideButton
                label="확인"
                active={codeOk && !expired}
                disabled={expired}
                loading={verifying}
                onPress={confirmCode}
              />
            </View>
            {expired ? <ErrorLine>{MSG.expired}</ErrorLine> : !!codeErr && <ErrorLine>{codeErr}</ErrorLine>}
            <Text style={styles.help}>
              문자로 받은 6자리를 {minutes}분 안에 입력해주세요. 안 오면 [다시 받기]를 눌러주세요.
            </Text>
          </View>
        )}

        {verified && (
          <View style={styles.okRow} accessibilityLiveRegion="polite">
            <Icon name="check-bold" size={15} color="#0B8574" />
            <Text style={styles.okText}>휴대폰 인증을 완료했어요</Text>
          </View>
        )}

        {/* ★ v18.68 주요 공정 (복수 선택) — 선택 안 해도 됨 */}
        <View style={styles.chipField}>
          <Text style={styles.legend}>
            주요 공정 <Text style={styles.legendSub}>(복수 선택)</Text>
          </Text>
          <View style={styles.chips}>
            {SIGNUP_WORK_TYPES.map(w => {
              const on = workTypes.includes(w);
              return (
                <Pressable
                  key={w}
                  onPress={() => toggleWorkType(w)}
                  style={[styles.chip, on && styles.chipOn]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{w}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={styles.agreeRow}
          onPress={() => setAgreeTerms(v => !v)}
          disabled={loading}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreeTerms, disabled: loading }}
        >
          <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
            {agreeTerms && <Icon name="check-bold" size={12} color={colors.surface} />}
          </View>
          <Text style={styles.agreeText}>
            <Text
              style={styles.agreeLink}
              onPress={() => navigation.navigate('LegalDocument', { type: 'terms' })}
            >
              이용약관
            </Text>
            {' 및 '}
            <Text
              style={styles.agreeLink}
              onPress={() => navigation.navigate('LegalDocument', { type: 'privacy' })}
            >
              개인정보 처리방침
            </Text>
            에 동의합니다.
          </Text>
        </TouchableOpacity>

        {verified ? (
          <Pressable
            onPress={handleRegister}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="가입하기"
            accessibilityState={{ disabled: loading, busy: loading }}
            style={({ pressed }) => [styles.buttonWrap, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.signupBtn}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.signupText}>가입하기</Text>}
            </LinearGradient>
          </Pressable>
        ) : (
          <View style={[styles.buttonWrap, styles.signupOffWrap]}>
            <View
              style={[styles.signupBtn, styles.signupOff]}
              accessible
              accessibilityRole="button"
              accessibilityLabel="가입하기"
              accessibilityState={{ disabled: true }}
            >
              <Text style={styles.signupText}>가입하기</Text>
            </View>
            <Text style={styles.signupHelp}>휴대폰 인증을 마쳐야 가입할 수 있어요</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.loginLinkText}>
            이미 계정이 있으신가요? <Text style={styles.loginLinkBold}>로그인</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ★ v18.70 — 기기 하단 바 높이는 스택 공통 화면 틀이 이미 비워 둠(AppNavigator) → 여기서 또 더하면 두 번 띄워짐
          ★ v18.70 QA — 토스트를 키보드 위로: 안드로이드 15+는 키보드가 떠도 화면이 줄지 않아('인증번호를 보냈어요'가
          자동으로 열리는 숫자 키보드 뒤에 숨었음) 화면 전체를 덮는 투명 층(toastLayer)이 키보드와 겹친 만큼 아래를 비움.
          겹친 만큼을 직접 재므로 화면이 줄어드는 안드로이드 14 이하는 0(두 번 안 올라감). iOS는 바깥 KeyboardAvoidingView가 처리.
          층은 늘 깔아 둬야 키보드가 먼저 열려 있어도 높이를 앎. 빈 곳 터치는 아래 화면으로 그대로 감(box-none) */}
      <KeyboardAvoidingView
        style={styles.toastLayer}
        behavior={Platform.OS === 'android' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        {!!toast && (
          <Pressable
            onPress={() => setToast('')}
            style={styles.toast}
            accessibilityLiveRegion="polite"
          >
            <View style={styles.toastDot}><Icon name="check-bold" size={14} color="#FFFFFF" /></View>
            <Text style={styles.toastText}>{toast}</Text>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    backgroundColor: colors.surface,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  container: {
    flexGrow: 1,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: 10,
  },
  titleBlock: { gap: 6 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  field: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex1: { flex: 1, minWidth: 0 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputVerified: { backgroundColor: '#F3FBF9' },
  input: { flex: 1, minWidth: 0, fontSize: 14, color: colors.textPrimary, paddingVertical: 0 },
  codeInput: { letterSpacing: 2 },
  timer: { fontSize: 13, fontWeight: '700', color: colors.danger, fontVariant: ['tabular-nums'] },
  okPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 7,
    backgroundColor: '#E2F8F4',
  },
  okPillText: { fontSize: 12, fontWeight: '700', color: '#0B8574' },
  sideBtn: { width: 104, height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  sideBtnOff: { backgroundColor: '#CFE0F3' },
  sideText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errText: { flexShrink: 1, fontSize: 12, fontWeight: '600', color: colors.danger },
  help: { fontSize: 12, color: colors.textSecondary },
  okRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  okText: { fontSize: 13, fontWeight: '600', color: '#0B8574' },
  chipField: { gap: 8 },
  legend: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  legendSub: { fontWeight: '400', color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: '#E8F3FF', borderColor: '#BFDBFB' },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextOn: { color: colors.primaryDark, fontWeight: '700' },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#C5D5E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  agreeText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  agreeLink: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  buttonWrap: { marginTop: 6 },
  signupBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 4,
  },
  signupOffWrap: { gap: 6 },
  signupOff: { backgroundColor: '#B9D6F7', shadowOpacity: 0, elevation: 0 },
  signupText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  signupHelp: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  loginLink: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  loginLinkText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  loginLinkBold: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  // ★ v18.70 QA — 토스트 위치는 toastLayer(화면 전체, 아래 정렬 + 키보드와 겹친 만큼 아래 여백) 안에서 아래 32 · 좌우 16
  toastLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 25 },
  toast: {
    marginHorizontal: 16,
    marginBottom: 32,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(16,42,86,0.94)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toastDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#2CC4B2', alignItems: 'center', justifyContent: 'center' },
  toastText: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
