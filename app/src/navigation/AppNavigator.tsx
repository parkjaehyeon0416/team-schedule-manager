import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { IconButton } from 'react-native-paper';
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
 * v11.6 변경:
 *  - Home 화면만 headerShown: false
 *    (자체 헤더로 대체 — 년/월 탭 + 오늘 버튼)
 */
function DrawerRoot() {
  return (
    <Drawer.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: '#1F3864' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
        drawerActiveTintColor: '#1F3864',
        drawerStyle: {
          backgroundColor: '#FAFAFA',
          width: 280,
        },
        headerLeft: () => (
          <>
            <IconButton
              icon="menu"
              iconColor="#FFFFFF"
              size={26}
              onPress={() => navigation.openDrawer()}
            />
            <IconButton
              icon="home"
              iconColor="#FFFFFF"
              size={26}
              onPress={() => navigation.navigate('Home')}
            />
          </>
        ),
      })}
    >
      {/* ★ v11.6: Home은 자체 헤더 사용 — Drawer 헤더 끔 */}
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
          drawerLabel: '🏠 홈 (달력)',
        }}
      />
      <Drawer.Screen
        name="MySummary"
        component={MySummaryScreen}
        options={{
          title: '내 수입 현황',
          drawerLabel: '💰 내 수입',
        }}
      />
      <Drawer.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          title: '근태 관리',
          drawerLabel: '⏰ 근태',
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
            <Stack.Screen
              name="WageSettings"
              component={WageSettingsScreen}
              options={{
                headerShown: true,
                title: '내 단가 설정',
                headerStyle: { backgroundColor: '#1F3864' },
                headerTintColor: '#FFFFFF',
                headerBackTitle: '뒤로',
              }}
            />
            <Stack.Screen
              name="PhotoCompare"
              component={PhotoCompareScreen}
              options={{ headerShown: false }}
            />
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