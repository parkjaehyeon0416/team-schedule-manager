#!/usr/bin/env node
// ★ v18.69 — AAB 하나를 Google Play 트랙(내부 테스트 등)에 올림 (androidpublisher v3 edits API)
//   edits.insert → bundles.upload → tracks.update → edits.commit
//
//   사용:
//     node tools/play-upload/upload.mjs --aab <app-release.aab> --track internal|alpha|production
//          --notes "<출시 노트(한국어)>" | --notes-file <utf-8 텍스트 파일>
//          [--status completed|draft] [--name "1.1.0 (N)"] [--expect-version-code N]
//          [--changes-not-sent-for-review]
//
//   서비스 계정 키: 환경 변수 PLAY_SA_JSON (기본 C:\Users\User\.secrets\play-service-account.json)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { parseArgs } from 'node:util';
import {
  PACKAGE_NAME, TRACKS, STATUSES, RELEASE_NOTES_MAX, FriendlyError, log, toNativePath, loadServiceAccount,
  createPublisher, withRetry, deleteEditQuietly, isVersionCodeUsed, explainError, consoleHint, runMain,
} from './play-common.mjs';

const USAGE = [
  '사용: node tools/play-upload/upload.mjs --aab <파일.aab> --track internal|alpha|production',
  '        --notes "<출시 노트>" (또는 --notes-file <파일>)',
  '        [--status completed|draft] [--name "1.1.0 (N)"] [--expect-version-code N] [--changes-not-sent-for-review]',
].join('\n');

const ctx = { step: '업로드' };

function readArgs() {
  let values;
  try {
    ({ values } = parseArgs({
      options: {
        aab: { type: 'string' },
        track: { type: 'string', default: 'internal' },
        notes: { type: 'string' },
        'notes-file': { type: 'string' },
        status: { type: 'string', default: 'completed' },
        name: { type: 'string' },
        'expect-version-code': { type: 'string' },
        'changes-not-sent-for-review': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h' },
      },
    }));
  } catch (e) {
    throw new FriendlyError(`옵션이 잘못됐습니다: ${e.message}\n${USAGE}`, 64);
  }
  if (values.help) {
    log(USAGE);
    process.exit(0);
  }

  if (!values.aab) throw new FriendlyError(`--aab 파일을 지정하세요.\n${USAGE}`, 64);
  const aab = path.resolve(toNativePath(values.aab));
  if (!fs.existsSync(aab) || !fs.statSync(aab).isFile()) throw new FriendlyError(`AAB 파일이 없습니다: ${aab}`, 64);
  if (!/\.aab$/i.test(aab)) throw new FriendlyError(`AAB(.aab) 파일만 올릴 수 있습니다: ${aab}`, 64);

  if (!TRACKS.includes(values.track)) throw new FriendlyError(`--track은 ${TRACKS.join(' | ')} 중 하나여야 합니다 (받은 값: ${values.track}).`, 64);
  if (!STATUSES.includes(values.status)) throw new FriendlyError(`--status는 ${STATUSES.join(' | ')} 중 하나여야 합니다 (받은 값: ${values.status}).`, 64);

  let notes = values.notes;
  if (values['notes-file']) {
    const nf = path.resolve(toNativePath(values['notes-file']));
    if (!fs.existsSync(nf)) throw new FriendlyError(`출시 노트 파일이 없습니다: ${nf}`, 64);
    notes = fs.readFileSync(nf, 'utf8').replace(/^\uFEFF/, '');
  }
  notes = (notes || '').replace(/\r\n/g, '\n').trim();
  if (!notes) throw new FriendlyError('출시 노트(--notes 또는 --notes-file)를 넣어 주세요. 테스터에게 "이번에 바뀐 점"으로 보입니다.', 64);
  if ([...notes].length > RELEASE_NOTES_MAX) {
    throw new FriendlyError(`출시 노트가 너무 깁니다 (${[...notes].length}자). Google Play는 ${RELEASE_NOTES_MAX}자까지만 받습니다.`, 64);
  }

  let expectVc;
  if (values['expect-version-code'] !== undefined) {
    expectVc = Number(values['expect-version-code']);
    if (!Number.isInteger(expectVc) || expectVc < 1) throw new FriendlyError('--expect-version-code는 1 이상의 정수여야 합니다.', 64);
  }

  return {
    aab,
    track: values.track,
    status: values.status,
    notes,
    name: values.name ? values.name.trim() : undefined,
    expectVc,
    changesNotSentForReview: values['changes-not-sent-for-review'],
  };
}

async function sha256Of(file) {
  const h = crypto.createHash('sha256');
  await pipeline(fs.createReadStream(file), h);
  return h.digest('hex');
}

// 업로드 진행률을 10% 단위로 stderr에 표시하는 통과 스트림
function progressStream(total) {
  let sent = 0;
  let lastStep = -1;
  return new Transform({
    transform(chunk, _enc, cb) {
      sent += chunk.length;
      const step = Math.floor((sent / total) * 10);
      if (step !== lastStep) {
        lastStep = step;
        log(`    ${Math.min(100, step * 10)}%  (${(sent / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} MB)`);
      }
      cb(null, chunk);
    },
  });
}

