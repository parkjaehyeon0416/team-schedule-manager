// ═══════════════════════════════════════════════════════════════
// 📄 src/utils/appUpdate.ts — ★ v18.69 앱 버전 확인 · 업데이트 열기
//   - 앱 시작(로그인 복원과 동시에)과 앱이 다시 앞으로 올 때(30분에 한 번까지) GET /api/app/version 확인
//     · 네트워크·서버 오류면 아무것도 안 함(오프라인 사용자를 막지 않음)
//     · required → 강제 업데이트 화면, optional → 안내 시트
//       (디자인 APP_UPDATE_OPTIONAL: "나중에"는 이번 실행 동안만 숨김 → 앱을 새로 켜면 다시 뜸. 저장소에 기억하지 않음)
//       ★ v18.69 — 앱을 끄지 않고 뒤로 보냈다가 30분 넘게 지나 다시 열어도 "다음에 앱을 열 때"로 보고 다시 띄움
//         (토스트 "다음에 앱을 열 때 다시 알려 드릴게요"와 맞춤 — 안 그러면 완전히 껐다 켜야만 다시 떴음)
//   - [업데이트] 버튼: 아이폰 → 앱스토어 주소(없으면 홈페이지), 안드로이드 플레이 설치 → 플레이 스토어 앱(market://),
//     안드로이드 직접 설치(홈페이지 APK) → APK 내려받기 주소(브라우저)
//     화면 모양도 같은 기준으로 고름(getUpdateChannel): 'store' = APP_UPDATE_REQUIRED, 'apk' = APP_UPDATE_REQUIRED_APK
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import axiosInstance, { SERVER_BASE_URL } from '../api/axiosInstance';
import { useAppUpdateStore, AppUpdateInfo, AppUpdateStatus } from '../store/appUpdateStore';
import {
  APP_PLATFORM,
  APP_VERSION_ENDPOINT,
  PLAY_STORE_INSTALLER,
  compareVersions,
  getAppPackageId,
  getAppVersion,
  getInstallerPackageName,
  nonEmpty,
  parseUpdateDetails,
  updatePayloadOf,
} from './appVersionInfo';

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 앞으로 돌아올 때 확인은 30분에 한 번까지
// ★ v18.69 — 이만큼 넘게 뒤에 있다가 돌아오면 "앱을 다시 연 것"으로 봄 → [나중에]로 숨긴 선택 업데이트 시트를 다시 띄움
const REOPEN_AFTER_MS = 30 * 60 * 1000;
// ★ v18.69 — 서버 주소를 글자로 다시 쓰지 않고 SERVER_BASE_URL에서 만듦
//   (release-android.sh가 "번들에 실서버 주소가 있는지"로 QA 주소 빌드를 걸러 내는데, 여기 글자가 따로 있으면 그 검사가 무력해짐)
const HOMEPAGE_URL = SERVER_BASE_URL;
const DEFAULT_APK_URL = `${SERVER_BASE_URL}/download/latest`;

let lastCheckAt = 0;
let inFlight: Promise<void> | null = null;
let requiredDetailsFetched = false;
// ★ v18.69 — 선택 업데이트 시트에서 [나중에]·[업데이트]를 눌렀으면 이번 실행 동안은 다시 안 띄움
//   (메모리에만 둠 → 앱을 새로 켜면 다시 확인해서 뜸. 디자인 문구 "다음에 앱을 열 때 다시 알려 드릴게요")
//   30분 넘게 뒤에 있다가 돌아와도 풀림(useAppUpdateCheck)
let optionalHandledThisRun = false;

// ─────────────────────────────────────────────────────────
// 업데이트 경로 — 'store'(구글 플레이·앱스토어) | 'apk'(홈페이지에서 받은 APK를 직접 설치한 안드로이드)
//   설치한 앱(installer)이 플레이 스토어가 아니면 APK로 봄(예전 openAppUpdate와 같은 기준). 한 번 알아내면 이번 실행 동안 그대로
// ─────────────────────────────────────────────────────────
export type UpdateChannel = 'store' | 'apk';

let channelCache: UpdateChannel | null = Platform.OS === 'ios' ? 'store' : null;
let channelPromise: Promise<UpdateChannel> | null = null;

export function getUpdateChannel(): Promise<UpdateChannel> {
  if (channelCache) return Promise.resolve(channelCache);
  if (!channelPromise) {
    channelPromise = getInstallerPackageName().then(name => {
      channelCache = name === PLAY_STORE_INSTALLER ? 'store' : 'apk';
      return channelCache;
    });
  }
  return channelPromise;
}

/** 화면용 — 아직 모르면(안드로이드 첫 순간) 'store'로 그렸다가 알아내면 바꿈. 앱 시작 때 미리 알아 두므로 보통 바로 맞음 */
export function useUpdateChannel(): UpdateChannel {
  const [channel, setChannel] = useState<UpdateChannel | null>(channelCache);
  useEffect(() => {
    if (channel) return;
    let alive = true;
    getUpdateChannel().then(c => {
      if (alive) setChannel(c);
    });
    return () => {
      alive = false;
    };
  }, [channel]);
  return channel ?? 'store';
}

// ─────────────────────────────────────────────────────────
// 응답 해석 — 서버(AppVersionController)가 주는 data.update = 'required' | 'optional' | 'none'을 그대로 따르고,
//   혹시 없으면 min_version / latest_version과 내 버전을 직접 비교
// ─────────────────────────────────────────────────────────
function statusOf(body: any, current: string): AppUpdateStatus {
  const s = nonEmpty(updatePayloadOf(body).update);
  if (s === 'required' || s === 'optional' || s === 'none') return s;
  const { minVersion, latestVersion } = parseUpdateDetails(body);
  if (minVersion && compareVersions(current, minVersion) < 0) return 'required';
  if (latestVersion && compareVersions(current, latestVersion) < 0) return 'optional';
  return 'none';
}

