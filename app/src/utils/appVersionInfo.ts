// ═══════════════════════════════════════════════════════════════
// 📄 src/utils/appVersionInfo.ts — ★ v18.69 앱 버전 정보 (강제·선택 업데이트용)
//   axiosInstance(요청 헤더·426 처리)와 utils/appUpdate(버전 확인)가 같이 씀.
//   ※ 이 파일은 앱의 다른 모듈(api·store)을 import 하지 않음 → 서로 물고 물리는 import(require cycle) 방지
//
//   버전 비교는 "마케팅 버전"(MAJOR.MINOR.PATCH)으로 함
//     = 안드로이드 versionName(build.gradle) = 아이폰 CFBundleShortVersionString(MARKETING_VERSION). 두 플랫폼 같은 숫자.
//   예전 표기 "1.0"은 1.0.0으로 취급. 안드로이드 versionCode는 구글 플레이용 빌드 번호일 뿐 비교에 안 씀.
// ═══════════════════════════════════════════════════════════════
import { Platform } from 'react-native';
import type DeviceInfoModule from 'react-native-device-info';

// 네이티브 모듈이 없는 환경(이 라이브러리를 넣기 전에 만든 개발용 빌드, jest 테스트)에선 import 순간 오류가 나므로
//   감싸서 불러옴 → 없으면 버전 헤더 없이 동작(서버는 버전 헤더가 없는 요청을 막지 않음)하고 버전 확인도 건너뜀
let DeviceInfo: typeof DeviceInfoModule | null = null;
try {
  DeviceInfo = require('react-native-device-info').default;
} catch {
  DeviceInfo = null;
}

export type AppPlatform = 'android' | 'ios';
export const APP_PLATFORM: AppPlatform = Platform.OS === 'ios' ? 'ios' : 'android';

// 버전 확인 API 경로(axiosInstance baseURL 기준). 426 처리에서 이 요청만은 평소처럼 실패로 돌려줌
export const APP_VERSION_ENDPOINT = '/app/version';

// 구글 플레이 스토어 앱의 패키지 이름 — 이 값이면 플레이에서 설치한 앱, 아니면 홈페이지 APK 등으로 직접 설치한 앱
export const PLAY_STORE_INSTALLER = 'com.android.vending';

/** "1.0" → [1,0,0], "1.1.0-beta" → [1,1,0], 숫자로 시작하지 않으면 null */
export function parseVersion(v: string | null | undefined): [number, number, number] | null {
  const m = String(v ?? '').trim().match(/^\d+(\.\d+){0,2}/);
  if (!m) return null;
  const [a = 0, b = 0, c = 0] = m[0].split('.').map(n => parseInt(n, 10));
  return [a, b, c];
}

/** 항상 MAJOR.MINOR.PATCH 세 자리로 ("1.0" → "1.0.0"). 읽을 수 없으면 null */
export function normalizeVersion(v: string | null | undefined): string | null {
  const p = parseVersion(v);
  return p ? p.join('.') : null;
}

