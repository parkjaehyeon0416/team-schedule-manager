#!/usr/bin/env node
// ★ v18.69 — 다음에 쓸 안드로이드 versionCode 계산
//   = max(모든 트랙의 출시에 들어간 versionCode, 지금까지 올린 AAB/APK의 versionCode) + 1
//   stdout에는 숫자 하나만 출력 (scripts/release-android.sh가 VC=$(...)로 받음). 안내 문구는 전부 stderr.
//
//   사용: node tools/play-upload/next-version-code.mjs [--min N]
//     --min N  최소값 (기본 2). 홈페이지로 나눠 준 옛 APK(≤ v18.68)가 전부 versionCode 1이라
//              플레이에 아무것도 없을 때도 1은 피한다.
import { parseArgs } from 'node:util';
import {
  PACKAGE_NAME, FriendlyError, log, loadServiceAccount, createPublisher, withRetry, deleteEditQuietly, runMain,
} from './play-common.mjs';

const ctx = { step: '다음 versionCode 확인' };

async function main() {
  let values;
  try {
    ({ values } = parseArgs({ options: { min: { type: 'string', default: '2' }, help: { type: 'boolean', short: 'h' } } }));
  } catch (e) {
    throw new FriendlyError(`옵션이 잘못됐습니다: ${e.message}\n  사용: node next-version-code.mjs [--min N]`, 64);
  }
  if (values.help) {
    log('사용: node tools/play-upload/next-version-code.mjs [--min N]');
    return 0;
  }
  const min = Number(values.min);
  if (!Number.isInteger(min) || min < 1) throw new FriendlyError('--min은 1 이상의 정수여야 합니다.', 64);

  const sa = loadServiceAccount();
  ctx.sa = sa;
  const api = createPublisher(sa);
  const opts = { retry: false, timeout: 60_000 };

  log(`Google Play(${PACKAGE_NAME})에서 지금까지 쓴 versionCode를 확인합니다...`);
  const edit = await withRetry('edit 만들기', () => api.edits.insert({ packageName: PACKAGE_NAME }, opts));
  const editId = edit.data.id;
  try {
    const codes = [];
    const [tracks, bundles, apks] = await Promise.all([
      withRetry('트랙 목록', () => api.edits.tracks.list({ packageName: PACKAGE_NAME, editId }, opts)),
      withRetry('AAB 목록', () => api.edits.bundles.list({ packageName: PACKAGE_NAME, editId }, opts)),
      withRetry('APK 목록', () => api.edits.apks.list({ packageName: PACKAGE_NAME, editId }, opts)),
    ]);
    const perTrack = [];
    for (const t of tracks.data.tracks || []) {
      const vcs = (t.releases || []).flatMap((r) => (r.versionCodes || []).map(Number));
      codes.push(...vcs);
      if (vcs.length) perTrack.push(`${t.track}: ${Math.max(...vcs)}`);
    }
    const bundleCodes = (bundles.data.bundles || []).map((b) => Number(b.versionCode));
    const apkCodes = (apks.data.apks || []).map((a) => Number(a.versionCode));
    codes.push(...bundleCodes, ...apkCodes);

    const valid = codes.filter((n) => Number.isFinite(n) && n > 0);
    const maxUsed = valid.length ? Math.max(...valid) : 0;
    const next = Math.max(maxUsed + 1, min);

    log(`  트랙별 최대: ${perTrack.length ? perTrack.join(', ') : '(출시 없음)'}`);
    log(`  올린 AAB ${bundleCodes.length}개, APK ${apkCodes.length}개 / 지금까지 최대 versionCode: ${maxUsed || '없음'}`);
    log(`  → 다음 versionCode: ${next}`);
    process.stdout.write(`${next}\n`);
    return 0;
  } finally {
    // 읽기만 했으니 edit은 버림
    await deleteEditQuietly(api, editId);
  }
}

runMain(main, ctx);
