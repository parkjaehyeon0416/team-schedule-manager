// ★ v18.41 — 회원 관리. ★ v18.56 — 디자인 ADMIN_MEMBERS(·_EMPTY·_DETAIL·_SUSPEND·_SUSPEND_ERR·_SUSPENDED·_M)대로 다시 구성
//   목록(구분 탭·검색·페이지, PC 표 / 모바일 카드) + 오른쪽 상세 패널(활동 요약·소속 팀·계정 정지/해제)
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  getMember, getMembers, suspendMember, unsuspendMember, type MemberDetail, type MemberPage,
} from "../api/admin";
import Icon from "../components/Icon";
import { PageHeader, errorMessage, fmtDate, useToast } from "../components/ui";
import profile from "../assets/icons/profile.png";
import people from "../assets/icons/people.png";

type Tab = "all" | "team" | "freelancer" | "suspended";
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "전체" }, { key: "team", label: "팀 소속" }, { key: "freelancer", label: "개인" }, { key: "suspended", label: "정지" },
];
// 가입 방식 배지 [배경, 글자, 표시, 테두리]
const VIA: Record<string, [string, string, string, string]> = {
  카카오: ["#FEE500", "#191919", "K", "0"], 네이버: ["#03C75A", "#FFFFFF", "N", "0"], 구글: ["#FFFFFF", "#4285F4", "G", "1px solid #DDE3EA"],
  애플: ["#111111", "#FFFFFF", "A", "0"], 이메일: ["#EAF4FF", "#0A6CE0", "@", "0"],
};
const AVB = ["#FFE3C2", "#D6ECFF", "#D9F6F1", "#ECE5FF", "#FFE0E6"];
const AVT = ["#B95E00", "#0A6CE0", "#0B8574", "#6B4FD8", "#C23A5A"];
const BAN = '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>';

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = window.setTimeout(() => setV(value), ms); return () => window.clearTimeout(t); }, [value, ms]);
  return v;
}

function BanIcon({ size = 17 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BAN }} />;
}

function Avatar({ id, name, size = 32 }: { id: number; name: string; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size * 0.41), fontWeight: 700, flexShrink: 0, background: AVB[id % 5], color: AVT[id % 5] }}>
      {name.charAt(0)}
    </span>
  );
}

function Via({ method }: { method: string }) {
  const v = VIA[method] ?? VIA["이메일"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, boxSizing: "border-box", background: v[0], color: v[1], border: v[3] }}>{v[2]}</span>
      {method}
    </span>
  );
}

function Status({ suspended }: { suspended: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", height: 24, padding: "0 9px", borderRadius: 7, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", background: suspended ? "#FFECEC" : "#E2F8F4", color: suspended ? "#E5484D" : "#0B8574" }}>
      {suspended ? "정지" : "정상"}
    </span>
  );
}