/** a < b 이면 음수, 같으면 0, a > b 이면 양수. 읽을 수 없는 값은 0.0.0으로 봄 */
export function compareVersions(a: string | null | undefined, b: string | null | undefined): number {
  const pa = parseVersion(a) ?? [0, 0, 0];
  const pb = parseVersion(b) ?? [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

let cachedVersion: string | null | undefined;
/** 설치된 앱의 마케팅 버전(MAJOR.MINOR.PATCH). 네이티브 모듈이 없으면 null */
export function getAppVersion(): string | null {
  if (cachedVersion !== undefined) return cachedVersion;
  try {
    const raw = DeviceInfo?.getVersion();
    cachedVersion = raw && raw !== 'unknown' ? normalizeVersion(raw) : null;
  } catch {
    cachedVersion = null;
  }
  return cachedVersion;
}

/** 빌드 번호(안드로이드 versionCode / 아이폰 CFBundleVersion). 모르면 null */
export function getAppBuild(): string | null {
  try {
    const b = DeviceInfo?.getBuildNumber();
    return b && b !== 'unknown' ? String(b) : null;
  } catch {
    return null;
  }
}

/** 앱 ID(안드로이드 applicationId / 아이폰 번들 ID) — com.workmatekr.app */
export function getAppPackageId(): string {
  try {
    const id = DeviceInfo?.getBundleId();
    if (id && id !== 'unknown') return id;
  } catch {}
  return 'com.workmatekr.app';
}

/** 안드로이드: 이 앱을 설치한 앱의 패키지 이름(플레이 = com.android.vending). 아이폰·모름 = null */
export async function getInstallerPackageName(): Promise<string | null> {
  if (Platform.OS !== 'android' || !DeviceInfo) return null;
  try {
    const name = await DeviceInfo.getInstallerPackageName();
    return name && name !== 'unknown' ? name : null;
  } catch {
    return null;
  }
}

/** 모든 API 요청에 붙이는 헤더. 버전을 모르면 빈 객체(→ 서버는 옛 앱처럼 취급, 막지 않음) */
export function getAppVersionHeaders(): Record<string, string> {
  const version = getAppVersion();
  if (!version) return {};
  const headers: Record<string, string> = { 'X-App-Version': version, 'X-App-Platform': APP_PLATFORM };
  const build = getAppBuild();
  if (build) headers['X-App-Build'] = build;
  return headers;
}

// ─────────────────────────────────────────────────────────
// 서버 응답 → 업데이트 안내 정보
//   GET /api/app/version 응답과 426(ERR_APP_001) 오류 응답 둘 다
//   { success, message, error_code, data: { min_version, latest_version, message, notes, store_url, apk_url, ... } } 모양을 기대.
//   data가 없으면 본문 자체에서 같은 이름의 필드를 찾음.
//   ※ 안내 문구(message·notes)는 data 안의 것만 씀 — 바깥 message는 "조회 성공"·오류 문구라 화면에 보일 문구가 아님
//   ★ v18.69 — notes = 서버 안내 문구 줄 목록(APP_UPDATE_MESSAGE를 "|"·줄바꿈으로 나눈 것, 최대 5줄).
//     화면은 체크 표시 줄로 그림(강제 화면 2줄·선택 시트 3줄까지). notes가 없는 응답이면 message를 같은 규칙으로 나눔
// ─────────────────────────────────────────────────────────
export interface AppUpdateDetails {
  latestVersion: string | null;
  minVersion: string | null;
  message: string | null;
  notes: string[];
  storeUrl: string | null;
  apkUrl: string | null;
}

export const nonEmpty = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null;

// ★ v18.69 — 서버 AppVersion::notes()와 같은 규칙: "|"·줄바꿈·글자 그대로의 "\n"으로 나누고, 앞뒤 공백·빈 줄 빼고 최대 5줄
//   배열(서버 notes)이면 글자인 줄만 정리해서 씀
export const MAX_UPDATE_NOTES = 5;
const NOTE_SPLIT = /\||\\n|\r\n|\r|\n/;

export function splitUpdateNotes(raw: unknown): string[] {
  const parts: unknown[] = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(NOTE_SPLIT) : [];
  return parts
    .map(l => nonEmpty(l))
    .filter((l): l is string => l !== null)
    .slice(0, MAX_UPDATE_NOTES);
}

/** 응답 본문에서 업데이트 정보가 든 객체(보통 data) */
export function updatePayloadOf(body: any): Record<string, any> {
  if (body && typeof body === 'object' && body.data && typeof body.data === 'object') return body.data;
  return body && typeof body === 'object' ? body : {};
}

export function parseUpdateDetails(body: any): AppUpdateDetails {
  const d = updatePayloadOf(body);
  const isEnvelopeOnly = d === body && ('success' in d || 'error_code' in d);
  const message = isEnvelopeOnly ? null : nonEmpty(d.message);
  return {
    latestVersion: normalizeVersion(nonEmpty(d.latest_version)),
    minVersion: normalizeVersion(nonEmpty(d.min_version)),
    message,
    notes: isEnvelopeOnly ? [] : splitUpdateNotes(Array.isArray(d.notes) ? d.notes : message),
    storeUrl: nonEmpty(d.store_url),
    apkUrl: nonEmpty(d.apk_url),
  };
}
