#!/usr/bin/env node
// iOS 시뮬레이터 E2E 전용 — 로컬 백엔드(SMS_DRIVER=log)가 laravel.log에 남긴 문자 인증번호를 Maestro에 알려 주는 작은 서버.
//   GET /code?to=01099990077&wait=8  → {"code":"123456","to":"01099990077"} (없으면 wait초까지 기다렸다가 404)
//   GET /health                      → ok
// 127.0.0.1에서만 받음. CI 러너 안에서만 씀(실서버와 무관).
// 환경변수: LARAVEL_LOG(기본 backend/storage/logs/laravel.log), CODE_SERVER_PORT(기본 9999)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const LOG = process.env.LARAVEL_LOG || path.join(__dirname, '..', '..', 'backend', 'storage', 'logs', 'laravel.log');
const PORT = Number(process.env.CODE_SERVER_PORT || 9999);

// LogSmsService: [SMS 발송 시뮬레이션] to=01012345678 message="[현장메이트] 회원가입 인증번호는 123456 입니다. (3분간 유효)"
const LINE_RE = /to=(\d+)[^\n]*?인증번호[^\d\n]*(\d{6})/;

function latestCode(to) {
  let text = '';
  try {
    text = fs.readFileSync(LOG, 'utf8');
  } catch {
    return null;
  }
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = LINE_RE.exec(lines[i]);
    if (!m) continue;
    if (to && m[1] !== to) continue;
    return { code: m[2], to: m[1], line: i + 1 };
  }
  return null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }
  if (url.pathname !== '/code') {
    res.writeHead(404);
    return res.end('not found');
  }
  const to = (url.searchParams.get('to') || '').replace(/\D/g, '') || null;
  const waitMs = Math.min(Number(url.searchParams.get('wait') || 0), 20) * 1000;
  const started = Date.now();
  const tick = () => {
    const found = latestCode(to);
    if (found) {
      console.log(`[code-server] ${new Date().toISOString()} to=${found.to} line=${found.line}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(found));
    }
    if (Date.now() - started >= waitMs) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'no code yet', to }));
    }
    setTimeout(tick, 300);
  };
  tick();
});

server.listen(PORT, '127.0.0.1', () => console.log(`[code-server] listening on 127.0.0.1:${PORT}, log=${LOG}`));
