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

// ★ v18.43 — 웹 페이지의 "앱에서 열기" 링크로 앱이 열렸을 때
//   workmate://join/코드 → 팀 참여(코드 자동 입력), workmate://notice/ID · workmate://event/ID → 공지·이벤트 상세
//   로그인 전이면 들고 있다가 로그인 후 이동
let pendingLink: { name: string; params: object } | null = null;

export function parseAppLink(url: string | null): { name: string; params: object } | null {
  const join = url?.match(/^workmate:\/\/join\/([A-Za-z0-9]{4,12})/);
  if (join) return { name: 'TeamJoin', params: { code: join[1].toUpperCase() } };
  const notice = url?.match(/^workmate:\/\/(notice|event)\/(\d+)/);
  if (notice) return { name: notice[1] === 'event' ? 'EventDetail' : 'NoticeDetail', params: { id: Number(notice[2]) } };
  return null;
}

export function handleAppLink(url: string | null, isLoggedIn: boolean) {
  const target = parseAppLink(url);
  if (!target) return;
  if (isLoggedIn) navigateFromOutside(target.name, target.params);
  else pendingLink = target;
}

export function flushPendingLink() {
  if (!pendingLink) return;
  const { name, params } = pendingLink;
  pendingLink = null;
  navigateFromOutside(name, params);
}

export function flushPendingNavigation() {
  if (pending && navigationRef.isReady()) {
    const { name, params } = pending;
    pending = null;
    navigationRef.navigate(name, params);
  }
}
