// ═══════════════════════════════════════════════════════════════
// 📄 src/api/notificationSettingsApi.ts
//   내 알림 설정 API
//   GET/PUT /api/notification-settings
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse, NotificationSetting } from '../types/api';

export async function getNotificationSettings(): Promise<NotificationSetting> {
  const res = await axios.get<ApiResponse<NotificationSetting>>(
    '/notification-settings',
  );
  return res.data.data;
}

export type NotificationSettingPayload = Partial<
  Pick<
    NotificationSetting,
    'schedule_reminder' | 'team_activity' | 'quote_update' | 'report_view'
  >
>;

export async function updateNotificationSettings(
  payload: NotificationSettingPayload,
): Promise<NotificationSetting> {
  const res = await axios.put<ApiResponse<NotificationSetting>>(
    '/notification-settings',
    payload,
  );
  return res.data.data;
}
