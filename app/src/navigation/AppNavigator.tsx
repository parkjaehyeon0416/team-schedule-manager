/**
 * 앱 네비게이션 구조 — v9 재구성
 *
 * 변경 사항:
 *  - Drawer(햄버거 메뉴) 추가
 *  - 바텀 탭에 "내 수입" 추가 (홈 / 내 수입 / 근태)
 *  - 햄버거 메뉴: 프로필, 설정
 *
 * 구조:
 *   NavigationContainer
 *     └─ Stack (최상위, 로그인 여부 분기)
 *         ├─ Login (미로그인)
 *         └─ DrawerRoot (로그인)
 *             ├─ MainTabs (바텀 탭)
 *             │   ├─ 홈        → HomeScreen
 *             │   ├─ 내 수입    → MySummaryScreen
 *             │   └─ 근태       → AttendanceScreen
 *             ├─ 프로필        → ProfileScreen
 *             └─ 설정          → SettingsScreen
 *         + ScheduleDetail (모달)
 *         + ScheduleCreate (모달)
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useAuthStore } from '../store/authStore';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import MySummaryScreen from '../screens/MySummaryScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ScheduleDetailScreen from '../screens/ScheduleDetailScreen';
import ScheduleCreateScreen from '../screens/ScheduleCreateScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// ═══════════════════════════════════════════
// 1. 바텀 탭 (3개) — 자주 쓰는 핵심 화면
// ═══════════════════════════════════════════
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Drawer의 헤더를 사용
        tabBarActiveTintColor: '#1F3864',
      }}
    >
      <Tab.Screen
        name="홈"
        component={HomeScreen}
        options={{ tabBarLabel: '홈' }}
      />
      <Tab.Screen
        name="내 수입"
        component={MySummaryScreen}
        options={{ tabBarLabel: '내 수입' }}
      />
      <Tab.Screen
        name="근태"
        component={AttendanceScreen}
        options={{ tabBarLabel: '근태' }}
      />
    </Tab.Navigator>
  );
}

// ═══════════════════════════════════════════
// 2. Drawer (햄버거 메뉴) — 전체 화면을 감쌈
// ═══════════════════════════════════════════
function DrawerRoot() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1F3864' },
        headerTintColor: '#FFFFFF',
        drawerActiveTintColor: '#1F3864',
      }}
    >
      <Drawer.Screen
        name="Main"
        component={MainTabs}
        options={{
          title: 'Team Schedule',
          drawerLabel: '🏠 메인',
        }}
      />
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: '프로필',
          drawerLabel: '👤 프로필',
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: '설정',
          drawerLabel: '⚙️ 설정',
        }}
      />
    </Drawer.Navigator>
  );
}

// ═══════════════════════════════════════════
// 3. 최상위 Stack — 로그인/미로그인 분기
// ═══════════════════════════════════════════
export default function AppNavigator() {
  const { isLoggedIn } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            {/* Drawer로 감싼 메인 + 탭 */}
            <Stack.Screen name="DrawerRoot" component={DrawerRoot} />

            {/* 모달 화면 — 탭/드로어 위에 올라옴 */}
            <Stack.Screen
              name="ScheduleDetail"
              component={ScheduleDetailScreen}
              options={{
                headerShown: true,
                title: '일정 상세',
                headerBackTitle: '뒤로',
              }}
            />
            <Stack.Screen
              name="ScheduleCreate"
              component={ScheduleCreateScreen}
              options={{
                headerShown: true,
                title: '일정 등록',
                presentation: 'modal',
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
