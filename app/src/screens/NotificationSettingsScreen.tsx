// ═══════════════════════════════════════════════════════════════
// 📄 src/screens/NotificationSettingsScreen.tsx
//   알림 설정 화면
//   - GET /api/notification-settings 조회
//   - PUT /api/notification-settings 토글 변경 시 즉시 저장
//
//   ★ 참고: 실제 푸시 발송(FCM 등) 인프라는 아직 없음.
//   이 화면은 "어떤 알림을 받을지"에 대한 사용자 설정값만 서버에 저장하며,
//   추후 발송 로직이 붙었을 때 이 값을 기준으로 발송 여부를 판단하게 된다.
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Text, Switch, Divider, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '../api/notificationSettingsApi';
import type { NotificationSetting } from '../types/api';
import AppHeader from '../components/AppHeader';

const ITEMS: {
  key: keyof Pick<
    NotificationSetting,
    'schedule_reminder' | 'team_activity' | 'quote_update' | 'report_view'
  >;
  icon: string;
  title: string;
  hint: string;
}[] = [
  {
    key: 'schedule_reminder',
    icon: 'calendar-clock-outline',
    title: '일정 알림',
    hint: '등록된 일정이 다가오면 알려드려요',
  },
  {
    key: 'team_activity',
    icon: 'account-group-outline',
    title: '팀 활동 알림',
    hint: '팀원 가입, 일정 변경 등을 알려드려요',
  },
  {
    key: 'quote_update',
    icon: 'file-document-outline',
    title: '견적 알림',
    hint: '견적 승인/반려 등 상태 변경을 알려드려요',
  },
  {
    key: 'report_view',
    icon: 'eye-outline',
    title: '보고서 열람 알림',
    hint: '공유한 보고서나 명함을 고객이 열람하면 알려드려요',
  },
];

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState<NotificationSetting | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const data = await getNotificationSettings();
      setSettings(data);
    } catch (e: any) {
      console.error('알림 설정 조회 실패:', e);
      setLoadError(true);
      Alert.alert(
        '조회 실패',
        e?.response?.data?.message || '알림 설정을 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (key: (typeof ITEMS)[number]['key'], value: boolean) => {
    if (!settings) return;

    const prev = settings;
    setSettings({ ...settings, [key]: value }); // 낙관적 업데이트
    setSavingKey(key);
    try {
      const updated = await updateNotificationSettings({ [key]: value });
      setSettings(updated);
    } catch (e: any) {
      console.error('알림 설정 저장 실패:', e);
      setSettings(prev); // 실패 시 롤백
      Alert.alert(
        '저장 실패',
        e?.response?.data?.message || '알림 설정 저장에 실패했습니다.',
      );
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="알림 설정" />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2E75B6" />
        </View>
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="알림 설정" />
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>
            {loadError
              ? '알림 설정을 불러오지 못했습니다.'
              : '알림 설정이 없습니다.'}
          </Text>
          <Button mode="contained" onPress={load} style={styles.retryBtn}>
            다시 시도
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="알림 설정" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.hint}>
          받고 싶은 알림만 선택하세요. 여기서 끈 알림은 발송되지 않습니다.
        </Text>

        {ITEMS.map((item, idx) => (
          <React.Fragment key={item.key}>
            <View style={styles.row}>
              <Icon name={item.icon} size={22} color="#2E75B6" style={styles.icon} />
              <View style={styles.textBox}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.hint}</Text>
              </View>
              <Switch
                value={settings[item.key]}
                onValueChange={v => handleToggle(item.key, v)}
                disabled={savingKey === item.key}
              />
            </View>
            {idx < ITEMS.length - 1 && <Divider style={styles.divider} />}
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  errorText: { fontSize: 14, color: '#888', textAlign: 'center' },
  retryBtn: { marginTop: 4 },
  container: { padding: 16, paddingBottom: 40 },

  hint: {
    fontSize: 13,
    color: '#888',
    marginBottom: 20,
    lineHeight: 19,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  icon: { marginRight: 2 },
  textBox: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: '#222' },
  subtitle: { fontSize: 12, color: '#888', marginTop: 2 },

  divider: { marginVertical: 2 },
});
