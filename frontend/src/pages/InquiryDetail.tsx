// ★ v18.43 — 고객 문의 상세 · 답변 (DESIGN-CANVAS ADMIN_INQUIRY_DETAIL)
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CATEGORY_LABEL, answerInquiry, getInquiry, type InquiryDetail as Detail } from "../api/operator";
import Icon from "../components/Icon";
import { PageHeader, errorMessage, fmtDate, useToast } from "../components/ui";
import logo from "../assets/icons/logo.png";

const MAX = 2000;

// 디자인의 "자주 쓰는 답변"
const PRESETS = [
  { n: "확인 후 안내", t: "안녕하세요, 현장메이트입니다.\n문의하신 내용을 확인하고 있어요. 확인되는 대로 다시 안내드릴게요." },
  { n: "오류 수정 예정", t: "안녕하세요, 현장메이트입니다.\n불편을 드려 죄송합니다. 말씀하신 오류를 확인했고 다음 업데이트에서 수정될 예정이에요." },
  { n: "사용 방법 안내", t: "안녕하세요, 현장메이트입니다.\n해당 기능은 [메뉴 경로]에서 이용하실 수 있어요." },
];

export default function InquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [item, setItem] = useState<Detail | null>(null);
  const [answer, setAnswer] = useState("");
  const [notify, setNotify] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSent, setJustSent] = useState<null | boolean>(null); // 방금 등록: 알림 보냈는지

  const load = useCallback(() => {
    getInquiry(Number(id))
      .then(d => { setItem(d); setAnswer(d.answer ?? ""); setEditing(d.status !== "answered"); })
      .catch(e => { toast(errorMessage(e, "문의를 불러오지 못했어요."), true); navigate("/inquiries"); });
  }, [id, navigate, toast]);
  useEffect(() => { setJustSent(null); load(); }, [load]);

  const submit = async () => {
    if (!item || !answer.trim()) { toast("답변 내용을 입력해주세요.", true); return; }
    setSaving(true);
    try {
      const r = await answerInquiry(item.id, answer.trim(), notify);
      setItem({ ...item, status: "answered", answer: r.answer, answered_at: r.answered_at });
      setJustSent(r.notified);
      setEditing(false);
      toast(item.status === "answered" ? "답변을 수정했어요." : "답변을 등록했어요.");
    } catch (e) {
      toast(errorMessage(e, "답변을 등록하지 못했어요."), true);
    } finally {
      setSaving(false);
    }
  };

  if (!item) return <div className="adm-empty">불러오는 중…</div>;
  const answered = item.status === "answered";
  const m = item.member;

  const kv = (label: string, value: string | number | null | undefined) => (
    <div className="adm-kv"><span style={{ width: 70 }}>{label}</span><span style={{ fontWeight: 500 }}>{value ?? "-"}</span></div>
  );

  return (
    <>
      <PageHeader
        crumbs={[{ label: "고객 문의", to: "/inquiries" }, { label: item.no }]}
        title="문의 상세"
        actions={<Link to="/inquiries" className="adm-btn">목록으로</Link>}
      />

      <div className="adm-cols">
        <div className="adm-col-main">
          <section className="adm-card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="adm-badge">{CATEGORY_LABEL[item.category]}</span>
              <span className={`adm-badge ${answered ? "ok" : "orange"}`}>{answered ? "답변 완료" : "대기"}</span>
              <span style={{ fontSize: 12, color: "#5F7290" }}>{item.no} · {fmtDate(item.created_at, true)} 접수</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{item.title}</h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-line" }}>{item.content}</p>
            {item.files.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {item.files.map((f, i) => (
                  <a key={f} href={f} target="_blank" rel="noreferrer" aria-label={`첨부 ${i + 1} 크게 보기`}>
                    <img src={f} alt={`첨부 ${i + 1}`} style={{ width: 140, height: 96, objectFit: "cover", borderRadius: 10, border: "1px solid #E3ECF6", display: "block" }} />
                  </a>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "12px 14px", borderRadius: 10, background: "#F7FAFD", fontSize: 12, color: "#5F7290" }}>
              <span>앱 버전 <b style={{ color: "#102A56" }}>{item.app_version ? `v${item.app_version}` : "-"}</b></span>
              <span>기기 <b style={{ color: "#102A56" }}>{item.device ?? "-"}</b></span>
              <span>알림 수신 <b style={{ color: "#102A56" }}>{item.push_enabled == null ? "-" : item.push_enabled ? "허용" : "꺼짐"}</b></span>
              {item.helpful != null && <span>답변 평가 <b style={{ color: "#102A56" }}>{item.helpful ? "도움이 됐어요" : "더 궁금해요"}</b></span>}
            </div>
          </section>

          {editing ? (
            <section className="adm-card" style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <h2 className="adm-sec-title">{answered ? "답변 수정" : "답변 쓰기"}</h2>
                <span style={{ fontSize: 12, color: "#5F7290" }}>{answer.length} / {MAX}</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#5F7290", marginRight: 2 }}>자주 쓰는 답변</span>
                {PRESETS.map(p => <button key={p.n} type="button" className="adm-pill" onClick={() => setAnswer(p.t)}>{p.n}</button>)}
              </div>
              <textarea className="adm-textarea" rows={8} maxLength={MAX} aria-label="답변 내용" placeholder="회원에게 보낼 답변을 입력하세요"
                value={answer} onChange={e => setAnswer(e.target.value)} style={{ borderRadius: 12, padding: "14px 16px" }} />
              {!answered && (
                <button type="button" className="adm-check" onClick={() => setNotify(v => !v)} aria-pressed={notify}>
                  <span className={`box${notify ? " on" : ""}`}>{notify && <Icon name="check" size={12} width={2.6} />}</span>
                  답변 등록 시 회원에게 앱 푸시 알림 보내기
                  {!item.notify && <span style={{ color: "#B95E00" }}>(회원이 답변 알림을 받지 않기로 했어요)</span>}
                </button>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                {answered && <button type="button" className="adm-btn" onClick={() => { setAnswer(item.answer ?? ""); setEditing(false); }}>취소</button>}
                <button type="button" className="adm-btn primary" disabled={saving} onClick={submit}>
                  <Icon name="send" size={16} />{answered ? "수정 저장" : "답변 등록"}
                </button>
              </div>
            </section>
          ) : (
            <section className="adm-card" style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src={logo} alt="현장메이트" width={32} height={32} style={{ objectFit: "contain" }} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>운영자 답변</span>
                  <span style={{ fontSize: 12, color: "#5F7290" }}>
                    {justSent !== null ? `방금 등록${justSent ? " · 회원에게 알림 발송됨" : ""}` : `${fmtDate(item.answered_at, true)} 등록`}
                  </span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-line" }}>{item.answer}</p>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="adm-btn" onClick={() => setEditing(true)}><Icon name="edit" size={16} />답변 수정</button>
              </div>
            </section>
          )}
        </div>

        <div className="adm-col-side">
          <section className="adm-card">
            <h2 className="adm-sec-title">문의한 회원</h2>
            {!m ? <span style={{ fontSize: 13, color: "#5F7290" }}>탈퇴한 회원이에요.</span> : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="adm-avatar" style={{ width: 44, height: 44, fontSize: 16, background: "#FFE3C2", color: "#B95E00" }}>{m.name.charAt(0)}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{m.name}</span>
                    <span style={{ fontSize: 12, color: "#5F7290" }}>{m.email}</span>
                  </div>
                </div>
                <div>
                  {kv("휴대폰", m.phone)}
                  {kv("가입일", fmtDate(m.joined_at))}
                  {kv("소속 팀", m.team ?? "개인")}
                  {kv("지역", m.region)}
                  {kv("이전 문의", `${item.previous_count}건`)}
                </div>
              </>
            )}
          </section>
          {item.previous.length > 0 && (
            <section className="adm-card">
              <h2 className="adm-sec-title">이 회원의 이전 문의</h2>
              <div>
                {item.previous.map(p => (
                  <Link key={p.id} to={`/inquiries/${p.id}`} style={{ display: "flex", flexDirection: "column", gap: 3, padding: "10px 0", borderBottom: "1px solid #EDF3FA", textDecoration: "none", color: "#102A56" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</span>
                    <span style={{ fontSize: 12, color: "#5F7290" }}>{fmtDate(p.created_at)} · {p.status === "answered" ? "답변 완료" : "대기"}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
