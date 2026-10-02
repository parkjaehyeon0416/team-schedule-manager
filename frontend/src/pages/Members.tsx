// ★ v18.41 — 회원 관리 (디자인 없음 → ADMIN_NOTICE_LIST와 같은 스타일로 구성)
//   목록(구분 탭·검색·페이지) + 오른쪽 상세 패널(활동 요약·소속 팀·계정 정지/해제)
import { useCallback, useEffect, useState } from "react";
import {
  getMember, getMembers, suspendMember, unsuspendMember, type MemberDetail, type MemberPage,
} from "../api/admin";
import Icon from "../components/Icon";
import { ConfirmModal, PageHeader, SearchInput, Segmented, errorMessage, fmtDate, useToast } from "../components/ui";

type Tab = "all" | "team" | "freelancer" | "suspended";

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = window.setTimeout(() => setV(value), ms); return () => window.clearTimeout(t); }, [value, ms]);
  return v;
}

export default function Members() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MemberPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const query = useDebounced(q);

  const load = useCallback(() => {
    setLoading(true);
    getMembers({
      q: query || undefined,
      type: tab === "team" || tab === "freelancer" ? tab : undefined,
      status: tab === "suspended" ? "suspended" : undefined,
      page,
    })
      .then(setData)
      .catch(e => toast(errorMessage(e, "회원 목록을 불러오지 못했어요."), true))
      .finally(() => setLoading(false));
  }, [query, tab, page, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [query, tab]);

  return (
    <>
      <PageHeader crumbs={[{ label: "회원" }, { label: "회원 관리" }]} title="회원 관리" />

      <section className="adm-card">
        <div className="adm-toolbar">
          <Segmented<Tab> width={420} value={tab} onChange={setTab} items={[
            { label: `전체 ${data?.counts.all ?? ""}`, value: "all" },
            { label: "팀 소속", value: "team" },
            { label: "개인", value: "freelancer" },
            { label: `정지 ${data?.counts.suspended ?? ""}`, value: "suspended" },
          ]} />
          <SearchInput label="회원 검색" placeholder="이름 · 이메일 · 전화번호" value={q} onChange={setQ} />
        </div>
        <div className="adm-info">
          <span style={{ display: "flex", marginTop: 1 }}><Icon name="info" size={16} /></span>
          <span>회원을 누르면 활동 요약을 볼 수 있어요. 계정을 정지하면 바로 로그아웃되고, 해제할 때까지 로그인할 수 없어요.</span>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th>회원</th><th>이메일</th><th className="adm-hide-m">전화번호</th><th>가입 방식</th><th>소속 팀</th><th className="adm-hide-m">주요 공정</th><th className="adm-hide-m">지역</th><th>가입일</th><th>상태</th></tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map(m => (
                <tr key={m.id} className="clickable" onClick={() => setOpenId(m.id)}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="adm-avatar">{m.name.charAt(0)}</div>
                      <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{m.name}</span>
                    </div>
                  </td>
                  <td className="muted">{m.email}</td>
                  <td className="muted nowrap adm-hide-m">{m.phone || "-"}</td>
                  <td className="muted">{m.signup_method}</td>
                  <td className="muted">{m.teams.length ? m.teams.join(", ") : "개인"}</td>
                  <td className="muted adm-hide-m">{m.specialty || "-"}</td>
                  <td className="muted adm-hide-m">{m.service_area || "-"}</td>
                  <td className="muted nowrap">{fmtDate(m.created_at)}</td>
                  <td><span className={`adm-badge ${m.suspended ? "red" : "ok"}`}>{m.suspended ? "정지" : "정상"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && data && data.items.length === 0 && <div className="adm-empty">{q ? "검색 결과가 없어요." : "해당하는 회원이 없어요."}</div>}
        {data && data.pages > 1 && (
          <div className="adm-pager">
            <button type="button" className="adm-btn sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</button>
            <span style={{ fontSize: 13, color: "#5F7290", alignSelf: "center" }}>{data.page} / {data.pages} · 총 {data.total}명</span>
            <button type="button" className="adm-btn sm" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>다음</button>
          </div>
        )}
      </section>

      {openId && <MemberPanel id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </>
  );
}

function MemberPanel({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [m, setM] = useState<MemberDetail | null>(null);
  const [askSuspend, setAskSuspend] = useState(false);
  const [askUnsuspend, setAskUnsuspend] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    getMember(id).then(setM).catch(e => { toast(errorMessage(e, "회원 정보를 불러오지 못했어요."), true); onClose(); });
  }, [id, onClose, toast]);
  useEffect(() => { load(); }, [load]);

  const doSuspend = async () => {
    if (!reason.trim()) { toast("정지 사유를 입력해주세요.", true); return; }
    setAskSuspend(false);
    try {
      const r = await suspendMember(id, reason.trim());
      toast(r.message);
      setReason("");
      load();
      onChanged();
    } catch (e) {
      toast(errorMessage(e, "정지하지 못했어요."), true);
    }
  };

  const doUnsuspend = async () => {
    setAskUnsuspend(false);
    try {
      const r = await unsuspendMember(id);
      toast(r.message);
      load();
      onChanged();
    } catch (e) {
      toast(errorMessage(e, "해제하지 못했어요."), true);
    }
  };

  const kv = (label: string, value: string | number | null | undefined) => (
    <div className="adm-kv"><span>{label}</span><span style={{ minWidth: 0, wordBreak: "break-all" }}>{value ?? "-"}</span></div>
  );

  return (
    <div className="adm-panel-bg" onClick={onClose}>
      <aside className="adm-panel" aria-label="회원 상세" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>회원 상세</h2>
          <button type="button" aria-label="닫기" onClick={onClose} style={{ border: 0, background: "transparent", cursor: "pointer", color: "#5F7290" }}>
            <Icon name="close" size={20} />
          </button>
        </div>

        {!m ? <div className="adm-empty">불러오는 중…</div> : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="adm-avatar" style={{ width: 48, height: 48, fontSize: 18 }}>{m.name.charAt(0)}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <span style={{ fontSize: 17, fontWeight: 800 }}>{m.name}</span>
                <span className={`adm-badge ${m.suspended_at ? "red" : "ok"}`} style={{ alignSelf: "flex-start" }}>{m.suspended_at ? "정지된 계정" : "정상"}</span>
              </div>
            </div>

            {m.suspended_at && (
              <div className="adm-info" style={{ background: "#FFF2F2", color: "#E5484D" }}>
                <span style={{ display: "flex", marginTop: 1 }}><Icon name="ban" size={16} /></span>
                <span>{fmtDate(m.suspended_at, true)} 정지 · 사유: {m.suspended_reason}</span>
              </div>
            )}

            <div>
              {kv("이메일", m.email)}
              {kv("전화번호", m.phone)}
              {kv("가입 방식", m.signup_method)}
              {kv("가입일", fmtDate(m.created_at, true))}
              {kv("최근 접속", m.last_active_at ? fmtDate(m.last_active_at, true) : "기록 없음")}
              {kv("주요 공정", m.specialty)}
              {kv("활동 지역", m.service_area)}
              {kv("경력", m.years_experience ? `${m.years_experience}년` : null)}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>활동 요약</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {[
                  ["참여 일정", m.activity.schedules, "건"], ["등록 현장", m.activity.sites, "곳"],
                  ["견적서", m.activity.quotes, "건"], ["푸시 기기", m.activity.push_devices, "대"],
                ].map(([label, v, unit]) => (
                  <div key={label as string} style={{ border: "1px solid #E3ECF6", borderRadius: 12, padding: "10px 12px" }}>
                    <div style={{ fontSize: 12, color: "#5F7290" }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{v}<small style={{ fontSize: 12, color: "#5F7290", marginLeft: 2 }}>{unit}</small></div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>소속 팀</span>
              {m.teams.length === 0 ? <span style={{ fontSize: 13, color: "#5F7290" }}>소속된 팀이 없어요 (개인 사용자)</span> : m.teams.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>{t.name}</span>
                  {t.is_leader && <span className="adm-badge blue">팀장</span>}
                </div>
              ))}
            </div>

            <div style={{ marginTop: "auto", paddingTop: 8 }}>
              {m.suspended_at ? (
                <button type="button" className="adm-btn primary" style={{ width: "100%" }} onClick={() => setAskUnsuspend(true)}>
                  <Icon name="check" size={16} />정지 해제
                </button>
              ) : (
                <button type="button" className="adm-btn danger" style={{ width: "100%" }} onClick={() => setAskSuspend(true)}>
                  <Icon name="ban" size={16} />계정 정지
                </button>
              )}
            </div>
          </>
        )}
      </aside>

      {askSuspend && m && (
        <ConfirmModal danger title={`${m.name}님 계정을 정지할까요?`} confirmLabel="정지" onCancel={() => setAskSuspend(false)} onConfirm={doSuspend}
          body="정지하면 바로 로그아웃되고, 해제할 때까지 앱에 로그인할 수 없어요.">
          <textarea className="adm-textarea" rows={3} maxLength={255} placeholder="정지 사유 (필수, 운영 기록용)" value={reason}
            onChange={e => setReason(e.target.value)} onClick={e => e.stopPropagation()} autoFocus />
        </ConfirmModal>
      )}
      {askUnsuspend && m && (
        <ConfirmModal title={`${m.name}님 정지를 해제할까요?`} confirmLabel="해제" onCancel={() => setAskUnsuspend(false)} onConfirm={doUnsuspend}
          body="해제하면 다시 앱에 로그인할 수 있어요." />
      )}
    </div>
  );
}
