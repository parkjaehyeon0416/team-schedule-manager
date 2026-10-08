// ★ v18.52 — 디자인 MY_PASSWORD_SET(A 이메일 있음 / B 이메일 없음) · MY_PASSWORD_CHANGE
//   로그인 연결 관리의 이메일·비밀번호 [설정]/[변경]. 완료하면 연결 관리로 돌아가 토스트.
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setPassword } from '../api/socialAuthApi';
import GradientButton from '../components/GradientButton';
import { passwordError, PASSWORD_HINT, PASSWORD_PLACEHOLDER } from '../utils/passwordPolicy';

type Params = { mode: 'set' | 'change'; email: string | null };

const border = (err: boolean, val: string) => (err ? '#E5484D' : val ? '#7DBBFF' : '#DDEAF7');

function ErrorText({ children }: { children: string }) {
  return (
    <View style={s.errRow} accessibilityRole="alert">
      <Icon name="information-outline" size={13} color="#E5484D" />
      <Text style={s.errText}>{children}</Text>
    </View>
  );
}

function PwField({ id, label, value, onChange, placeholder, err }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string; err: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={s.inputBox}>
      <View style={[s.input, { borderColor: border(err, value) }]}>
        <Icon name="lock-outline" size={18} color="#8FA3BF" />
        <TextInput
          nativeID={id}
          accessibilityLabel={label}
          style={s.inputText}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#9AACC4"
          secureTextEntry={!show}
          autoCapitalize="none"
          autoComplete="new-password"
        />
        <Pressable onPress={() => setShow(v => !v)} style={s.eye} accessibilityLabel="비밀번호 보기 또는 숨기기">
          <Icon name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color="#8FA3BF" />
        </Pressable>
      </View>
    </View>
  );
}

export default function MyPasswordScreen() {
  const navigation = useNavigation<any>();
  const { mode, email } = useRoute<any>().params as Params;
  const insets = useSafeAreaInsets();
  const isChange = mode === 'change';
  const [em, setEm] = useState('');
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [emDup, setEmDup] = useState('');
  const [wrong, setWrong] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const short = pw.length > 0 && !!passwordError(pw); // ★ v18.62 영문+특수문자 8~16자
  const mismatch = pw2.length > 0 && pw2 !== pw;
  const emOk = !!email || /.+@.+\..+/.test(em.trim());
  const ok = emOk && !emDup && (!isChange || (cur.length > 0 && !wrong)) && !passwordError(pw) && pw2 === pw;

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await setPassword({
        ...(email ? {} : { email: em.trim() }),
        ...(isChange ? { current_password: cur } : {}),
        password: pw,
        password_confirmation: pw2,
      });
      navigation.popTo('MyLoginLinks', { toast: isChange ? '비밀번호를 변경했어요' : '이메일 로그인을 설정했어요' });
    } catch (e: any) {
      const body = e?.response?.data;
      if (body?.error_code === 'ERR_AUTH_001') setWrong(true);
      else if (body?.errors?.email) setEmDup(body.errors.email[0]);
      else setError(body?.errors ? String(Object.values(body.errors)[0]) : body?.message ?? '저장하지 못했어요. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[s.screen, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.iconBtn} accessibilityLabel="뒤로가기">
          <Icon name="chevron-left" size={26} color="#102A56" />
        </Pressable>
        <Text style={s.headerTitle}>{isChange ? '비밀번호 변경' : '이메일 로그인 설정'}</Text>
        <View style={s.iconBtn} />
      </View>
      <ScrollView contentContainerStyle={s.main} keyboardShouldPersistTaps="handled">
        <Text style={s.lead}>
          {isChange ? '이메일 로그인에 쓰는 비밀번호를 바꿔요.' : '설정하면 이메일과 비밀번호로도 로그인할 수 있어요.'}
        </Text>

        <View style={s.field}>
          <Text style={s.label}>이메일</Text>
          {email ? (
            <>
              <View style={s.readonly} accessibilityState={{ disabled: true }}>
                <Icon name="email-outline" size={18} color="#8FA3BF" />
                <Text style={s.readonlyText} numberOfLines={1}>{email}</Text>
                <Icon name="lock-outline" size={16} color="#8FA3BF" accessibilityLabel="수정할 수 없음" />
              </View>
              <Text style={s.help}>{isChange ? '로그인 아이디로 쓰여요' : '로그인 아이디로 쓰여요 · 바꿀 수 없어요'}</Text>
            </>
          ) : (
            <>
              <View style={[s.input, { borderColor: border(!!emDup, em), paddingRight: 14 }]}>
                <Icon name="email-outline" size={18} color="#8FA3BF" />
                <TextInput
                  accessibilityLabel="이메일"
                  style={s.inputText}
                  value={em}
                  onChangeText={v => { setEm(v); setEmDup(''); }}
                  placeholder="이메일 입력"
                  placeholderTextColor="#9AACC4"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
              {!!emDup && <ErrorText>{emDup}</ErrorText>}
              <Text style={s.help}>로그인 아이디로 쓰여요</Text>
            </>
          )}
        </View>

        {isChange && (
          <View style={s.field}>
            <Text style={s.label}>현재 비밀번호</Text>
            <PwField id="pcur" label="현재 비밀번호" value={cur} onChange={v => { setCur(v); setWrong(false); }} placeholder="현재 비밀번호 입력" err={wrong} />
            {wrong && <ErrorText>현재 비밀번호가 맞지 않아요.</ErrorText>}
            <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-start', paddingVertical: 2 }}>
              <Text style={s.link}>비밀번호를 잊으셨나요?</Text>
            </Pressable>
          </View>
        )}

        <View style={s.field}>
          <Text style={s.label}>{isChange ? '새 비밀번호' : '비밀번호'}</Text>
          <PwField id="pnew" label={isChange ? '새 비밀번호' : '비밀번호'} value={pw} onChange={setPw} placeholder={PASSWORD_PLACEHOLDER} err={short} />
          {short && <ErrorText>{PASSWORD_HINT}</ErrorText>}
        </View>

        <View style={s.field}>
          <Text style={s.label}>{isChange ? '새 비밀번호 확인' : '비밀번호 확인'}</Text>
          <PwField id="pnew2" label={isChange ? '새 비밀번호 확인' : '비밀번호 확인'} value={pw2} onChange={setPw2} placeholder="한 번 더 입력" err={mismatch} />
          {mismatch && <ErrorText>비밀번호 확인이 일치하지 않아요.</ErrorText>}
        </View>

        {!!error && <ErrorText>{error}</ErrorText>}
        <View style={{ flex: 1, minHeight: 16 }} />
        {ok ? (
          <GradientButton onPress={submit} loading={saving}>{isChange ? '변경하기' : '저장'}</GradientButton>
        ) : (
          <View style={s.btnOff} accessibilityState={{ disabled: true }}>
            <Text style={s.btnOffText}>{isChange ? '변경하기' : '저장'}</Text>
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
  inputBox: {},
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
});
