import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigationRef, flushPendingNavigation, handleAppLink, flushPendingLink } from './navigationRef';
import { registerPush } from '../utils/push';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { useAppUpdateStore } from '../store/appUpdateStore'; // ★ v18.69
import BottomTabNavigator from './BottomTabNavigator';
import { colors } from '../theme/designTokens';

import LoginScreen from '../screens/LoginScreen';
// ★ v18.51 — 소셜 계정 연결(처음 소셜 로그인 안내·약관·가입 완료·쓰던 계정 연결) + 로그인 연결 관리
import SocialFirstLoginScreen from '../screens/SocialFirstLoginScreen';
import SocialSignupTermsScreen from '../screens/SocialSignupTermsScreen';
import SocialSignupDoneScreen from '../screens/SocialSignupDoneScreen';
import SocialLinkSigninScreen from '../screens/SocialLinkSigninScreen';
import MyLoginLinksScreen from '../screens/MyLoginLinksScreen';
import MyPasswordScreen from '../screens/MyPasswordScreen';
import PhoneChangeScreen from '../screens/PhoneChangeScreen'; // ★ v18.66
import RegisterScreen from '../screens/RegisterScreen';
import FindEmailScreen from '../screens/FindEmailScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import IncomeListScreen from '../screens/IncomeListScreen';
import IncomeDetailScreen from '../screens/IncomeDetailScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import ScheduleDetailScreen from '../screens/ScheduleDetailScreen';
import ScheduleCreateScreen from '../screens/ScheduleCreateScreen';
import ScheduleDayScreen from '../screens/ScheduleDayScreen';
import QuickCreateScreen from '../screens/QuickCreateScreen';
import MyRatesScreen from '../screens/MyRatesScreen';
import TradeRatesScreen from '../screens/TradeRatesScreen';
import PhotoCompareScreen from '../screens/PhotoCompareScreen';
// ★ 이번 작업 추가 — 팀/견적서/자동보고서/명함/세무자료 (백엔드·웹은 v11.8~v17에서 이미 구현됨)
// ★ v18.34 — 팀 화면군을 DESIGN-CANVAS 구조(목록/상세/생성/초대/참여)로 분리
import TeamListScreen from '../screens/TeamListScreen';
import TeamDetailScreen from '../screens/TeamDetailScreen';
import TeamCreateScreen from '../screens/TeamCreateScreen';
import TeamInviteScreen from '../screens/TeamInviteScreen';
import TeamJoinScreen from '../screens/TeamJoinScreen';
import TeamContactPickScreen from '../screens/TeamContactPickScreen';
import InquiryListScreen from '../screens/InquiryListScreen';
import InquiryCreateScreen from '../screens/InquiryCreateScreen';
import InquiryDetailScreen from '../screens/InquiryDetailScreen';
import QuoteListScreen from '../screens/QuoteListScreen';
import QuoteFormScreen from '../screens/QuoteFormScreen';
import QuoteDetailScreen from '../screens/QuoteDetailScreen';
import QuotePreviewScreen from '../screens/QuotePreviewScreen';
import ScheduleReportsScreen from '../screens/ScheduleReportsScreen';
import BusinessCardScreen from '../screens/BusinessCardScreen';
import TaxHomeScreen from '../screens/TaxHomeScreen';
import TaxMonthDetailScreen from '../screens/TaxMonthDetailScreen';
import TaxExportScreen from '../screens/TaxExportScreen';
// ★ v18.1 추가 — 설정 화면 스텁 실구현 (알림 설정 / 현장 목록)
import SiteListScreen from '../screens/SiteListScreen';
import SiteDetailScreen from '../screens/SiteDetailScreen';
import SiteFormScreen from '../screens/SiteFormScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import LegalDocumentScreen from '../screens/LegalDocumentScreen';
import AppInfoScreen from '../screens/AppInfoScreen';
import OpenSourceLicensesScreen from '../screens/OpenSourceLicensesScreen';
import ProfilePublicScreen from '../screens/ProfilePublicScreen';
import SplashScreen from '../screens/SplashScreen';
import NoticeListScreen from '../screens/NoticeListScreen';
import NoticeDetailScreen from '../screens/NoticeDetailScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
// ★ v18.48 — 팀 요금제 화면 + 요금제
import TeamNoticeListScreen from '../screens/TeamNoticeListScreen';
import TeamSettlementScreen from '../screens/TeamSettlementScreen';
import TeamSettlementDetailScreen from '../screens/TeamSettlementDetailScreen';
import TeamAlbumScreen from '../screens/TeamAlbumScreen';
import TeamAlbumSiteScreen from '../screens/TeamAlbumSiteScreen';
import PlanScreen from '../screens/PlanScreen';

