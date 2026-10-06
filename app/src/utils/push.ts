// ═══════════════════════════════════════════════════════════════
// 📄 src/utils/push.ts — ★ v18.38 휴대폰 푸시(Firebase Cloud Messaging)
//   로그인되면 알림 권한 요청 → 기기 토큰을 서버에 등록, 로그아웃하면 해제.
//   알림을 누르면 해당 일정/팀 화면으로 이동, 앱을 보고 있을 때 오면 알림 탭 배지만 갱신.
// ═══════════════════════════════════════════════════════════════
import { PermissionsAndroid, Platform } from 'react-native';
import {
  getMessaging,
  getToken,
  deleteToken,
  onTokenRefresh,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  requestPermission,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import type { Messaging, RemoteMessage } from '@react-native-firebase/messaging';
import axios from '../api/axiosInstance';
import { useNotificationStore } from '../store/notificationStore';
import { navigateFromOutside } from '../navigation/navigationRef';

let unsubscribers: Array<() => void> = [];

function openFromNotification(msg: RemoteMessage | null) {
  const linkType = msg?.data?.link_type;
  const linkId = Number(msg?.data?.link_id);
  if (!linkType || !linkId) {
    navigateFromOutside('MainTabs', { screen: 'Notifications' });
    return;
  }
  if (linkType === 'schedule') navigateFromOutside('ScheduleDetail', { id: linkId });
  else if (linkType === 'team') navigateFromOutside('TeamDetail', { teamId: linkId });
  else if (linkType === 'quote') navigateFromOutside('QuoteDetail', { quoteId: linkId });
  else if (linkType === 'inquiry') navigateFromOutside('InquiryDetail', { id: linkId }); // ★ v18.43 문의 답변
}

async function ensurePermission(messaging: Messaging): Promise<boolean> {
  // 안드로이드 13부터 알림 표시에 사용자 허용이 필요
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    return res === PermissionsAndroid.RESULTS.GRANTED;
  }
  // ★ v18.46 — 아이폰은 Firebase로 알림 허용을 물어봄
  if (Platform.OS === 'ios') {
    const status = await requestPermission(messaging);
    return status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;
  }
  return true;
}

async function sendToken(token: string) {
  await axios.post('/device-tokens', { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
}

/** 로그인 직후/앱 시작 시(로그인 상태) 호출 */
export async function registerPush(): Promise<void> {
  try {
    unregisterListeners();
    const messaging = getMessaging();

    // 알림 탭으로 앱을 연 경우 처리는 권한과 무관하게 연결
    unsubscribers.push(onNotificationOpenedApp(messaging, openFromNotification));
    getInitialNotification(messaging).then(msg => msg && openFromNotification(msg)).catch(() => {});
    // 앱을 보고 있을 때 온 알림은 시스템 알림이 안 뜨므로 배지만 갱신
    unsubscribers.push(onMessage(messaging, async () => useNotificationStore.getState().refreshUnread()));

    if (!(await ensurePermission(messaging))) return;

    await sendToken(await getToken(messaging));
    unsubscribers.push(onTokenRefresh(messaging, token => { sendToken(token).catch(() => {}); }));
  } catch (e) {
    console.warn('푸시 등록 실패:', e);
  }
}

/** 로그아웃 직전(아직 로그인 토큰이 있을 때) 호출 — 이 기기로 이전 계정 알림이 오지 않게 */
export async function unregisterPush(): Promise<void> {
  unregisterListeners();
  try {
    const messaging = getMessaging();
    const token = await getToken(messaging);
    await axios.delete('/device-tokens', { data: { token } });
    await deleteToken(messaging);
  } catch {
    // 오프라인 등 — 서버는 다음 발송 실패 시 무효 토큰을 정리함
  }
}

function unregisterListeners() {
  unsubscribers.forEach(u => u());
  unsubscribers = [];
}
