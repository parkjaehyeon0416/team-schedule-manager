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

// 본문: 빈 줄로 문단 구분, "- "로 시작하는 줄 묶음은 목록
export type BodyBlock = { kind: 'p'; text: string } | { kind: 'ul'; items: string[] };

export function parseNoticeBody(body: string | null): BodyBlock[] {
  if (!body) return [];
  return body
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map(chunk => chunk.trim())
    .filter(Boolean)
    .map(chunk => {
      const lines = chunk.split('\n');
      if (lines.every(l => l.trim().startsWith('- '))) {
        return { kind: 'ul', items: lines.map(l => l.trim().slice(2)) } as BodyBlock;
      }
      return { kind: 'p', text: chunk } as BodyBlock;
    });
}
