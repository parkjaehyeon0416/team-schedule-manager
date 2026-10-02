/**
 * 하단 탭 내비게이션 — v18.29 (WorkMate 리디자인, 드로어 대체)
 * 홈 / 일정 / 등록(+) / 알림 / 내정보
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/designTokens';

import HomeDashboardScreen from '../screens/HomeDashboardScreen';
import HomeScreen from '../screens/HomeScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

// 가운데 '등록' 탭은 실제 화면이 아니라 탭을 누르면 바로 일정 등록 모달을 여는 버튼 역할만 함
function QuickCreatePlaceholder() {
  return <View />;
}

export default function BottomTabNavigator() {
  // 하단바가 숨겨지면 0, 기기 설정 등으로 보이는 경우엔 그 높이만큼 탭바를 올려 겹침 방지
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: [styles.tabBar, { height: 68 + insets.bottom, paddingBottom: 8 + insets.bottom }],
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="HomeDashboard"
        component={HomeDashboardScreen}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color, size }) => <Icon name="home" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={HomeScreen}
        options={{
          tabBarLabel: '일정',
          tabBarIcon: ({ color, size }) => <Icon name="calendar-month" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="QuickCreateTab"
        component={QuickCreatePlaceholder}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ size }) => (
            <LinearGradient
              colors={[colors.primaryLight, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.fab}
            >
              <Icon name="plus" color="#FFFFFF" size={size + 2} />
            </LinearGradient>
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.getParent()?.navigate('QuickCreate');
          },
        })}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: '알림',
          tabBarIcon: ({ color, size }) => <Icon name="bell-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: '내정보',
          tabBarIcon: ({ color, size }) => <Icon name="account-circle-outline" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 68,
    paddingBottom: 8,
    paddingTop: 6,
    backgroundColor: colors.surface,
    borderTopColor: colors.borderCard,
  },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    borderWidth: 4,
    borderColor: colors.surface,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
});
