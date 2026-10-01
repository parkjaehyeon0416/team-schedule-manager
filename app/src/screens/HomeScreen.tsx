/**
 * 일정 화면 (하단 탭 '일정') — v18.32 (DESIGN-CANVAS 기준, SCHEDULE_MONTH.dc.html 1:1)
 */

import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import CalendarScreen, { CalendarHandle, ScheduleScope } from './CalendarScreen';
import AppHeader from '../components/AppHeader';
import { colors, radius, spacing } from '../theme/designTokens';

export default function HomeScreen({ navigation }: any) {
  const [scope, setScope] = useState<ScheduleScope>('all');
  const calendarRef = useRef<CalendarHandle>(null);

  const handleGoHome = useCallback(() => {
    navigation.navigate('HomeDashboard');
  }, [navigation]);

  const handleQuickCreate = useCallback(() => {
    const parent = navigation.getParent();
    (parent || navigation).navigate('ScheduleCreate');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <AppHeader
        leftType="back"
        title="일정"
        onBackPress={handleGoHome}
        rightContent={
          <Pressable onPress={handleQuickCreate} hitSlop={8} style={styles.plusBtn}>
            <Icon name="plus" size={22} color={colors.textPrimary} />
          </Pressable>
        }
      />

      {/* ★ 전체/개인/팀 토글 — 팀에 있어도 개인용 일정을 따로 만들 수 있고,
          팀을 나간 뒤에도 '팀' 필터로 그때 일했던 기록을 볼 수 있음 */}
      <View style={styles.scopeRow}>
        {(
          [
            { key: 'all', label: '전체' },
            { key: 'personal', label: '개인' },
            { key: 'team', label: '팀' },
          ] as { key: ScheduleScope; label: string }[]
        ).map(opt => (
          <Pressable
            key={opt.key}
            onPress={() => setScope(opt.key)}
            style={[styles.scopeChip, scope === opt.key && styles.scopeChipActive]}
          >
            <Text
              style={[styles.scopeChipText, scope === opt.key && styles.scopeChipTextActive]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <CalendarScreen ref={calendarRef} navigation={navigation} scope={scope} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  plusBtn: { padding: 4 },

  scopeRow: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    padding: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scopeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
  },
  scopeChipActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  scopeChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  scopeChipTextActive: { color: colors.primary, fontWeight: '700' },
});
