// ★ v18.38 — 화면 밖(푸시 알림 탭 처리 등)에서 화면 이동하기 위한 전역 내비게이션 참조
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

// 내비게이션이 준비되기 전(앱이 꺼진 상태에서 알림을 눌러 켜진 경우 등)에 들어온 이동 요청은 보관했다가 준비되면 실행
let pending: { name: string; params?: object } | null = null;

export function navigateFromOutside(name: string, params?: object) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  } else {
    pending = { name, params };
  }
}

// ★ v18.43 — 초대 링크(workmate://join/코드)로 앱이 열렸을 때. 로그인 전이면 코드를 들고 있다가 로그인 후 참여 화면으로
let pendingJoinCode: string | null = null;

export function parseJoinLink(url: string | null): string | null {
  const m = url?.match(/^workmate:\/\/join\/([A-Za-z0-9]{4,12})/);
  return m ? m[1].toUpperCase() : null;
}

export function handleJoinLink(url: string | null, isLoggedIn: boolean) {
  const code = parseJoinLink(url);
  if (!code) return;
  if (isLoggedIn) navigateFromOutside('TeamJoin', { code });
  else pendingJoinCode = code;
}

export function flushPendingJoin() {
  if (!pendingJoinCode) return;
  const code = pendingJoinCode;
  pendingJoinCode = null;
  navigateFromOutside('TeamJoin', { code });
}

export function flushPendingNavigation() {
  if (pending && navigationRef.isReady()) {
    const { name, params } = pending;
    pending = null;
    navigationRef.navigate(name, params);
  }
}
