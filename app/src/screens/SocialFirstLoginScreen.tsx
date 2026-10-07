// ★ v18.51 — 디자인 SOCIAL_FIRST_LOGIN: 연결된 계정이 없는 소셜 로그인 → 새로 시작 / 쓰던 계정에 연결
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PROVIDER_NAME, SocialProvider } from '../api/socialAuthApi';
import GradientButton from '../components/GradientButton';
import { ProviderBadge, OutlineButton } from '../components/AuthUi';
import { ICONS } from '../assets/icons';

export type SocialFlowParams = { provider: SocialProvider; display: string; ticket: string; keepLoggedIn?: boolean };

export default function SocialFirstLoginScreen() {
  const navigation = useNavigation<any>();
  const params = useRoute<any>().params as SocialFlowParams;
  const insets = useSafeAreaInsets();
  const via = PROVIDER_NAME[params.provider];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityLabel="닫고 로그인 화면으로">
          <Icon name="close" size={22} color="#102A56" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.main}>
        <View style={styles.hero}>
          <Image source={ICONS.logo} style={styles.logo} />
          <Text style={styles.title}>WorkMate가 처음이신가요?</Text>
          <Text style={styles.desc}>
            이 {via} 계정과 연결된 WorkMate 계정이 없어요.{'\n'}새로 시작할지, 쓰던 계정에 연결할지 골라주세요.
          </Text>
        </View>

        <View style={styles.whoCard}>
          <ProviderBadge provider={params.provider} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={styles.whoSub}>{via}로 들어왔어요</Text>
            <Text style={styles.whoName} numberOfLines={1}>{params.display}</Text>
          </View>
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />

        <GradientButton onPress={() => navigation.navigate('SocialSignupTerms', params)}>
          처음이에요, 새로 시작할게요
        </GradientButton>
        <OutlineButton onPress={() => navigation.navigate('SocialLinkSignin', params)}>이미 계정이 있어요</OutlineButton>
        <Text style={styles.foot}>
          쓰던 계정이 있다면 연결해야 일정 · 수입 기록이 이어져요.{'\n'}새로 만들면 빈 계정으로 시작해요.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  main: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 28, gap: 12 },
  hero: { alignItems: 'center', gap: 12, paddingTop: 28, paddingBottom: 14 },
  logo: { width: 76, height: 76, resizeMode: 'contain' },
  title: { marginTop: 6, fontSize: 24, fontWeight: '800', letterSpacing: -0.4, color: '#102A56', textAlign: 'center' },
  desc: { fontSize: 14, lineHeight: 22, color: '#5F7290', textAlign: 'center' },
  whoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3EEFA',
  },
  whoSub: { fontSize: 12, color: '#5F7290' },
  whoName: { fontSize: 15, fontWeight: '700', color: '#102A56' },
  foot: { fontSize: 12, lineHeight: 19, color: '#5F7290', textAlign: 'center' },
});
