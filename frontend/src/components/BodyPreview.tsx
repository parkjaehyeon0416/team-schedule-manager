// ★ v18.41 — 공지·이벤트 본문 미리보기. 앱(app/src/utils/notice.ts parseNoticeBody)과 같은 규칙:
//   빈 줄 = 문단 구분, "- "/"• "/"· " 줄 = 글머리 목록, "1. " 줄 = 번호 목록,
//   **굵게**, *기울임*, __밑줄__
import type { ReactNode } from "react";

type Block = { kind: "p"; text: string } | { kind: "ul" | "ol"; items: string[] };

const BULLET = /^\s*[-•·]\s+/;
const NUMBER = /^\s*\d+[.)]\s+/;

export function parseBody(body: string | null | undefined): Block[] {
  if (!body) return [];
  return body.replace(/\r\n/g, "\n").split(/\n\s*\n/).map(c => c.trim()).filter(Boolean).map(chunk => {
    const lines = chunk.split("\n");
    if (lines.every(l => BULLET.test(l))) return { kind: "ul", items: lines.map(l => l.replace(BULLET, "")) };
    if (lines.every(l => NUMBER.test(l))) return { kind: "ol", items: lines.map(l => l.replace(NUMBER, "")) };
    return { kind: "p", text: chunk };
  });
}

// **굵게** / __밑줄__ / *기울임*
export function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("__")) out.push(<u key={k++}>{t.slice(2, -2)}</u>);
    else out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function BodyPreview({ body, fontSize = 13 }: { body: string; fontSize?: number }) {
  const style = { margin: 0, fontSize, lineHeight: 1.7, whiteSpace: "pre-line" as const };
  return (
    <>
      {parseBody(body).map((b, i) =>
        b.kind === "p" ? (
          <p key={i} style={style}>{renderInline(b.text)}</p>
        ) : b.kind === "ul" ? (
          <ul key={i} style={{ ...style, paddingLeft: 18 }}>{b.items.map((t, j) => <li key={j}>{renderInline(t)}</li>)}</ul>
        ) : (
          <ol key={i} style={{ ...style, paddingLeft: 20 }}>{b.items.map((t, j) => <li key={j}>{renderInline(t)}</li>)}</ol>
        ),
      )}
    </>
  );
}