/** 버전 확인. force = 30분 제한 무시(앱 시작 때) */
export function checkAppVersion(opts: { force?: boolean } = {}): Promise<void> {
  const current = getAppVersion();
  if (!current) return Promise.resolve(); // 버전을 모르는 빌드(네이티브 모듈 없음) → 확인 안 함
  if (inFlight) return inFlight;
  const now = Date.now();
  if (!opts.force && now - lastCheckAt < CHECK_INTERVAL_MS) return Promise.resolve();
  lastCheckAt = now;

  inFlight = (async () => {
    try {
      const res = await axiosInstance.get(APP_VERSION_ENDPOINT, {
        params: { platform: APP_PLATFORM, version: current },
        timeout: 8000,
      });
      applyResult(statusOf(res.data, current), res.data);
    } catch (e: any) {
      // 네트워크 끊김·서버 오류 → 아무것도 안 함(업데이트 안내 때문에 앱을 못 쓰게 되면 안 됨)
      // ★ v18.69 — 서버에 아예 못 닿았으면(응답 없음 = 오프라인·시간 초과) 30분 제한을 풀어 둠
      //   → 연결이 돌아온 뒤 앱을 다시 앞으로 가져오면 바로 다시 확인(예전엔 앱 시작 때 오프라인이면 30분 동안 확인 안 했음)
      //   서버가 오류로 답한 경우(5xx 등)는 그대로 30분에 한 번까지
      if (!e?.response) lastCheckAt = 0;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function applyResult(status: AppUpdateStatus, body: any) {
  const store = useAppUpdateStore.getState();
  const details = parseUpdateDetails(body);
  if (status === 'required') {
    store.setRequired(details);
    return;
  }
  if (status !== 'optional') {
    store.clearOptional();
    return;
  }
  if (!details.latestVersion || optionalHandledThisRun) return;
  store.setOptional(details);
}

/** 426으로 강제 업데이트가 됐는데 오류 본문에 최신 버전·스토어 주소가 없으면 버전 확인으로 한 번 채움 */
export function fillRequiredDetails() {
  const { status, info } = useAppUpdateStore.getState();
  if (status !== 'required' || requiredDetailsFetched) return;
  if (info?.latestVersion && (info.storeUrl || info.apkUrl)) return;
  requiredDetailsFetched = true;
  checkAppVersion({ force: true });
}

// ─────────────────────────────────────────────────────────
// [업데이트] — 설치 경로에 맞는 곳을 엶
// ─────────────────────────────────────────────────────────
async function tryOpen(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export async function openAppUpdate(info: AppUpdateInfo | null) {
  let target: string;
  if (Platform.OS === 'ios') {
    target = info?.storeUrl || HOMEPAGE_URL; // 앱스토어 등록 전엔 서버 값이 비어 있음 → 홈페이지
  } else if ((await getUpdateChannel()) === 'store') {
    const pkg = getAppPackageId();
    // 플레이 스토어 앱으로 바로(market://), 안 열리면 웹 주소로
    if (await tryOpen(`market://details?id=${pkg}`)) return;
    target = info?.storeUrl || `https://play.google.com/store/apps/details?id=${pkg}`;
  } else {
    target = info?.apkUrl || DEFAULT_APK_URL; // 홈페이지에서 받은 APK → 새 APK 내려받기(브라우저)
  }
  if (!(await tryOpen(target))) {
    Alert.alert('업데이트 페이지를 열지 못했어요', `잠시 후 다시 시도하거나 아래 주소로 들어가 주세요.\n${target}`);
  }
}

/** 선택 업데이트 시트 [업데이트] — 시트를 닫고 스토어·APK 주소를 엶. 이번 실행 동안은 다시 안 띄움 */
export function startOptionalUpdate() {
  const { info, clearOptional } = useAppUpdateStore.getState();
  optionalHandledThisRun = true;
  clearOptional();
  openAppUpdate(info);
}

/** 선택 업데이트 시트 [나중에]·바깥 누르기·뒤로 가기 — 이번 실행 동안만 숨김(앱을 새로 켜면 다시 뜸) */
export function dismissOptionalUpdate() {
  optionalHandledThisRun = true;
  useAppUpdateStore.getState().clearOptional();
}

/** 앱 시작 때 확인 + 앱이 다시 앞으로 올 때 확인(30분에 한 번까지). App 최상단에서 한 번만 사용 */
export function useAppUpdateCheck() {
  useEffect(() => {
    getUpdateChannel(); // 업데이트 화면·시트가 뜨기 전에 설치 경로(스토어/APK)를 미리 알아 둠 → 화면 모양이 바뀌며 깜빡이지 않게
    checkAppVersion({ force: true });
    let prev = AppState.currentState;
    let leftAt = 0; // 앱이 앞에서 내려간 시각(아이폰 active → inactive → background도 처음 내려간 때로 셈)
    const sub = AppState.addEventListener('change', next => {
      if (prev === 'active' && next !== 'active') leftAt = Date.now();
      if (next === 'active' && prev !== 'active') {
        // ★ v18.69 — 30분 넘게 뒤에 있다 돌아오면 "다음에 앱을 열 때"로 봄 → [나중에]로 숨긴 시트를 다시 띄울 수 있게
        //   (그만큼 지났으면 아래 확인의 30분 제한도 이미 지나 있어 바로 확인함)
        if (leftAt && Date.now() - leftAt >= REOPEN_AFTER_MS) optionalHandledThisRun = false;
        checkAppVersion();
      }
      prev = next;
    });
    return () => sub.remove();
  }, []);
}
