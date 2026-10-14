// ★ v18.69 — Google Play 업로드 도구 공용 부분 (서비스 계정 키 읽기, API 클라이언트, 재시도, 한국어 오류 안내)
//   upload.mjs / next-version-code.mjs 가 같이 씀.
//   키 파일 내용(private_key 등)은 절대 화면에 찍지 않는다. client_email(초대할 주소)만 안내용으로 보여 줌.
import fs from 'node:fs';
import path from 'node:path';
import { androidpublisher, auth } from '@googleapis/androidpublisher';

export const PACKAGE_NAME = process.env.PLAY_PACKAGE_NAME || 'com.workmatekr.app';
export const DEFAULT_KEY_PATH = 'C:\\Users\\User\\.secrets\\play-service-account.json';
// 서비스 계정을 만든 Google Cloud 프로젝트 (키 파일에 project_id가 있으면 그걸 우선 사용)
export const DEFAULT_CLOUD_PROJECT = 'blissful-sun-446703-h2';
export const TRACKS = ['internal', 'alpha', 'production'];
export const STATUSES = ['completed', 'draft'];
export const RELEASE_NOTES_MAX = 500; // 플레이 출시 노트는 언어별 500자까지

// 오류 하나를 사용자에게 보여 줄 형태로 감싼 것 (스택 대신 이 메시지만 출력)
export class FriendlyError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.name = 'FriendlyError';
    this.exitCode = exitCode;
  }
}

// 진행 상황은 전부 stderr로 (next-version-code.mjs의 stdout에는 숫자 하나만 나가야 해서)
export function log(...args) {
  console.error(...args);
}

// Git Bash에서 넘긴 /c/Users/... 꼴 경로를 윈도우 node가 읽을 수 있게 C:/Users/... 로 바꿈
export function toNativePath(p) {
  if (!p) return p;
  if (process.platform === 'win32') {
    const m = /^\/([a-zA-Z])\/(.*)$/.exec(p);
    if (m) return `${m[1].toUpperCase()}:/${m[2]}`;
  }
  return p;
}

export function resolveKeyPath() {
  return path.resolve(toNativePath(process.env.PLAY_SA_JSON || DEFAULT_KEY_PATH));
}

// 서비스 계정 키 파일 확인 — 내용은 출력하지 않고, 형식이 맞는지만 본다
export function loadServiceAccount(keyPath = resolveKeyPath()) {
  if (!fs.existsSync(keyPath)) {
    throw new FriendlyError(
      [
        `서비스 계정 키 파일이 없습니다: ${keyPath}`,
        '  - README.md의 "처음 한 번 설정" 3~4단계대로 JSON 키를 받아 위 경로에 저장하세요.',
        '  - 다른 곳에 두었다면 PLAY_SA_JSON 환경 변수로 경로를 알려 주세요.',
      ].join('\n'),
      2,
    );
  }
  let json;
  try {
    json = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  } catch {
    throw new FriendlyError(`서비스 계정 키 파일을 JSON으로 읽을 수 없습니다: ${keyPath}\n  - Google Cloud에서 받은 .json 파일을 고치지 말고 그대로 저장하세요.`, 2);
  }
  if (!json || json.type !== 'service_account' || !json.client_email || !json.private_key) {
    throw new FriendlyError(
      `서비스 계정 키 형식이 아닙니다: ${keyPath}\n  - "서비스 계정 > 키 > 새 키 만들기 > JSON"으로 받은 파일이어야 합니다 (OAuth 클라이언트 JSON이나 google-services.json 아님).`,
      2,
    );
  }
  return {
    keyPath,
    clientEmail: json.client_email,
    projectId: json.project_id || DEFAULT_CLOUD_PROJECT,
    credentials: { client_email: json.client_email, private_key: json.private_key },
  };
}

