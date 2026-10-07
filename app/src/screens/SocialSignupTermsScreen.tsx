// ★ v18.51 — 디자인 AUTH_SIGNUP_TERMS: 소셜 신규 가입("처음이에요") 약관 동의 → 가입.
//   기본정보(이름·이메일)는 카카오·구글에서 받아오므로 기본정보 단계 없이 바로 완료로.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { socialSignup } from '../api/socialAuthApi';
import GradientButton from '../components/GradientButton';
import { CheckBox } from '../components/TeamUi';
import type { SocialFlowParams } from './SocialFirstLoginScreen';

const ITEMS: { label: string; required: boolean; doc?: 'terms' | 'privacy' }[] = [
  { label: '이용약관 동의', required: true, doc: 'terms' },
  { label: '개인정보 처리방침 동의', required: true, doc: 'privacy' },
  { label: '마케팅 정보 수신 동의', required: false },
];

export default function SocialSignupTermsScreen() {
  const navigation = useNavigation<any>();
  const params = useRoute<any>().params as SocialFlowParams;
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState([false, false, false]);
  const [saving, setSaving] = useState(false);
  const all = checked.every(Boolean);
  const ready = checked[0] && checked[1];

  const toggle = (i: number) => setChecked(c => c.map((v, j) => (j === i ? !v : v)));

  const submit = async () => {
    setSaving(true);
    try {
      const res = await socialSignup(params.ticket, checked[2]);
      navigation.replace('SocialSignupDone', {
        user: res.data.user,
        token: res.data.token,
        keepLoggedIn: params.keepLoggedIn ?? true,
      });
    } catch (e: any) {
      const code = e?.response?.data?.error_code;
      Alert.alert('가입하지 못했어요', e?.response?.data?.message ?? '잠시 후 다시 시도해주세요.', [
        { text: '확인', onPress: () => code === 'ERR_AUTH_013' && navigation.popToTop() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityLabel="뒤로가기">
          <Icon name="chevron-left" size={26} color="#102A56" />
        </Pressable>
        <Text style={styles.headerTitle}>회원가입</Text>
        <View style={styles.iconBtn} />
      </View>
      <ScrollView contentContainerStyle={styles.main}>
        <View style={{ gap: 6 }}>
          <Text style={styles.h2}>약관 동의</Text>
          <Text style={styles.sub}>함께 더 나은 내일을 만들어가요.</Text>
        </View>
        <Text style={styles.steps}>
          <Text style={styles.stepOn}>1</Text> 약관 동의 <Text style={styles.stepSep}>›</Text> 2 완료
        </Text>

        <Pressable
          style={styles.allRow}
          onPress={() => setChecked([!all, !all, !all])}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: all }}
        >
          <CheckBox checked={all} size={22} />
          <Text style={styles.allText}>전체 약관에 동의합니다</Text>
        </Pressable>

        <View style={styles.list}>
          {ITEMS.map((it, i) => (
            <View key={it.label} style={[styles.item, i < ITEMS.length - 1 && styles.itemLine]}>
              <Pressable
                onPress={() => toggle(i)}
                style={styles.itemMain}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: checked[i] }}
                accessibilityLabel={it.label}
              >
                <CheckBox checked={checked[i]} size={22} />
                <Text style={styles.itemLabel}>{it.label}</Text>
              </Pressable>
              <Text style={[styles.tag, it.required ? styles.tagReq : styles.tagOpt]}>{it.required ? '필수' : '선택'}</Text>
              {it.doc ? (
                <Pressable onPress={() => navigation.navigate('LegalDocument', { type: it.doc })} hitSlop={8} accessibilityLabel="약관 보기">
                  <Icon name="chevron-right" size={18} color="#8FA3BF" />
                </Pressable>
              ) : (
                <View style={{ width: 18 }} />
              )}
            </View>
          ))}
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />
        <GradientButton onPress={submit} disabled={!ready} loading={saving}>다음</GradientButton>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#102A56' },
  main: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32, gap: 14 },
  h2: { fontSize: 22, fontWeight: '800', color: '#102A56' },
  sub: { fontSize: 14, color: '#5F7290' },
  steps: { fontSize: 12, color: '#5F7290' },
  stepOn: { color: '#0A6CE0', fontWeight: '700' },
  stepSep: { color: '#B8C6D8' },
  allRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, height: 56, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1, borderColor: '#CFE3FA', backgroundColor: '#F3F9FF',
  },
  allText: { fontSize: 15, fontWeight: '700', color: '#102A56' },
  list: { borderWidth: 1, borderColor: '#DDEAF7', borderRadius: 12, backgroundColor: '#FFFFFF', paddingVertical: 4, paddingHorizontal: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  itemLine: { borderBottomWidth: 1, borderBottomColor: '#EDF3FA' },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemLabel: { flex: 1, fontSize: 14, color: '#102A56' },
  tag: { fontSize: 11, fontWeight: '700', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6, overflow: 'hidden' },
  tagReq: { backgroundColor: '#E8F3FF', color: '#0A6CE0' },
  tagOpt: { backgroundColor: '#EEF2F7', color: '#5F7290' },
});
