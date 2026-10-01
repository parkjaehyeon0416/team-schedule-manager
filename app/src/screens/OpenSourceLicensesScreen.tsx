/**
 * 오픈소스 라이선스 화면 — APP_INFO "오픈소스 라이선스" 메뉴 (2026-10-02 신규)
 * package.json 기준 사용 중인 주요 오픈소스 라이브러리와 라이선스 종류를 나열하는
 * 정적 목록 화면(개별 라이선스 전문까지는 보여주지 않음).
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import AppHeader from '../components/AppHeader';
import { OSS_LICENSES } from '../constants/ossLicenses';
import { colors, radius, spacing } from '../theme/designTokens';

export default function OpenSourceLicensesScreen() {
  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="오픈소스 라이선스" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>이 앱은 아래의 오픈소스 라이브러리를 사용하고 있습니다.</Text>
        <View style={styles.card}>
          {OSS_LICENSES.map((lib, i) => (
            <View key={lib.name} style={[styles.row, i !== OSS_LICENSES.length - 1 && styles.rowDivider]}>
              <Text style={styles.name}>{lib.name}</Text>
              <Text style={styles.license}>{lib.license}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  hint: { fontSize: 13, color: colors.textSecondary },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  name: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  license: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
});
