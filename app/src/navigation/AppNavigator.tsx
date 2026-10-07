import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Linking } from 'react-native';
import { navigationRef, flushPendingNavigation, handleAppLink, flushPendingLink } from './navigationRef';
import { registerPush } from '../utils/push';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import BottomTabNavigator from './BottomTabNavigator';

import LoginScreen from '../screens/LoginScreen';
// ★ v18.51 — 소셜 계정 연결(처음 소셜 로그인 안내·약관·가입 완료·쓰던 계정 연결) + 로그인 연결 관리
import SocialFirstLoginScreen from '../screens/SocialFirstLoginScreen';
import SocialSignupTermsScreen from '../screens/SocialSignupTermsScreen';
import SocialSignupDoneScreen from '../screens/SocialSignupDoneScreen';
import SocialLinkSigninScreen from '../screens/SocialLinkSigninScreen';
import MyLoginLinksScreen from '../screens/MyLoginLinksScreen';
import MyPasswordScreen from '../screens/MyPasswordScreen';
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

/**
 * ═══════════════════════════════════════════
 * 최상위 Stack — 로그인/모달 분기
 * ═══════════════════════════════════════════
 */
export default function AppNavigator() {
  const { isLoggedIn, isLoading, restoreAuth } = useAuthStore();

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

  if (isLoading || !minSplashDone) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={flushPendingNavigation}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
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
              options={{ presentation: 'transparentModal', animation: 'fade' }}
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
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="PhotoCompare" component={PhotoCompareScreen} />
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