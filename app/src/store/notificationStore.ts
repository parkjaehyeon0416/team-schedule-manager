import { create } from 'zustand';
import { getNotifications } from '../api/notificationsApi';

// 안 읽은 알림 수 — 하단 알림 탭 배지와 알림 화면이 공유
interface NotificationState {
  unreadCount: number;
  setUnreadCount: (count: number | ((prev: number) => number)) => void;
  refreshUnread: () => void;
}

export const useNotificationStore = create<NotificationState>(set => ({
  unreadCount: 0,
  setUnreadCount: count =>
    set(state => ({ unreadCount: typeof count === 'function' ? count(state.unreadCount) : count })),
  refreshUnread: () => {
    getNotifications()
      .then(feed => set({ unreadCount: feed.unread_count }))
      .catch(() => {});
  },
}));
