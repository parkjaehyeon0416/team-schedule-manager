// ═══════════════════════════════════════════════════════════════
// 📄 src/api/notificationsApi.ts — 알림 피드 (★ DESIGN-CANVAS(NOTIFICATIONS) 추가, 2026-10-02)
// ═══════════════════════════════════════════════════════════════
import axios from './axiosInstance';
import type { ApiResponse } from '../types/api';

export interface AppNotification {
  id: number;
  user_id: number;
  category: 'schedule' | 'team' | 'quote' | 'tax';
  title: string;
  body: string;
  link_type: 'schedule' | 'team' | 'quote' | 'tax_month' | 'inquiry' | 'team_notice' | null; // ★ v18.48 team_notice(link_id=팀)
  link_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationFeed {
  items: AppNotification[];
  unread_count: number;
}

export async function getNotifications(category?: AppNotification['category']): Promise<NotificationFeed> {
  const res = await axios.get<ApiResponse<NotificationFeed>>('/notifications', {
    params: category ? { category } : undefined,
  });
  return res.data.data;
}

export async function markNotificationRead(id: number): Promise<void> {
  await axios.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await axios.patch('/notifications/read-all');
}