const Stack = createNativeStackNavigator();

// ★ v18.70 — 아래 안전 영역을 화면이 직접 처리하는 화면: 스택 공통 화면 틀(screenOptions의 contentStyle)의 아래 여백·바탕색을 빼고 그대로 그림
const SELF_INSET = { contentStyle: undefined };

// ★ v18.70 QA — 화면 틀 아래 칸(기기 하단 바 뒤)의 색 = 그 화면 아래쪽 바탕색.
//   예전엔 전부 흰색이라 연한 파랑 바탕(colors.background) 화면(앱 정보·고객 문의·일정 등록·내 명함 등 대부분)에서
//   맨 아래에 흰 띠가 따로 보였음. 기본은 앱 공통 바탕색, 아래쪽이 다른 색인 화면만 여기 적음
//   (화면의 바탕색·아래 고정 버튼 줄을 바꾸면 여기도 같이 바꿀 것)
const FRAME_BOTTOM_BG: Record<string, string> = {
  // 흰 바탕 화면
  Login: colors.surface,
  Register: colors.surface,
  SocialFirstLogin: colors.surface,
  SocialSignupTerms: colors.surface,
  SocialSignupDone: colors.surface,
  SocialLinkSignin: colors.surface,
  FindEmail: colors.surface,
  ForgotPassword: colors.surface,
  MyPassword: colors.surface,
  PhoneChange: colors.surface,
  TeamJoin: colors.surface,
  NoticeDetail: colors.surface,
  LegalDocument: colors.surface,
  // 맨 아래에 흰 버튼 줄이 붙어 있는 화면
  TeamContactPick: colors.surface,
  // 견적서 미리보기(회색 바탕)
  QuotePreview: '#EEF3F9',
};

/**
 * ═══════════════════════════════════════════
 * 최상위 Stack — 로그인/모달 분기
 * ═══════════════════════════════════════════
 */
