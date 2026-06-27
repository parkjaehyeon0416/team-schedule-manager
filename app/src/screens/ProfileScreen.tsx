/**
 * 프로필 화면 (햄버거 메뉴용)
 *
 * ★ 현재: 사용자 정보 + 메뉴 + 로그아웃
 * ★ v10.2: "내 단가 설정" 메뉴 추가
 */

import React from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Card, Text, Button, Avatar, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import AppHeader from '../components/AppHeader';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const navigation = useNavigation<any>();

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <View style={styles.screen}>
      <AppHeader leftType="menu" title="프로필" />
      <View style={styles.container}>
      {/* ── 1) 프로필 카드 ── */}
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text
            size={80}
            label={user.name.charAt(0)}
            style={styles.avatar}
          />
          <Text variant="headlineSmall" style={styles.name}>
            {user.name}
          </Text>
          <Text variant="bodyMedium" style={styles.email}>
            {user.email}
          </Text>
          {user.role?.name && (
            <Text variant="bodySmall" style={styles.role}>
              권한: {user.role.name}
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* ── 2) 업무 설정 섹션 ── */}
      <Text style={styles.sectionTitle}>업무 설정</Text>
      <Card style={styles.menuCard}>
        <TouchableOpacity
          onPress={() => navigation.navigate('WageSettings')}
          style={styles.menuItem}
        >
          <View style={styles.menuLeft}>
            <Icon name="currency-krw" size={24} color="#2E75B6" />
            <View style={styles.menuTextBox}>
              <Text style={styles.menuLabel}>내 단가 설정</Text>
              <Text style={styles.menuSub}>
                공정별 기본 단가를 등록하면 일정 작성 시 자동 입력됩니다
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={22} color="#BBB" />
        </TouchableOpacity>
      </Card>

      <Divider style={styles.divider} />

      {/* ── 3) 로그아웃 ── */}
      <Button
        mode="outlined"
        icon="logout"
        onPress={handleLogout}
        style={styles.logoutButton}
        textColor="#D32F2F"
      >
        로그아웃
      </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  profileCard: {
    marginBottom: 20,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    marginBottom: 16,
    backgroundColor: '#1F3864',
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    color: '#666',
    marginBottom: 8,
  },
  role: {
    color: '#999',
  },
  sectionTitle: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  menuTextBox: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
  },
  menuSub: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
  },
  divider: {
    marginVertical: 16,
  },
  logoutButton: {
    borderColor: '#D32F2F',
  },
});
