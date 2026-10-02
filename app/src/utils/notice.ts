import dayjs from 'dayjs';

// 게시 후 7일 이내면 목록에 "N" 표시
export function isNewNotice(publishedAt: string): boolean {
  return dayjs().diff(dayjs(publishedAt), 'day') < 7;
}

export function formatNoticeDate(date: string): string {
  return dayjs(date).format('YYYY.MM.DD');
}

// "2026.10.01 ~ 10.31" (같은 해면 종료일의 연도 생략)
export function formatEventPeriod(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt && !endsAt) return '';
  if (!endsAt) return `${dayjs(startsAt).format('YYYY.MM.DD')} ~`;
  if (!startsAt) return `~ ${dayjs(endsAt).format('YYYY.MM.DD')}`;
  const s = dayjs(startsAt);
  const e = dayjs(endsAt);
  return `${s.format('YYYY.MM.DD')} ~ ${e.format(s.year() === e.year() ? 'MM.DD' : 'YYYY.MM.DD')}`;
}

export type EventStatus = '예정' | '진행중' | '종료';

export function eventStatus(startsAt: string | null, endsAt: string | null): EventStatus {
  const today = dayjs().startOf('day');
  if (startsAt && today.isBefore(dayjs(startsAt))) return '예정';
  if (endsAt && today.isAfter(dayjs(endsAt))) return '종료';
  return '진행중';
}

// 종료일까지 남은 일수 — 진행중일 때만 의미 있음
export function eventDday(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const days = dayjs(endsAt).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (days < 0) return null;
  return days === 0 ? 'D-DAY' : `D-${days}`;
}

// 본문: 빈 줄로 문단 구분, "- "/"• "/"· " 줄 묶음은 글머리 목록, "1. " 줄 묶음은 번호 목록
//   ★ v18.41 — 웹 관리자(frontend/src/components/BodyPreview.tsx)와 같은 규칙. 글자 꾸밈(**굵게** *기울임* __밑줄__)은 splitInline
export type BodyBlock = { kind: 'p'; text: string } | { kind: 'ul' | 'ol'; items: string[] };
const BULLET = /^\s*[-•·]\s+/;
const NUMBER = /^\s*\d+[.)]\s+/;

export function parseNoticeBody(body: string | null): BodyBlock[] {
  if (!body) return [];
  return body
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map(chunk => chunk.trim())
    .filter(Boolean)
    .map(chunk => {
      const lines = chunk.split('\n');
      if (lines.every(l => BULLET.test(l))) {
        return { kind: 'ul', items: lines.map(l => l.replace(BULLET, '')) } as BodyBlock;
      }
      if (lines.every(l => NUMBER.test(l))) {
        return { kind: 'ol', items: lines.map(l => l.replace(NUMBER, '')) } as BodyBlock;
      }
      return { kind: 'p', text: chunk } as BodyBlock;
    });
}

// ★ v18.41 — 글자 꾸밈: **굵게** / __밑줄__ / *기울임* → 조각 배열
export type InlinePart = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };
export function splitInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    const t = m[0];
    if (t.startsWith('**')) parts.push({ text: t.slice(2, -2), bold: true });
    else if (t.startsWith('__')) parts.push({ text: t.slice(2, -2), underline: true });
    else parts.push({ text: t.slice(1, -1), italic: true });
    last = m.index + t.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