export function createPublisher(sa) {
  const googleAuth = new auth.GoogleAuth({
    credentials: sa.credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  return androidpublisher({ version: 'v3', auth: googleAuth });
}

// ───────── 오류 해석 ─────────

function errorStatus(err) {
  return err?.response?.status ?? (typeof err?.status === 'number' ? err.status : undefined) ?? (typeof err?.code === 'number' ? err.code : undefined);
}

// 네트워크 오류 코드 (fetch 오류는 cause 안쪽에 진짜 코드가 들어 있음)
function errorNetworkCode(err) {
  for (const c of [err?.code, err?.cause?.code, err?.cause?.cause?.code, err?.error?.code, err?.error?.cause?.code]) {
    if (typeof c === 'string' && c !== 'ERR_GAXIOS' && !/^\d+$/.test(c)) return c;
  }
  return undefined;
}

// 구글이 돌려준 원문 메시지 (안내문 끝에 참고로 붙임)
export function apiMessage(err) {
  const data = err?.response?.data;
  if (data && typeof data === 'object') {
    if (data.error && typeof data.error === 'object' && data.error.message) return String(data.error.message);
    if (typeof data.error === 'string') return data.error_description ? `${data.error}: ${data.error_description}` : data.error;
  }
  if (typeof data === 'string' && data.length < 500) return data;
  return err?.message ? String(err.message) : String(err);
}

function apiReasons(err) {
  const e = err?.response?.data?.error;
  const reasons = [];
  if (e && typeof e === 'object') {
    if (e.status) reasons.push(String(e.status));
    for (const x of e.errors || []) if (x?.reason) reasons.push(String(x.reason));
    for (const d of e.details || []) if (d?.reason) reasons.push(String(d.reason));
  }
  return reasons;
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_NET = new Set([
  'ECONNRESET', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'EAI_AGAIN', 'EPIPE', 'ECONNABORTED',
  'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT', 'TimeoutError', 'AbortError',
]);

export function isTransient(err) {
  if (err instanceof FriendlyError) return false;
  const s = errorStatus(err);
  if (s && RETRYABLE_STATUS.has(s)) return true;
  if (s && s >= 400) return false; // 그 밖의 4xx는 다시 해도 같은 결과
  const net = errorNetworkCode(err);
  if (net && RETRYABLE_NET.has(net)) return true;
  // 요청 시간 초과·연결 끊김
  if (/timeout|timed out|socket hang up|other side closed/i.test(String(err?.message || ''))) return true;
  return false;
}

export function isVersionCodeUsed(err) {
  return /version code[^.]*already (been )?used|version code \d+ has already been used/i.test(apiMessage(err));
}

// 사람이 읽을 한국어 안내로 바꿈. ctx: { sa, track, step }
export function explainError(err, ctx = {}) {
  if (err instanceof FriendlyError) return err.message;
  const status = errorStatus(err);
  const msg = apiMessage(err);
  const reasons = apiReasons(err);
  const email = ctx.sa?.clientEmail ? ` (${ctx.sa.clientEmail})` : '';
  const project = ctx.sa?.projectId || DEFAULT_CLOUD_PROJECT;
  const raw = `  [구글 응답${status ? ` ${status}` : ''}] ${msg}`;
  const net = errorNetworkCode(err);

  // 키 자체가 거절됨 (토큰 발급 단계)
  if (/invalid_grant|invalid_client|unauthorized_client/i.test(msg)) {
    const lines = ['구글이 서비스 계정 키를 받아 주지 않았습니다 (로그인 실패).'];
    if (/short-lived|iat|exp|clock/i.test(msg)) {
      lines.push('  - 이 PC의 날짜/시간이 틀어져 있습니다. 윈도우 설정 > 시간 및 언어 > "지금 동기화"를 누른 뒤 다시 실행하세요.');
    } else {
      lines.push('  - 키가 삭제됐거나(구글 클라우드에서 키를 지우면 바로 못 씀), 서비스 계정이 사라졌거나, 다른 파일을 저장한 것 같습니다.');
      lines.push('  - README.md "처음 한 번 설정" 3단계대로 새 JSON 키를 만들어 같은 경로에 덮어쓰세요.');
    }
    lines.push(raw);
    return lines.join('\n');
  }
  if (/DECODER routines|PEM|private key|asn1|unsupported key/i.test(msg)) {
    return ['서비스 계정 키 안의 개인 키(private_key)를 읽을 수 없습니다. 키 파일이 손상됐습니다.', '  - 새 JSON 키를 만들어 덮어쓰세요.', raw].join('\n');
  }
  if (net === 'ENOTFOUND' || net === 'ECONNREFUSED' || net === 'EAI_AGAIN') {
    return ['구글 서버에 연결하지 못했습니다. 인터넷 연결(또는 회사 방화벽/프록시)을 확인하고 다시 실행하세요.', raw].join('\n');
  }
  if (status === 401) {
    return ['인증에 실패했습니다 (401).', '  - 서비스 계정 키가 폐기됐을 수 있습니다. 새 JSON 키를 만들어 덮어쓰세요.', raw].join('\n');
  }
  if (isVersionCodeUsed(err)) {
    return [
      '이 versionCode는 이미 Google Play에 올린 적이 있어서 다시 쓸 수 없습니다.',
      '  - versionCode는 올릴 때마다 커져야 합니다. `node tools/play-upload/next-version-code.mjs`로 다음 번호를 확인하고,',
      '    그 번호로 다시 빌드(scripts/release-android.sh가 자동으로 함)한 뒤 올리세요.',
      raw,
    ].join('\n');
  }
  if (/only releases with status draft/i.test(msg) || /draft app/i.test(msg)) {
    return [
      '이 앱은 아직 Play Console에서 한 번도 출시(검토 통과)되지 않은 "초안 앱"이라 바로 출시 상태로 올릴 수 없습니다.',
      '  - `--status draft`를 붙여 다시 올린 뒤, Play Console에서 해당 출시를 열어 "검토 및 출시"를 직접 누르세요.',
      raw,
    ].join('\n');
  }
  if (/changesNotSentForReview|cannot be sent for review automatically/i.test(msg)) {
    return [
      'Play Console 설정(관리형 게시 등) 때문에 변경사항을 자동으로 검토에 보낼 수 없습니다.',
      '  - `--changes-not-sent-for-review`를 붙여 다시 실행한 뒤, Play Console "게시 개요"에서 직접 검토로 보내세요.',
      raw,
    ].join('\n');
  }
  if (status === 403) {
    if (reasons.includes('SERVICE_DISABLED') || reasons.includes('accessNotConfigured') || /has not been used in project|is disabled|API has not been used/i.test(msg)) {
      return [
        'Google Cloud 프로젝트에서 "Google Play Android Developer API"가 꺼져 있습니다.',
        `  - 이 주소에서 "사용" 버튼을 누르고 몇 분 뒤 다시 실행하세요: https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com?project=${project}`,
        raw,
      ].join('\n');
    }
    const lines = [
      `서비스 계정${email}에 이 앱을 다룰 권한이 없습니다 (403).`,
      '  - Play Console > 사용자 및 권한 > "새 사용자 초대"에 위 이메일을 넣고, 앱 권한에 "현장메이트"를 추가했는지 확인하세요.',
      '  - 권한: "테스트 트랙에 앱 출시", "테스트 트랙 관리 및 테스터 목록 수정" (README.md 5단계).',
      '  - 초대 직후에는 반영까지 시간이 걸릴 수 있습니다. 몇 분~몇 시간 뒤 다시 해 보세요.',
    ];
    if (ctx.track === 'production') lines.push('  - 프로덕션 트랙은 "프로덕션에 앱 출시..." 권한이 따로 필요합니다. 보통은 내부 테스트로 올린 뒤 콘솔에서 승격하세요.');
    lines.push(raw);
    return lines.join('\n');
  }
  if (status === 404 && /package not found|not found/i.test(msg)) {
    return [
      `Google Play에서 앱(${PACKAGE_NAME})을 찾지 못했습니다 (404).`,
      '  - Play Console에 이 패키지 이름으로 앱이 만들어져 있는지, 서비스 계정 초대 때 앱 권한에 "현장메이트"를 넣었는지 확인하세요.',
      raw,
    ].join('\n');
  }
  if (isTransient(err)) {
    return ['구글 서버가 일시적으로 응답하지 않습니다. 여러 번 다시 시도했지만 실패했습니다. 잠시 뒤 다시 실행하세요.', raw].join('\n');
  }
  return [`Google Play 요청이 실패했습니다${ctx.step ? ` (${ctx.step})` : ''}.`, raw].join('\n');
}

// ───────── 재시도 ─────────
// 일시적 오류(5xx/429/네트워크 끊김)만 다시 시도. fn은 매번 새로 요청을 만들어야 함(업로드 스트림 재생성).
export async function withRetry(label, fn, { attempts = 4, baseDelayMs = 2000 } = {}) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn(i);
    } catch (err) {
      lastErr = err;
      if (err instanceof FriendlyError || !isTransient(err) || i === attempts) {
        if (i > 1) err.retriedAfterTransient = true;
        throw err;
      }
      const wait = baseDelayMs * 2 ** (i - 1) + Math.floor(Math.random() * 500);
      log(`  ${label}: 일시적 오류(${errorStatus(err) ?? errorNetworkCode(err) ?? 'timeout'}) — ${Math.round(wait / 1000)}초 뒤 다시 시도 (${i}/${attempts - 1})`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

// 실패 때 열려 있던 edit 정리 (실패해도 무시 — 안 지워도 구글이 일정 시간 뒤 버림)
export async function deleteEditQuietly(api, editId) {
  if (!editId) return;
  try {
    await api.edits.delete({ packageName: PACKAGE_NAME, editId }, { retry: false, timeout: 30_000 });
  } catch {
    /* 무시 */
  }
}

export function consoleHint(track) {
  const menu = {
    internal: '테스트 및 출시 > 테스트 > 내부 테스트',
    alpha: '테스트 및 출시 > 테스트 > 비공개 테스트',
    production: '테스트 및 출시 > 프로덕션',
  }[track] || '테스트 및 출시';
  return `https://play.google.com/console  (현장메이트 > ${menu})`;
}

export function runMain(main, ctx = {}) {
  main().then(
    (code) => process.exit(typeof code === 'number' ? code : 0),
    (err) => {
      console.error('\n[실패] ' + explainError(err, ctx));
      if (process.env.PLAY_DEBUG) console.error(err?.cause || err);
      process.exit(err instanceof FriendlyError ? err.exitCode : 1);
    },
  );
}
