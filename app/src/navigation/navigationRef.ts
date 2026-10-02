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

export function flushPendingNavigation() {
  if (pending && navigationRef.isReady()) {
    const { name, params } = pending;
    pending = null;
    navigationRef.navigate(name, params);
  }
}
