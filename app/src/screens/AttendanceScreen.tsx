import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AttendanceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>근태 현황</Text>
      <Text style={styles.sub}>v7에서 출퇴근 기능이 구현됩니다.</Text>
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
