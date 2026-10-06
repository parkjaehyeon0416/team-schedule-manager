// ★ v18.43 — 통계 (DESIGN-CANVAS ADMIN_STATS): 일별 가입 · 문의 · 접속자. 결제는 기능이 생기면 같은 형태로 추가
import { useEffect, useState } from "react";
import { getStats, type Stats as StatsData, type StatsDay } from "../api/operator";
import { PageHeader, Segmented, errorMessage, useToast } from "../components/ui";

const RANGES = [7, 14, 30] as const;
type Range = (typeof RANGES)[number];

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dot = (s: string) => s.replace(/-/g, ".");

function Chart({ title, unit, days, pick }: { title: string; unit: string; days: StatsDay[]; pick: (d: StatsDay) => number }) {
  const vals = days.map(pick);
  const max = Math.max(1, ...vals);
  const sum = vals.reduce((a, b) => a + b, 0);
  const n = days.length;
  return (
    <section className="adm-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <h2 className="adm-sec-title">{title}</h2>
          <span className="adm-card-sub">하루 평균 {Math.round((sum / Math.max(1, n)) * 10) / 10}{unit}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontSize: 22, fontWeight: 800 }}>{sum.toLocaleString()}{unit}</span>
          <span className="adm-card-sub">기간 합계</span>
        </div>
      </div>
      <div className="adm-bars" role="img" aria-label={`${title} 막대 그래프`}>
        {days.map((d, i) => {
          const v = vals[i];
          const last = i === n - 1;
          return (
            <div key={d.date} className="bar" data-tip={`${Number(d.date.slice(5, 7))}/${Number(d.date.slice(8))} · ${v}${unit}`}
              style={{ height: `${Math.max(3, Math.round((120 * v) / max))}px`, background: last ? "#0A6CE0" : "#7DBBFF" }} />
          );
        })}
      </div>
      <div className="adm-bar-labels">
        {days.map((d, i) => {
          const show = n <= 14 || i % 5 === 0 || i === n - 1;
          return <span key={d.date}>{show ? `${Number(d.date.slice(5, 7))}/${Number(d.date.slice(8))}` : ""}</span>;
        })}
      </div>
      <span className="adm-card-sub">오늘 {vals[n - 1] ?? 0}{unit} · 막대에 마우스를 올리면 날짜별 값이 보여요</span>
    </section>
  );
}

export default function Stats() {
  const toast = useToast();
  const [range, setRange] = useState<Range>(14);
  const [data, setData] = useState<StatsData | null>(null);

  useEffect(() => {
    const to = new Date();
    const from = new Date(to.getTime() - (range - 1) * 86_400_000);
    getStats(ymd(from), ymd(to)).then(setData).catch(e => toast(errorMessage(e, "통계를 불러오지 못했어요."), true));
  }, [range, toast]);

  const now = data?.now;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "운영" }, { label: "통계" }]}
        title="통계"
        actions={<>
          <Segmented<Range> width={300} value={range} onChange={setRange} items={RANGES.map(r => ({ label: `최근 ${r}일`, value: r }))} />
          {data && <span style={{ fontSize: 13, color: "#5F7290" }}>{dot(data.from)} ~ {dot(data.to)}</span>}
        </>}
      />

      <div className="adm-minis">
        <div className="adm-mini">
          <span className="adm-mini-label">전체 회원</span>
          <span className="adm-mini-value">{now ? `${now.members.toLocaleString()}명` : "-"}</span>
          <span className="adm-mini-sub">오늘 +{now?.signups_today ?? 0}명</span>
        </div>
        <div className="adm-mini">
          <span className="adm-mini-label">오늘 접속자</span>
          <span className="adm-mini-value">{now ? `${now.active_today.toLocaleString()}명` : "-"}</span>
          <span className="adm-mini-sub">00:00부터 지금까지</span>
        </div>
        <div className="adm-mini">
          <span className="adm-mini-label">답변 대기 문의</span>
          <span className="adm-mini-value" style={{ color: now?.pending_inquiries ? "#B95E00" : undefined }}>{now ? `${now.pending_inquiries}건` : "-"}</span>
          <span className="adm-mini-sub">{now?.oldest_pending_hours != null ? `가장 오래된 문의 ${now.oldest_pending_hours}시간` : "대기 중인 문의 없음"}</span>
        </div>
        <div className="adm-mini" style={{ borderStyle: "dashed" }}>
          <span className="adm-mini-label">이번 달 결제</span>
          <span className="adm-mini-value" style={{ color: "#8FA3BF" }}>준비 중</span>
          <span className="adm-mini-sub">결제 기능이 열리면 여기에 표시돼요</span>
        </div>
      </div>

      {!data ? <div className="adm-empty">불러오는 중…</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))", gap: 16 }}>
          <Chart title="일별 가입" unit="명" days={data.series} pick={d => d.signups} />
          <Chart title="일별 문의" unit="건" days={data.series} pick={d => d.inquiries} />
          <Chart title="일별 접속자" unit="명" days={data.series} pick={d => d.active_users} />
          <section className="adm-card" style={{ borderStyle: "dashed", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 240 }}>
            <h2 className="adm-sec-title">결제 <span className="adm-soon-tag" style={{ marginLeft: 6 }}>준비 중</span></h2>
            <span className="adm-card-sub">결제 기능이 생기면 일별 결제 금액 · 건수 그래프가 이 자리에 들어가요</span>
          </section>
        </div>
      )}
    </>
  );
}
