/**
 * 알림 설정 화면 — DESIGN-CANVAS 기준, NOTIFICATION_SETTINGS.dc.html
 * ★ 백엔드에 세무자료 알림/마케팅 수신/야간 알림 제한/일정 알림 시간 필드가 없어서
 *   notification_settings 테이블에 전부 신규 추가함. "전체 알림"은 저장되는 값이 아니라
 *   디자인 원본처럼 일정/팀활동/견적/세무 4개를 한번에 켜고 끄는 클라이언트 동작.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, FlatList, Modal } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import { getNotificationSettings, updateNotificationSettings } from '../api/notificationSettingsApi';
import type { NotificationSetting } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';

const REMINDER_TIME_LABEL: Record<string, string> = {
  day_before_20: '작업 하루 전 오후 8시',
  day_before_09: '작업 당일 오전 9시',
  hour_before_1: '시작 1시간 전',
};
const REMINDER_TIME_OPTIONS = Object.keys(REMINDER_TIME_LABEL);

export default function NotificationSettingsScreen() {
  const navigation = useNavigation<any>();
  const [settings, setSettings] = useState<NotificationSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getNotificationSettings().then(setSettings).catch(() => setSettings(null)).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const patch = async (payload: Partial<NotificationSetting>) => {
    if (!settings) return;
    const prev = settings;
    setSettings({ ...settings, ...payload });
    try {
      const updated = await updateNotificationSettings(payload);
      setSettings(updated);
    } catch {
      setSettings(prev);
    }
  };

  if (loading || !settings) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="알림 설정" />
        <View style={styles.centerBox}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  const allOn = settings.schedule_reminder && settings.team_activity && settings.quote_update && settings.tax_reminder;

  const typeRows: { key: keyof NotificationSetting; title: string; sub: string }[] = [
    { key: 'schedule_reminder', title: '일정 알림', sub: '작업 하루 전 · 시작 1시간 전' },
    { key: 'team_activity', title: '팀 활동 알림', sub: '일정 추가 · 팀원 참여' },
    { key: 'quote_update', title: '견적 알림', sub: '고객 열람 · 상태 변경' },
    { key: 'tax_reminder', title: '세무 자료 알림', sub: '월별 자료 준비 완료' },
  ];
  const etcRows: { key: keyof NotificationSetting; title: string; sub: string }[] = [
    { key: 'marketing_opt_in', title: '마케팅 정보 수신', sub: '이벤트 · 혜택 소식' },
    { key: 'night_quiet_hours', title: '야간 알림 제한', sub: '오후 10시 ~ 오전 7시' },
  ];

  const renderToggle = (checked: boolean, onPress: () => void) => (
    <Pressable style={[styles.switchTrack, { backgroundColor: checked ? colors.primary : '#D5DFEB', justifyContent: checked ? 'flex-end' : 'flex-start' }]} onPress={onPress}>
      <View style={styles.switchThumb} />
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="알림 설정" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.groupTitle}>알림 종류</Text>
        <View style={styles.listCard}>
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.rowTitle}>전체 알림</Text>
              <Text style={styles.rowSub}>모든 알림을 한 번에 켜고 꺼요</Text>
            </View>
            {renderToggle(allOn, () => patch({ schedule_reminder: !allOn, team_activity: !allOn, quote_update: !allOn, tax_reminder: !allOn }))}
          </View>
          {typeRows.map(row => (
            <View key={row.key} style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowSub}>{row.sub}</Text>
              </View>
              {renderToggle(settings[row.key] as boolean, () => patch({ [row.key]: !settings[row.key] } as Partial<NotificationSetting>))}
            </View>
          ))}
        </View>

        <Text style={styles.groupTitle}>기타</Text>
        <View style={styles.listCard}>
          {etcRows.map(row => (
            <View key={row.key} style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowSub}>{row.sub}</Text>
              </View>
              {renderToggle(settings[row.key] as boolean, () => patch({ [row.key]: !settings[row.key] } as Partial<NotificationSetting>))}
            </View>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>일정 알림 시간</Text>
          <Pressable style={styles.inputWrap} onPress={() => setTimePickerVisible(true)}>
            <Text style={styles.inputText}>{REMINDER_TIME_LABEL[settings.schedule_reminder_time] ?? REMINDER_TIME_LABEL.day_before_20}</Text>
            <Icon name="clock-outline" size={18} color={colors.muted} />
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={timePickerVisible} animationType="fade" transparent onRequestClose={() => setTimePickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setTimePickerVisible(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>일정 알림 시간</Text>
          <FlatList
            data={REMINDER_TIME_OPTIONS}
            keyExtractor={k => k}
            renderItem={({ item }) => (
              <Pressable style={styles.modalRow} onPress={() => { patch({ schedule_reminder_time: item }); setTimePickerVisible(false); }}>
                <Text style={[styles.modalRowText, item === settings.schedule_reminder_time && { color: colors.primaryDark, fontWeight: '700' }]}>{REMINDER_TIME_LABEL[item]}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },

  groupTitle: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, paddingLeft: 4 },
  listCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.lg, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary },

  switchTrack: { width: 48, height: 30, borderRadius: 15, padding: 3, flexDirection: 'row', alignItems: 'center' },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  inputWrap: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputText: { fontSize: 14, color: colors.textPrimary },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,42,86,0.4)' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, maxHeight: '50%' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  modalRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderHairline },
  modalRowText: { fontSize: 15, color: colors.textPrimary },
});
