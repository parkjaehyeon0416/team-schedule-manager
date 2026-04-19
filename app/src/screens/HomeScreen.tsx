import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';

export default function HomeScreen() {
  const { user } = useAuthStore();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>안녕하세요, {user?.name}님 👋</Text>
      <Text style={styles.sub}>v7에서 스케줄·현장 정보가 표시됩니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F3864',
    marginBottom: 12,
  },
  sub: { fontSize: 15, color: '#666' },
});
