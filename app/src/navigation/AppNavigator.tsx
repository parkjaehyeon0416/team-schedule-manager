import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/authStore';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import ScheduleDetailScreen from '../screens/ScheduleDetailScreen'; // ★ 추가

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 로그인 후 보이는 바텀 탭 메뉴
function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="홈" component={HomeScreen} />
      <Tab.Screen name="근태" component={AttendanceScreen} />
    </Tab.Navigator>
  );
}

// 전체 Navigation 구조
// isLoggedIn 상태에 따라 로그인 화면 ↔ 메인 화면 자동 전환
export default function AppNavigator() {
  const { isLoggedIn } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            {/* 메인 탭 (홈·근태) */}
            <Stack.Screen name="Main" component={MainTabs} />

            {/* ★ 일정 상세 화면 — 탭 위에 덮여서 열림 */}
            <Stack.Screen
              name="ScheduleDetail"
              component={ScheduleDetailScreen}
              options={{
                headerShown: true, // 상세 화면엔 헤더 표시
                title: '일정 상세',
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