const pagerBtn = (enabled: boolean): CSSProperties => ({
  height: 36, padding: "0 14px", borderRadius: 9, font: "inherit", fontSize: 13, fontWeight: 700, border: "1px solid #DDEAF7", background: "#FFFFFF",
  color: enabled ? "#3B4F70" : "#B4C2D4", cursor: enabled ? "pointer" : "not-allowed",
});

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

  const items = data?.items ?? [];
  const empty = !loading && data !== null && items.length === 0;
  const pages = Math.max(1, data?.pages ?? 1);

  return (
    <>
      <PageHeader crumbs={[{ label: "회원" }, { label: "회원 관리" }]} title="회원 관리" />

      <section className="adm-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div role="tablist" aria-label="회원 구분" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TABS.map(t => {
              const on = tab === t.key;
              const n = t.key === "all" ? data?.counts.all : t.key === "suspended" ? data?.counts.suspended : undefined;
              return (
                <button key={t.key} type="button" role="tab" aria-selected={on} onClick={() => setTab(t.key)}
                  style={{ height: 36, padding: "0 14px", borderRadius: 18, font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", fontVariantNumeric: "tabular-nums",
                    background: on ? "#102A56" : "#FFFFFF", color: on ? "#FFFFFF" : "#3B4F70", border: `1px solid ${on ? "#102A56" : "#DDEAF7"}` }}>
                  {t.label}{n !== undefined ? ` ${n.toLocaleString()}` : ""}
                </button>
              );
            })}
          </div>
          <div style={{ flex: "0 1 360px", minWidth: 0 }}>
            <div style={{ height: 42, borderRadius: 10, border: "1px solid #DDEAF7", background: "#FFFFFF", display: "flex", alignItems: "center", gap: 8, padding: "0 12px", boxSizing: "border-box" }}>
              <span style={{ color: "#8FA3BF", display: "flex" }}><Icon name="search" /></span>
              <input type="search" aria-label="회원 검색" value={q} onChange={e => setQ(e.target.value)} placeholder="이름 · 이메일 · 전화번호"
                style={{ flex: "1 1 0", minWidth: 0, border: 0, outline: 0, background: "transparent", font: "inherit", fontSize: 14, color: "#102A56" }} />
              {q && (
                <button type="button" onClick={() => setQ("")} aria-label="검색어 지우기"
                  style={{ width: 28, height: 28, border: 0, borderRadius: "50%", background: "#EEF2F7", color: "#5F7290", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "12px 14px", borderRadius: 12, background: "#F3F9FF", fontSize: 13, color: "#3B4F70", lineHeight: 1.6 }}>
          <span style={{ color: "#0A6CE0", display: "flex", marginTop: 2 }}><Icon name="info" size={16} /></span>
          <span>회원을 누르면 활동 요약을 볼 수 있어요. 계정을 정지하면 바로 로그아웃되고, 해제할 때까지 로그인할 수 없어요.</span>
        </div>

        {!empty && (
          <>
            <div className="op-table" style={{ overflowX: "auto", border: "1px solid #E3ECF6", borderRadius: 12 }}>
              <table className="adm-table">
                <thead>
                  <tr><th>회원</th><th>이메일</th><th>전화번호</th><th>가입 방식</th><th>소속 팀</th><th>주요 공정</th><th>지역</th><th>가입일</th><th>상태</th></tr>
                </thead>
                <tbody>
                  {items.map(m => (
                    <tr key={m.id} onClick={() => setOpenId(m.id)} style={{ cursor: "pointer", background: openId === m.id ? "#F3F9FF" : "#FFFFFF" }}>
                      <td>
                        <button type="button" onClick={e => { e.stopPropagation(); setOpenId(m.id); }} aria-label={`${m.name} 회원 상세 보기`}
                          style={{ border: 0, background: "transparent", padding: 0, font: "inherit", color: "#102A56", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                          <Avatar id={m.id} name={m.name} /><b style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{m.name}</b>
                        </button>
                      </td>
                      <td className="muted">{m.email}</td>
                      <td className="nowrap" style={{ fontVariantNumeric: "tabular-nums" }}>{m.phone || "-"}</td>
                      <td><Via method={m.signup_method} /></td>
                      <td>{m.teams.length ? <span className="nowrap">{m.teams.join(", ")}</span> : <span style={{ color: "#8FA3BF" }}>개인</span>}</td>
                      <td className="nowrap">{m.specialty || "-"}</td>
                      <td className="muted nowrap">{m.service_area || "-"}</td>
                      <td className="muted nowrap" style={{ fontVariantNumeric: "tabular-nums" }}>{fmtDate(m.created_at)}</td>
                      <td><Status suspended={!!m.suspended} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="op-cards" style={{ gap: 8 }}>
              {items.map(m => (
                <button key={m.id} type="button" onClick={() => setOpenId(m.id)} aria-label={`${m.name} 회원 상세 보기`}
                  style={{ textAlign: "left", font: "inherit", color: "#102A56", cursor: "pointer", border: "1px solid #E3ECF6", borderRadius: 14, padding: 14, background: "#FFFFFF", display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                    <Avatar id={m.id} name={m.name} size={38} />
                    <span style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                      <b style={{ fontSize: 15 }}>{m.name}</b>
                      <span style={{ fontSize: 12, color: "#5F7290", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</span>
                    </span>
                    <Status suspended={!!m.suspended} />
                  </span>
                  <span style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#5F7290", alignItems: "center" }}>
                    <Via method={m.signup_method} />
                    <span>{m.teams.length ? <span className="nowrap">{m.teams.join(", ")}</span> : <span style={{ color: "#8FA3BF" }}>개인</span>}</span>
                    <span>가입 {fmtDate(m.created_at)}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        {loading && !data && <div className="adm-empty">불러오는 중…</div>}

        {empty && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "56px 16px", border: "1px dashed #D5DFEB", borderRadius: 12, textAlign: "center" }}>
            <img src={profile} alt="" width={64} height={64} style={{ objectFit: "contain" }} />
            <b style={{ fontSize: 15 }}>{q ? "검색 결과가 없어요." : "해당하는 회원이 없어요."}</b>
            {q && <span style={{ fontSize: 13, color: "#5F7290" }}>이름, 이메일, 전화번호 중 하나로 다시 검색해 보세요.</span>}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <button type="button" style={pagerBtn(page > 1)} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</button>
          <span style={{ fontSize: 13, color: "#5F7290", fontVariantNumeric: "tabular-nums" }}>{page} / {pages} · 총 {(data?.total ?? 0).toLocaleString()}명</span>
          <button type="button" style={pagerBtn(page < pages)} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>다음</button>
        </div>
      </section>

      {openId && <MemberPanel id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </>
  );
}

function MemberPanel({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [m, setM] = useState<MemberDetail | null>(null);
  const [ask, setAsk] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonErr, setReasonErr] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getMember(id).then(setM).catch(e => { toast(errorMessage(e, "회원 정보를 불러오지 못했어요."), true); onClose(); });
  }, [id, onClose, toast]);
  useEffect(() => { load(); }, [load]);

  const doSuspend = async () => {
    if (!m) return;
    if (!reason.trim()) { setReasonErr(true); return; }
    setBusy(true);
    try {
      await suspendMember(id, reason.trim());
      toast(`${m.name}님 계정을 정지했어요`);
      setAsk(false);
      setReason("");
      load();
      onChanged();
    } catch (e) {
      toast(errorMessage(e, "정지하지 못했어요."), true);
    } finally {
      setBusy(false);
    }
  };

  // 디자인대로 확인 창 없이 바로 해제
  const doUnsuspend = async () => {
    if (!m || busy) return;
    setBusy(true);
    try {
      await unsuspendMember(id);
      toast(`${m.name}님 계정 정지를 해제했어요`);
      load();
      onChanged();
    } catch (e) {
      toast(errorMessage(e, "해제하지 못했어요."), true);
    } finally {
      setBusy(false);
    }
  };

  const kv: [string, string, boolean?][] = m ? [
    ["이메일", m.email], ["전화번호", m.phone || "-"], ["가입 방식", m.signup_method], ["가입일", fmtDate(m.created_at)],
    ["최근 접속", m.last_active_at ? fmtDate(m.last_active_at, true) : "기록 없음", !m.last_active_at],
    ["주요 공정", m.specialty || "-"], ["활동 지역", m.service_area || "-"], ["경력", m.years_experience ? `${m.years_experience}년` : "-"],
  ] : [];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", justifyContent: "flex-end" }}>
      <button type="button" onClick={onClose} aria-label="상세 닫기" style={{ position: "absolute", inset: 0, border: 0, background: "rgba(16,42,86,0.28)", cursor: "pointer" }} />
      <aside role="dialog" aria-label="회원 상세"
        style={{ position: "relative", width: "min(440px, 100%)", height: "100%", background: "#FFFFFF", boxShadow: "-12px 0 40px rgba(16,42,86,0.16)", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #EDF3FA" }}>
          <b style={{ fontSize: 16 }}>회원 상세</b>
          <button type="button" onClick={onClose} aria-label="닫기"
            style={{ width: 40, height: 40, border: 0, background: "transparent", color: "#5F7290", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name="close" size={22} />
          </button>
        </div>

        {!m ? <div className="adm-empty">불러오는 중…</div> : (
          <>
            <div style={{ flex: "1 1 0", overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar id={m.id} name={m.name} size={48} />
                <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <b style={{ fontSize: 20 }}>{m.name}</b>
                  <span style={{ alignSelf: "flex-start", height: 22, padding: "0 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center",
                    background: m.suspended_at ? "#FFECEC" : "#E2F8F4", color: m.suspended_at ? "#E5484D" : "#0B8574" }}>
                    {m.suspended_at ? "정지된 계정" : "정상"}
                  </span>
                </span>
              </div>

              {m.suspended_at && (
                <div role="note" style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "12px 14px", borderRadius: 12, background: "#FFF2F2", border: "1px solid #FFD5D6", fontSize: 13, color: "#B4262B", lineHeight: 1.55 }}>
                  <span style={{ display: "flex", marginTop: 2, color: "#E5484D" }}><BanIcon size={16} /></span>
                  <span>{fmtDate(m.suspended_at)} 정지 · 사유: {m.suspended_reason}</span>
                </div>
              )}

              <dl style={{ margin: 0, display: "flex", flexDirection: "column" }}>
                {kv.map(([k, v, dim]) => (
                  <div key={k} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #EDF3FA", fontSize: 14 }}>
                    <dt style={{ width: 84, flexShrink: 0, color: "#5F7290" }}>{k}</dt>
                    <dd style={{ margin: 0, flex: "1 1 0", minWidth: 0, wordBreak: "break-all", fontWeight: 600, color: dim ? "#8FA3BF" : "#102A56" }}>{v}</dd>
                  </div>
                ))}
              </dl>

              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#3B4F70" }}>활동 요약</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                {([["참여 일정", m.activity.schedules, "건"], ["등록 현장", m.activity.sites, "곳"], ["견적서", m.activity.quotes, "건"], ["푸시 기기", m.activity.push_devices, "대"]] as const).map(([k, v, u]) => (
                  <div key={k} style={{ padding: 14, borderRadius: 12, background: "#F6F9FD", display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#5F7290", fontWeight: 600 }}>{k}</span>
                    <span style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{v}<span style={{ fontSize: 13, fontWeight: 600, color: "#5F7290", marginLeft: 2 }}>{u}</span></span>
                  </div>
                ))}
              </div>

              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#3B4F70" }}>소속 팀</h3>
              {m.teams.length === 0 ? (
                <div style={{ padding: 14, borderRadius: 10, background: "#F6F9FD", fontSize: 13, color: "#5F7290" }}>소속된 팀이 없어요 (개인 사용자)</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {m.teams.map(t => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid #E3ECF6", borderRadius: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: "#F2F7FE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <img src={people} alt="" width={25} height={25} style={{ objectFit: "contain" }} />
                      </div>
                      <span style={{ flex: "1 1 0", fontSize: 14, fontWeight: 600 }}>{t.name}</span>
                      {t.is_leader && <span style={{ display: "inline-flex", alignItems: "center", height: 24, padding: "0 9px", borderRadius: 7, background: "#E8F3FF", color: "#0A6CE0", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>팀장</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: "14px 20px 20px", borderTop: "1px solid #EDF3FA" }}>
              {m.suspended_at ? (
                <button type="button" onClick={doUnsuspend} disabled={busy}
                  style={{ height: 48, padding: "0 16px", borderRadius: 10, font: "inherit", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", background: "linear-gradient(180deg,#2492FF 0%,#0A6CE0 100%)", color: "#FFFFFF", border: 0, width: "100%", justifyContent: "center" }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 7.6-1.7" />
                  </svg>정지 해제
                </button>
              ) : (
                <button type="button" onClick={() => { setAsk(true); setReason(""); setReasonErr(false); }}
                  style={{ height: 48, padding: "0 16px", borderRadius: 10, font: "inherit", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", background: "#FFF2F2", color: "#E5484D", border: "1px solid #FFD5D6", width: "100%", justifyContent: "center" }}>
                  <BanIcon />계정 정지
                </button>
              )}
            </div>
          </>
        )}
      </aside>

      {ask && m && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(16,42,86,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div role="alertdialog" aria-label="계정 정지 확인" style={{ width: "100%", maxWidth: 440, background: "#FFFFFF", borderRadius: 18, padding: 26, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 20px 50px rgba(16,42,86,0.25)", boxSizing: "border-box" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "#FFECEC", display: "flex", alignItems: "center", justifyContent: "center", color: "#E5484D" }}><BanIcon size={24} /></div>
            <h2 style={{ margin: "4px 0 0", fontSize: 19, fontWeight: 800 }}>{m.name}님 계정을 정지할까요?</h2>
            <p style={{ margin: 0, fontSize: 14, color: "#5F7290", lineHeight: 1.6 }}>정지하면 바로 로그아웃되고, 해제할 때까지 앱에 로그인할 수 없어요.</p>
            <label htmlFor="sreason" style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>정지 사유</label>
            <textarea id="sreason" rows={3} maxLength={255} value={reason} autoFocus placeholder="예: 다른 회원에게 광고 문자를 반복 발송"
              onChange={e => { setReason(e.target.value); setReasonErr(false); }}
              style={{ border: `1px solid ${reasonErr ? "#E5484D" : reason ? "#7DBBFF" : "#DDEAF7"}`, borderRadius: 10, padding: 12, font: "inherit", fontSize: 14, color: "#102A56", resize: "none", outline: 0, lineHeight: 1.5 }} />
            {reasonErr && (
              <span role="alert" style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12, fontWeight: 600, color: "#E5484D" }}>
                <Icon name="info" size={13} color="#E5484D" width={2.2} />정지 사유를 입력해주세요.
              </span>
            )}
            <span style={{ fontSize: 12, color: "#5F7290" }}>사유는 회원 상세에 남고, 운영자만 볼 수 있어요.</span>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
              <button type="button" className="adm-btn" onClick={() => setAsk(false)}>취소</button>
              <button type="button" className="adm-btn danger" onClick={doSuspend} disabled={busy}><BanIcon />정지</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