export default function AppNavigator() {
  const { isLoggedIn, isLoading, restoreAuth } = useAuthStore();

  // ★ v18.70 — 안드로이드 하단 시스템 바(뒤로·홈·최근 / 제스처 바)를 다시 보이게 하면서(MainActivity)
  //   스택 화면 틀(contentStyle) 아래쪽을 바 높이(insets.bottom)만큼 비우고 그 칸을 화면 바탕색으로 칠함(FRAME_BOTTOM_BG).
  //   → 화면마다 따로 손대지 않아도 아래 고정 버튼·토스트·플로팅 버튼·목록 끝이 전부 바 위로 올라옴.
  //   · 안드로이드 15+: 앱이 바 뒤까지 그려져서 바 높이만큼 비움(바는 투명 → 밝은 칸 위에 어두운 버튼)
  //   · 안드로이드 14 이하: 바가 자기 자리를 따로 차지(흰 바, values-v27/styles.xml) → insets.bottom = 0이라 그대로
  //   · iOS: 홈 인디케이터 높이만큼
  //   예외(SELF_INSET — 화면이 직접 띄움): MainTabs(하단 탭이 탭 높이에 더함), QuickCreate(투명 시트 — 어두운 배경은
  //   바 뒤까지 덮고 흰 판만 올림), PhotoCompare(검은 화면 — SafeAreaView edges bottom)
  //   Modal로 뜨는 시트는 따로 뜬 창이라 여기 영향을 안 받음 → components/ModalBottomSafeArea
  const insets = useSafeAreaInsets();
  const screenOptions = ({ route }: { route: { name: string } }) => ({
    headerShown: false,
    contentStyle: { backgroundColor: FRAME_BOTTOM_BG[route.name] ?? colors.background, paddingBottom: insets.bottom },
  });

  // ★ v18.36 — 스플래시: 로그인 복원이 금방 끝나도 로고 애니메이션이 보이도록 최소 2.5초 유지
  const [minSplashDone, setMinSplashDone] = useState(false);

  useEffect(() => {
    restoreAuth();
    const t = setTimeout(() => setMinSplashDone(true), 2500);
    return () => clearTimeout(t);
  }, [restoreAuth]);

  // ★ v18.38 — 로그인 상태가 되면 이 기기를 푸시 수신 기기로 등록
  useEffect(() => {
    if (isLoggedIn) registerPush();
  }, [isLoggedIn]);

  // ★ v18.43 — 웹의 "앱에서 열기"(초대·공지 링크)로 앱이 열리거나, 켜져 있을 때 링크를 누른 경우
  useEffect(() => {
    Linking.getInitialURL().then(url => handleAppLink(url, useAuthStore.getState().isLoggedIn)).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => handleAppLink(url, useAuthStore.getState().isLoggedIn));
    return () => sub.remove();
  }, []);

  // 로그인 전에 링크로 들어왔으면 로그인 후 해당 화면으로
  useEffect(() => {
    if (isLoggedIn) flushPendingLink();
  }, [isLoggedIn]);

  // ★ v18.69 — 스플래시가 끝나면 선택 업데이트 안내 시트를 띄워도 됨(강제 업데이트면 App.tsx가 이 화면 대신 업데이트 화면을 바로 그림)
  const splashDone = !isLoading && minSplashDone;
  useEffect(() => {
    if (splashDone) useAppUpdateStore.getState().setPromptReady();
  }, [splashDone]);

  if (isLoading || !minSplashDone) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={flushPendingNavigation}>
      <Stack.Navigator screenOptions={screenOptions}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="MainTabs" component={BottomTabNavigator} options={SELF_INSET} />
            {/* ★ v18.29: 드로어 제거 — 아래 화면들은 하단탭 '내정보' 메뉴에서 push로 진입 */}
            <Stack.Screen name="IncomeList" component={IncomeListScreen} />
            <Stack.Screen name="IncomeDetail" component={IncomeDetailScreen} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} />
            <Stack.Screen name="Team" component={TeamListScreen} />
            <Stack.Screen name="TeamList" component={TeamListScreen} />
            <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
            <Stack.Screen name="TeamCreate" component={TeamCreateScreen} />
            <Stack.Screen name="TeamInvite" component={TeamInviteScreen} />
            <Stack.Screen name="TeamJoin" component={TeamJoinScreen} />
            {/* ★ v18.43 연락처 초대 · 고객 문의 */}
            <Stack.Screen name="TeamContactPick" component={TeamContactPickScreen} />
            <Stack.Screen name="TeamNoticeList" component={TeamNoticeListScreen} />
            <Stack.Screen name="TeamSettlement" component={TeamSettlementScreen} />
            <Stack.Screen name="TeamSettlementDetail" component={TeamSettlementDetailScreen} />
            <Stack.Screen name="TeamAlbum" component={TeamAlbumScreen} />
            <Stack.Screen name="TeamAlbumSite" component={TeamAlbumSiteScreen} />
            <Stack.Screen name="Plan" component={PlanScreen} />
            <Stack.Screen name="InquiryList" component={InquiryListScreen} />
            <Stack.Screen name="InquiryCreate" component={InquiryCreateScreen} />
            <Stack.Screen name="InquiryDetail" component={InquiryDetailScreen} />
            <Stack.Screen name="QuoteList" component={QuoteListScreen} />
            <Stack.Screen name="QuoteDetail" component={QuoteDetailScreen} />
            <Stack.Screen name="QuoteEdit" component={QuoteFormScreen} />
            <Stack.Screen name="QuotePreview" component={QuotePreviewScreen} />
            <Stack.Screen name="BusinessCard" component={BusinessCardScreen} />
            <Stack.Screen name="TaxSummary" component={TaxHomeScreen} />
            <Stack.Screen name="TaxMonthDetail" component={TaxMonthDetailScreen} />
            <Stack.Screen name="TaxExport" component={TaxExportScreen} />
            {/* ★ v11.7: 아래 화면들은 각자 AppHeader(leftType="back")를 자체 렌더링 */}
            <Stack.Screen name="ScheduleDetail" component={ScheduleDetailScreen} />
            <Stack.Screen name="ScheduleDay" component={ScheduleDayScreen} />
            <Stack.Screen
              name="QuickCreate"
              component={QuickCreateScreen}
              options={{ ...SELF_INSET, presentation: 'transparentModal', animation: 'fade' }}
            />
            <Stack.Screen
              name="ScheduleCreate"
              component={ScheduleCreateScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="MyRates" component={MyRatesScreen} />
            <Stack.Screen name="TradeRates" component={TradeRatesScreen} />
            <Stack.Screen name="WageSettings" component={TradeRatesScreen} />
            <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
            <Stack.Screen name="ProfilePublic" component={ProfilePublicScreen} />
            <Stack.Screen name="MyLoginLinks" component={MyLoginLinksScreen} />
            {/* ★ v18.52 — 이메일·비밀번호 설정/변경, 변경 화면의 '비밀번호를 잊으셨나요?' */}
            <Stack.Screen name="MyPassword" component={MyPasswordScreen} />
            {/* ★ v18.66 — 휴대폰 번호 변경(본인 확인 + 새 번호 문자 인증), 프로필 설정의 [변경] */}
            <Stack.Screen name="PhoneChange" component={PhoneChangeScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="PhotoCompare" component={PhotoCompareScreen} options={SELF_INSET} />
            {/* ★ 이번 작업 추가 */}
            <Stack.Screen name="QuoteCreate" component={QuoteFormScreen} />
            <Stack.Screen name="ScheduleReports" component={ScheduleReportsScreen} />
            {/* ★ v18.1 추가 */}
            <Stack.Screen name="SiteList" component={SiteListScreen} />
            <Stack.Screen name="SiteDetail" component={SiteDetailScreen} />
            <Stack.Screen name="SiteCreate" component={SiteFormScreen} />
            <Stack.Screen name="SiteEdit" component={SiteFormScreen} />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
            />
            <Stack.Screen name="AppInfo" component={AppInfoScreen} />
            <Stack.Screen name="OpenSourceLicenses" component={OpenSourceLicensesScreen} />
            {/* ★ v18.33: 공지·이벤트 (홈 메뉴/공지 띠에서 진입) */}
            <Stack.Screen name="NoticeList" component={NoticeListScreen} />
            <Stack.Screen name="NoticeDetail" component={NoticeDetailScreen} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="SocialFirstLogin" component={SocialFirstLoginScreen} />
            <Stack.Screen name="SocialSignupTerms" component={SocialSignupTermsScreen} />
            <Stack.Screen name="SocialSignupDone" component={SocialSignupDoneScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="SocialLinkSignin" component={SocialLinkSigninScreen} />
            <Stack.Screen name="FindEmail" component={FindEmailScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
          </>
        )}
        {/* 로그인 여부와 무관하게 접근 가능 (약관/개인정보 — 가입 화면에서도 열람) */}
        <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}