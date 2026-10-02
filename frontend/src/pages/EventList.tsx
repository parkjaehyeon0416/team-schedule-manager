// ★ v18.41 — 이벤트 관리 목록 (DESIGN-CANVAS ADMIN_EVENT_LIST)
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteNotice, getAdminNotices, type AdminNotice } from "../api/notice";
import Icon from "../components/Icon";
import { ConfirmModal, PageHeader, SearchInput, Segmented, errorMessage, fmtDate, useToast } from "../components/ui";
import iconGift from "../assets/icons/gift.png";

type Run = "진행중" | "예정" | "종료";
type Tab = "all" | Run;

export function runState(n: Pick<AdminNotice, "starts_at" | "ends_at">): Run {
  const today = new Date().toISOString().slice(0, 10);
  if (n.starts_at && today < n.starts_at.slice(0, 10)) return "예정";
  if (n.ends_at && today > n.ends_at.slice(0, 10)) return "종료";
  return "진행중";
}
const RUN_BADGE: Record<Run, string> = { 진행중: "orange", 예정: "blue", 종료: "" };

export function period(n: Pick<AdminNotice, "starts_at" | "ends_at">): string {
  if (!n.starts_at && !n.ends_at) return "-";
  const s = n.starts_at ? fmtDate(n.starts_at) : "";
  const e = n.ends_at ? fmtDate(n.ends_at) : "";
  return `${s} ~ ${s.slice(0, 4) === e.slice(0, 4) ? e.slice(5) : e}`;
}

export default function EventList() {
  const toast = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdminNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [del, setDel] = useState<AdminNotice | null>(null);

  useEffect(() => {
    getAdminNotices("event")
      .then(setRows)
      .catch(e => toast(errorMessage(e, "목록을 불러오지 못했어요."), true))
      .finally(() => setLoading(false));
  }, [toast]);

  const list = useMemo(() => rows
    .filter(r => tab === "all" || runState(r) === tab)
    .filter(r => !q.trim() || r.title.toLowerCase().includes(q.trim().toLowerCase())), [rows, tab, q]);

  const onDelete = async () => {
    if (!del) return;
    const target = del;
    setDel(null);
    try {
      await deleteNotice(target.id);
      setRows(prev => prev.filter(x => x.id !== target.id));
      toast("삭제했어요.");
    } catch (e) {
      toast(errorMessage(e, "삭제하지 못했어요."), true);
    }
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "콘텐츠" }, { label: "이벤트 관리" }]}
        title="이벤트 관리"
        actions={<Link to="/events/new" className="adm-btn primary"><Icon name="plus" size={17} />새 이벤트 만들기</Link>}
      />

      <section className="adm-card">
        <div className="adm-toolbar">
          <Segmented<Tab> width={340} value={tab} onChange={setTab} items={[
            { label: "전체", value: "all" }, { label: "진행중", value: "진행중" }, { label: "예정", value: "예정" }, { label: "종료", value: "종료" },
          ]} />
          <SearchInput label="이벤트 검색" placeholder="이벤트명으로 검색" value={q} onChange={setQ} />
        </div>
        <div className="adm-info">
          <span style={{ display: "flex", marginTop: 1 }}><Icon name="info" size={16} /></span>
          <span>진행 상태는 이벤트 기간에 따라 자동으로 바뀌어요. 게시한 이벤트만 앱에 보여요.</span>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th>이벤트</th><th>기간</th><th>진행</th><th>게시 상태</th><th>조회</th><th>관리</th></tr>
            </thead>
            <tbody>
              {list.map(r => {
                const run = runState(r);
                return (
                  <tr key={r.id} style={{ opacity: run === "종료" ? 0.6 : 1 }}>
                    <td>
                      <Link to={`/events/${r.id}`} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#102A56" }}>
                        <span style={{ width: 64, height: 44, borderRadius: 8, background: "#FFF4E5", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                          {r.banner_path
                            ? <img src={`/storage/${r.banner_path}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <img src={iconGift} alt="" width={32} height={32} style={{ objectFit: "contain" }} />}
                        </span>
                        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                          <span style={{ fontWeight: 600 }}>{r.title}</span>
                          <span style={{ fontSize: 12, color: "#5F7290" }}>버튼: {r.cta_label || "없음"}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="muted nowrap">{period(r)}</td>
                    <td><span className={`adm-badge ${RUN_BADGE[run]}`}>{run}</span></td>
                    <td><span className={`adm-badge${r.published_at ? " ok" : ""}`}>{r.published_at ? "게시" : "임시저장"}</span></td>
                    <td className="muted">{r.view_count.toLocaleString("ko-KR")}</td>
                    <td className="nowrap">
                      <button type="button" className="adm-link-btn" style={{ marginRight: 12 }} onClick={() => navigate(`/events/${r.id}`)}>수정</button>
                      <button type="button" className="adm-link-btn danger" onClick={() => setDel(r)}>삭제</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && list.length === 0 && <div className="adm-empty">{q ? "검색 결과가 없어요." : "해당 상태의 이벤트가 없어요."}</div>}
      </section>

      {del && (
        <ConfirmModal danger title="이벤트를 삭제할까요?" confirmLabel="삭제" onCancel={() => setDel(null)} onConfirm={onDelete}
          body={<>“{del.title}”<br />삭제하면 앱에서 바로 사라지고 되돌릴 수 없어요.</>} />
      )}
    </>
  );
}