async function main() {
  const args = readArgs();
  ctx.track = args.track;
  const sa = loadServiceAccount();
  ctx.sa = sa;
  const api = createPublisher(sa);
  const opts = { retry: false, timeout: 60_000 };
  const uploadTimeoutMs = Math.max(1, Number(process.env.PLAY_UPLOAD_TIMEOUT_MIN) || 20) * 60_000;

  const size = fs.statSync(args.aab).size;
  const sha256 = await sha256Of(args.aab);
  log(`앱: ${PACKAGE_NAME} / 트랙: ${args.track} / 상태: ${args.status}`);
  log(`AAB: ${args.aab} (${(size / 1048576).toFixed(1)} MB, sha256 ${sha256.slice(0, 12)}…)`);

  ctx.step = 'edit 만들기';
  const edit = await withRetry('edit 만들기', () => api.edits.insert({ packageName: PACKAGE_NAME }, opts));
  const editId = edit.data.id;
  let committed = false;

  try {
    // 1) AAB 업로드 — 시도할 때마다 파일 스트림을 새로 연다
    ctx.step = 'AAB 업로드';
    log('AAB 업로드 중...');
    let bundle;
    try {
      const res = await withRetry('AAB 업로드', () => {
        // ★ v18.69 — pipe()는 읽기 오류를 다음 스트림으로 넘기지 않아, 파일 읽기가 실패하면 제한 시간(20분)까지 멈춰 있었음
        //   → 읽기 오류가 나면 진행률 스트림을 그 오류로 끝내서 업로드가 바로 실패하게 함
        const src = fs.createReadStream(args.aab);
        const body = progressStream(size);
        src.on('error', (e) => body.destroy(e));
        return api.edits.bundles.upload(
          {
            packageName: PACKAGE_NAME,
            editId,
            media: { mimeType: 'application/octet-stream', body: src.pipe(body) },
          },
          { retry: false, timeout: uploadTimeoutMs, headers: { 'Content-Length': String(size) } },
        );
      });
      bundle = res.data;
    } catch (err) {
      // 같은 파일이 이미 올라가 있으면(이전 시도가 실제로는 성공했던 경우 등) 그 versionCode를 그대로 씀
      if (!isVersionCodeUsed(err)) throw err;
      const list = await withRetry('AAB 목록', () => api.edits.bundles.list({ packageName: PACKAGE_NAME, editId }, opts));
      const same = (list.data.bundles || []).find((b) => (b.sha256 || '').toLowerCase() === sha256);
      if (!same) throw err;
      log(`  같은 AAB가 이미 올라가 있습니다 (versionCode ${same.versionCode}). 그걸로 계속합니다.`);
      bundle = same;
    }
    const versionCode = Number(bundle.versionCode);
    log(`  업로드 완료: versionCode ${versionCode}`);

    if (args.expectVc !== undefined && versionCode !== args.expectVc) {
      throw new FriendlyError(
        [
          `AAB 안의 versionCode(${versionCode})가 예상한 값(${args.expectVc})과 다릅니다. 올리지 않고 멈춥니다.`,
          '  - app/android/app/build.gradle의 versionCode가 -PversionCode 값을 읽도록 되어 있는지 확인하세요.',
        ].join('\n'),
        3,
      );
    }

    // 2) 트랙에 출시 만들기 (이 트랙의 출시 목록을 이번 출시 하나로 교체)
    ctx.step = '트랙 업데이트';
    const release = {
      versionCodes: [String(versionCode)],
      status: args.status,
      releaseNotes: [{ language: 'ko-KR', text: args.notes }],
    };
    if (args.name) release.name = args.name;
    log(`트랙(${args.track})에 출시 등록 중...`);
    await withRetry('트랙 업데이트', () => api.edits.tracks.update(
      { packageName: PACKAGE_NAME, editId, track: args.track, requestBody: { track: args.track, releases: [release] } },
      opts,
    ));

    // 3) 커밋 (여기서 실제로 반영됨)
    ctx.step = '커밋';
    log('변경사항 반영(커밋) 중...');
    try {
      await withRetry('커밋', () => api.edits.commit(
        { packageName: PACKAGE_NAME, editId, ...(args.changesNotSentForReview ? { changesNotSentForReview: true } : {}) },
        opts,
      ));
    } catch (err) {
      if (err.retriedAfterTransient) {
        throw new FriendlyError(
          `${explainError(err, ctx)}\n  (앞선 커밋 요청이 실제로는 성공했을 수도 있습니다. Play Console에서 확인하세요: ${consoleHint(args.track)})`,
          1,
        );
      }
      throw err;
    }
    committed = true;

    const result = { packageName: PACKAGE_NAME, track: args.track, status: args.status, versionCode, name: args.name || null };
    log('');
    log(`[완료] versionCode ${versionCode} → ${args.track} 트랙 (${args.status === 'draft' ? '초안 — 콘솔에서 "검토 및 출시"를 눌러야 배포됨' : '출시됨'})`);
    log(`  Play Console: ${consoleHint(args.track)}`);
    if (args.track === 'internal') log('  내부 테스터는 보통 몇 분 안에 플레이 스토어에서 업데이트를 받을 수 있습니다.');
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (err) {
    if (!committed) await deleteEditQuietly(api, editId);
    // explainError가 FriendlyError가 아닌 오류도 한국어로 바꿔 줌 — 단계 정보만 붙여서 다시 던짐
    if (!(err instanceof FriendlyError)) throw Object.assign(new FriendlyError(explainError(err, ctx), 1), { cause: err });
    throw err;
  }
}

runMain(main, ctx);
