/**
 * 프로필 화면 (햄버거 메뉴용)
 *
 * ★ 현재: 사용자 정보 표시 + 로그아웃 버튼 (뼈대)
 * ★ 다음 단계: 정보 수정, 비밀번호 변경 등
 */

import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Card, Text, Button, Avatar, Divider } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

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
    <View style={styles.container}>
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

      <Divider style={styles.divider} />

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  profileCard: {
    marginBottom: 16,
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
  divider: {
    marginVertical: 16,
  },
  logoutButton: {
    borderColor: '#D32F2F',
  },
});
