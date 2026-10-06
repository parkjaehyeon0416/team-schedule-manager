// ★ v18.43 — 고객 문의 목록 (DESIGN-CANVAS ADMIN_INQUIRY_LIST)
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CATEGORY_LABEL, getInquiries, type InquiryCategory, type InquiryPage } from "../api/operator";
import { PageHeader, SearchInput, Segmented, errorMessage, fmtDate, useToast } from "../components/ui";

type Tab = "all" | "pending" | "answered";

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = window.setTimeout(() => setV(value), ms); return () => window.clearTimeout(t); }, [value, ms]);
  return v;
}

// 접수 후 지난 시간 ("14시간", "2일")
export function ageText(from: string): string {
  const h = Math.floor((Date.now() - new Date(from).getTime()) / 3_600_000);
  if (h < 1) return "1시간 미만";
  return h < 48 ? `${h}시간` : `${Math.floor(h / 24)}일`;
}

function minutesText(m: number | null): string {
  if (m === null) return "-";
  if (m < 60) return `${m}분`;
  return `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ""}`;
}

export default function InquiryList() {
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("all");
  const [category, setCategory] = useState<"" | InquiryCategory>("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<InquiryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const query = useDebounced(q);

  const load = useCallback(() => {
    setLoading(true);
    getInquiries({ status: tab === "all" ? undefined : tab, category: category || undefined, q: query || undefined, page })
      .then(setData)
      .catch(e => toast(errorMessage(e, "문의 목록을 불러오지 못했어요."), true))
      .finally(() => setLoading(false));
  }, [tab, category, query, page, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [tab, category, query]);

  const s = data?.summary;
  const topCats = s ? Object.entries(s.month_by_category).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 2)
    .map(([k, v]) => `${CATEGORY_LABEL[k as InquiryCategory]} ${v}`).join(" · ") : "";

  return (
    <>
      <PageHeader crumbs={[{ label: "운영" }, { label: "고객 문의" }]} title="고객 문의" />

      <div className="adm-minis">
        <div className="adm-mini">
          <span className="adm-mini-label">답변 대기</span>
          <span className="adm-mini-value" style={{ color: "#B95E00" }}>{s?.pending ?? "-"}건</span>
          <span className="adm-mini-sub">{s?.oldest_pending_hours != null ? `가장 오래된 문의 ${s.oldest_pending_hours}시간` : "대기 중인 문의 없음"}</span>
        </div>
        <div className="adm-mini">
          <span className="adm-mini-label">오늘 접수</span>
          <span className="adm-mini-value">{s?.today ?? "-"}건</span>
          <span className="adm-mini-sub">{new Date().getMonth() + 1}월 {new Date().getDate()}일 기준</span>
        </div>
        <div className="adm-mini">
          <span className="adm-mini-label">이번 주 답변</span>
          <span className="adm-mini-value">{s?.answered_week ?? "-"}건</span>
          <span className="adm-mini-sub">평균 첫 답변 {minutesText(s?.avg_first_answer_minutes ?? null)}</span>
        </div>
        <div className="adm-mini">
          <span className="adm-mini-label">이번 달 접수</span>
          <span className="adm-mini-value">{s?.month ?? "-"}건</span>
          <span className="adm-mini-sub">{topCats || "-"}</span>
        </div>
      </div>

      <section className="adm-card">
        <div className="adm-toolbar">
          <Segmented<Tab> width={360} value={tab} onChange={setTab} items={[
            { label: `전체 ${data?.counts.all ?? ""}`, value: "all" },
            { label: `대기 ${data?.counts.pending ?? ""}`, value: "pending" },
            { label: `완료 ${data?.counts.answered ?? ""}`, value: "answered" },
          ]} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className="adm-select" aria-label="문의 유형" value={category} onChange={e => setCategory(e.target.value as "" | InquiryCategory)}>
              <option value="">전체 유형</option>
              {(Object.keys(CATEGORY_LABEL) as InquiryCategory[]).map(k => <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>)}
            </select>
            <SearchInput label="문의 검색" placeholder="문의 검색 (제목 · 회원 · Q-번호)" value={q} onChange={setQ} />
          </div>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th>번호</th><th>유형</th><th>제목</th><th>회원</th><th className="adm-hide-m">접수 일시</th><th>상태</th><th className="adm-hide-m">대기 시간</th><th></th></tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map(r => {
                const wait = r.status === "pending";
                return (
                  <tr key={r.id} className="clickable" onClick={() => navigate(`/inquiries/${r.id}`)}>
                    <td className="muted nowrap">{r.no}</td>
                    <td className="nowrap">{CATEGORY_LABEL[r.category]}</td>
                    <td><Link to={`/inquiries/${r.id}`} style={{ color: "#102A56", textDecoration: "none", fontWeight: 600 }} onClick={e => e.stopPropagation()}>{r.title}</Link></td>
                    <td className="nowrap">{r.user?.name ?? "탈퇴 회원"}</td>
                    <td className="muted nowrap adm-hide-m">{fmtDate(r.created_at, true)}</td>
                    <td><span className={`adm-badge ${wait ? "orange" : "ok"}`}>{wait ? "대기" : "답변 완료"}</span></td>
                    <td className="nowrap adm-hide-m">{wait && <span style={{ fontSize: 12, fontWeight: 700, color: "#B95E00" }}>{ageText(r.created_at)} 경과</span>}</td>
                    <td><Link to={`/inquiries/${r.id}`} style={{ fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }} onClick={e => e.stopPropagation()}>{wait ? "답변하기" : "보기"}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && data && data.items.length === 0 && <div className="adm-empty">{q ? "검색 결과가 없어요." : "해당 상태의 문의가 없어요."}</div>}
        {data && data.pages > 1 && (
          <div className="adm-pager">
            <button type="button" className="adm-btn sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</button>
            <span style={{ fontSize: 13, color: "#5F7290", alignSelf: "center" }}>{data.page} / {data.pages} · 총 {data.total}건</span>
            <button type="button" className="adm-btn sm" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>다음</button>
          </div>
        )}
      </section>
    </>
  );
}
