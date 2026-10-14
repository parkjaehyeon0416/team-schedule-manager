// ★ v18.69 — 앱 업데이트 안내 상태(강제·선택).
//   - required: 서버 최소 버전보다 낮음(버전 확인 결과 또는 API가 426 ERR_APP_001) → 앱 화면 대신 업데이트 화면만 그림
//     한 번 required가 되면 이번 실행 동안은 풀지 않음(업데이트하면 앱이 새로 켜짐)
//   - optional: 최신 버전이 있음 → 닫을 수 있는 안내 시트("나중에"·[업데이트]를 누르면 이번 실행 동안은 다시 안 띄움,
//     앱을 새로 켜거나 30분 넘게 뒤에 있다 돌아오면 다시 뜸 — utils/appUpdate가 기억)
//   axiosInstance(426)와 utils/appUpdate(버전 확인)가 값을 넣고, App.tsx의 AppBody가 그림.
import { create } from 'zustand';
import { AppUpdateDetails, getAppVersion } from '../utils/appVersionInfo';

export type AppUpdateStatus = 'none' | 'optional' | 'required';

export interface AppUpdateInfo extends AppUpdateDetails {
  currentVersion: string | null;
}

interface AppUpdateState {
  status: AppUpdateStatus;
  info: AppUpdateInfo | null;
  // 스플래시가 끝났는지 — 선택 업데이트 시트는 스플래시 뒤에 띄움(강제 업데이트 화면은 스플래시 위에도 바로 뜸)
  promptReady: boolean;
  setRequired: (details: Partial<AppUpdateDetails>) => void;
  setOptional: (details: Partial<AppUpdateDetails>) => void;
  clearOptional: () => void;
  setPromptReady: () => void;
}

// 새로 받은 값이 비어 있으면 이전 값 유지(426 오류 본문엔 스토어 주소 등이 없을 수 있어서)
function merge(prev: AppUpdateInfo | null, next: Partial<AppUpdateDetails>): AppUpdateInfo {
  const keep = (a: string | null | undefined, b: string | null | undefined) => b || a || null;
  return {
    currentVersion: getAppVersion(),
    latestVersion: keep(prev?.latestVersion, next.latestVersion),
    minVersion: keep(prev?.minVersion, next.minVersion),
    message: keep(prev?.message, next.message),
    notes: next.notes && next.notes.length > 0 ? next.notes : prev?.notes ?? [], // ★ v18.69 안내 줄 목록
    storeUrl: keep(prev?.storeUrl, next.storeUrl),
    apkUrl: keep(prev?.apkUrl, next.apkUrl),
  };
}

export const useAppUpdateStore = create<AppUpdateState>(set => ({
  status: 'none',
  info: null,
  promptReady: false,
  setRequired: details => set(s => ({ status: 'required', info: merge(s.info, details) })),
  // 강제 업데이트 중이면 선택 안내로 바꾸지 않음
  setOptional: details => set(s => (s.status === 'required' ? s : { status: 'optional', info: merge(null, details) })),
  clearOptional: () => set(s => (s.status === 'optional' ? { status: 'none' } : s)),
  setPromptReady: () => set({ promptReady: true }),
}));
