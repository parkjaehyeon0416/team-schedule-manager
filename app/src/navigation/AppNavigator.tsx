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

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

/**
 * ═══════════════════════════════════════════
 * Drawer (햄버거 메뉴)
 * ═══════════════════════════════════════════
 * v9.2 변경:
 *  - Bottom Tab Navigator 제거 (공간 확보)
 *  - 홈/내수입/근태를 각각 Drawer.Screen으로 등록
 *  - 헤더 좌측: 햄버거 + 홈 아이콘
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
        // ★ v9.2: 헤더 좌측에 햄버거 + 홈 아이콘 병렬 배치
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
      {/* 메인 3개 화면 — 바텀 탭 대신 각각 Drawer 항목으로 */}
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Team Schedule',
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
      {/* 부가 기능 */}
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
            {/* ★ v10.2 추가 — 내 단가 설정 화면 */}
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
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
