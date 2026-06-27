import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import WageSettingsScreen from '../screens/WageSettingsScreen';
import PhotoCompareScreen from '../screens/PhotoCompareScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

/**
 * ═══════════════════════════════════════════
 * Drawer (햄버거 메뉴)
 * ═══════════════════════════════════════════
 * v11.7 변경:
 *  - 모든 화면이 AppHeader(공통 헤더)를 자체적으로 렌더링하므로
 *    Drawer 기본 헤더는 전부 끔 (headerShown: false)
 */
function DrawerRoot() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: '#1F3864',
        drawerStyle: {
          backgroundColor: '#FAFAFA',
          width: 280,
        },
      }}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{ drawerLabel: '🏠 홈 (달력)' }}
      />
      <Drawer.Screen
        name="MySummary"
        component={MySummaryScreen}
        options={{ drawerLabel: '💰 내 수입' }}
      />
      <Drawer.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{ drawerLabel: '⏰ 근태' }}
      />
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ drawerLabel: '👤 프로필' }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ drawerLabel: '⚙️ 설정' }}
      />
    </Drawer.Navigator>
  );
}

/**
 * ═══════════════════════════════════════════
 * 최상위 Stack — 로그인/모달 분기
 * ═══════════════════════════════════════════
 */
export default function AppNavigator() {
  const { isLoggedIn } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="DrawerRoot" component={DrawerRoot} />
            {/* ★ v11.7: 아래 화면들은 각자 AppHeader(leftType="back")를 자체 렌더링 */}
            <Stack.Screen name="ScheduleDetail" component={ScheduleDetailScreen} />
            <Stack.Screen
              name="ScheduleCreate"
              component={ScheduleCreateScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="WageSettings" component={WageSettingsScreen} />
            <Stack.Screen name="PhotoCompare" component={PhotoCompareScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}