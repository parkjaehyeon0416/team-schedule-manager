// ★ v18.41 — 공지 관리 목록 (DESIGN-CANVAS ADMIN_NOTICE_LIST)
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteNotice, getAdminNotices, togglePin, type AdminNotice } from "../api/notice";
import Icon from "../components/Icon";
import { ConfirmModal, PageHeader, SearchInput, Segmented, errorMessage, fmtDate, useToast } from "../components/ui";

type Tab = "all" | "published" | "draft";

export default function NoticeList() {
  const toast = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdminNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [del, setDel] = useState<AdminNotice | null>(null);

  useEffect(() => {
    getAdminNotices("notice")
      .then(setRows)
      .catch(e => toast(errorMessage(e, "목록을 불러오지 못했어요."), true))
      .finally(() => setLoading(false));
  }, [toast]);

  const counts = {
    all: rows.length,
    published: rows.filter(r => r.published_at).length,
    draft: rows.filter(r => !r.published_at).length,
  };

  // 고정 공지 먼저, 그다음 최신순
  const list = useMemo(() => rows
    .filter(r => tab === "all" || (tab === "published" ? !!r.published_at : !r.published_at))
    .filter(r => !q.trim() || r.title.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || b.created_at.localeCompare(a.created_at)), [rows, tab, q]);

  const onPin = async (r: AdminNotice) => {
    try {
      const updated = await togglePin(r.id);
      setRows(prev => prev.map(x => (x.id === r.id ? { ...x, is_pinned: updated.is_pinned } : x)));
      toast(updated.is_pinned ? "중요 공지로 고정했어요." : "고정을 해제했어요.");
    } catch (e) {
      toast(errorMessage(e, "변경하지 못했어요."), true);
    }
  };

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
        crumbs={[{ label: "콘텐츠" }, { label: "공지 관리" }]}
        title="공지 관리"
        actions={<Link to="/notices/new" className="adm-btn primary"><Icon name="plus" size={17} />새 공지 작성</Link>}
      />

      <section className="adm-card">
        <div className="adm-toolbar">
          <Segmented<Tab> width={340} value={tab} onChange={setTab} items={[
            { label: `전체 ${counts.all}`, value: "all" },
            { label: `게시 ${counts.published}`, value: "published" },
            { label: `임시저장 ${counts.draft}`, value: "draft" },
          ]} />
          <SearchInput label="공지 검색" placeholder="제목으로 검색" value={q} onChange={setQ} />
        </div>
        <div className="adm-info">
          <span style={{ display: "flex", marginTop: 1 }}><Icon name="info" size={16} /></span>
          <span>임시저장한 공지는 앱에 보이지 않아요. 게시하면 바로 앱 공지 목록에 노출되고, 중요 고정 공지는 맨 위에 표시돼요.</span>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th>고정</th><th>제목</th><th>상태</th><th>조회</th><th>작성자</th><th>등록일</th><th>관리</th></tr>
            </thead>
            <tbody>
              {list.map(r => (
                <tr key={r.id}>
                  <td style={{ width: 56 }}>
                    <button type="button" className={`adm-pin${r.is_pinned ? " on" : ""}`} onClick={() => onPin(r)}
                      aria-label={r.is_pinned ? "중요 고정 해제" : "중요 공지로 고정"} title={r.is_pinned ? "중요 고정 해제" : "중요 공지로 고정"}>
                      <Icon name="pin" size={17} />
                    </button>
                  </td>
                  <td>
                    <Link to={`/notices/${r.id}`} style={{ color: "#102A56", textDecoration: "none", fontWeight: 600 }}>{r.title}</Link>
                  </td>
                  <td><span className={`adm-badge${r.published_at ? " ok" : ""}`}>{r.published_at ? "게시" : "임시저장"}</span></td>
                  <td className="muted">{r.view_count.toLocaleString("ko-KR")}</td>
                  <td className="muted">{r.author}</td>
                  <td className="muted nowrap">{fmtDate(r.published_at ?? r.created_at)}</td>
                  <td className="nowrap">
                    <button type="button" className="adm-link-btn" style={{ marginRight: 12 }} onClick={() => navigate(`/notices/${r.id}`)}>수정</button>
                    <button type="button" className="adm-link-btn danger" onClick={() => setDel(r)}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && list.length === 0 && <div className="adm-empty">{q ? "검색 결과가 없어요." : "해당 상태의 공지가 없어요."}</div>}
      </section>

      {del && (
        <ConfirmModal danger title="공지를 삭제할까요?" confirmLabel="삭제" onCancel={() => setDel(null)} onConfirm={onDelete}
          body={<>“{del.title}”<br />삭제하면 앱에서 바로 사라지고 되돌릴 수 없어요.</>} />
      )}
    </>
  );
}
