// ★ v18.43 — 문자 발송 (DESIGN-CANVAS ADMIN_SMS_SEND): 템플릿 선택 → 받는 사람 → 미리보기·발송, 아래 발송 기록
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  TARGET_LABEL, getSmsCampaigns, getSmsTemplates, previewSms, sendSms,
  type SmsCampaign, type SmsPreview, type SmsTarget, type SmsTemplate,
} from "../api/operator";
import Icon from "../components/Icon";
import { ConfirmModal, PageHeader, errorMessage, fmtDate, useToast } from "../components/ui";

const TARGETS: SmsTarget[] = ["all", "recent30", "inactive30"];
const STEP = { width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(180deg,#2492FF 0%,#0A6CE0 100%)", color: "#FFFFFF", fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as const;

export default function SmsSend() {
  const toast = useToast();
  const [templates, setTemplates] = useState<SmsTemplate[] | null>(null);
  const [tplId, setTplId] = useState<number | null>(null);
  const [target, setTarget] = useState<SmsTarget>("all");
  const [preview, setPreview] = useState<SmsPreview | null>(null);
  const [history, setHistory] = useState<SmsCampaign[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [sentNow, setSentNow] = useState(false);
  const [sending, setSending] = useState(false);

  const loadHistory = useCallback(() => { getSmsCampaigns().then(setHistory).catch(() => {}); }, []);

  useEffect(() => {
    getSmsTemplates()
      .then(list => { setTemplates(list); if (list.length) setTplId(list[0].id); })
      .catch(e => { toast(errorMessage(e, "템플릿을 불러오지 못했어요."), true); setTemplates([]); });
    loadHistory();
  }, [toast, loadHistory]);

  useEffect(() => {
    if (!tplId) { setPreview(null); return; }
    setSentNow(false);
    previewSms(tplId, target).then(setPreview).catch(e => toast(errorMessage(e, "미리보기를 만들지 못했어요."), true));
  }, [tplId, target, toast]);

  // 발송 중인 기록이 있으면 몇 초 뒤 다시 확인
  useEffect(() => {
    if (!history.some(h => h.status === "sending")) return;
    const t = window.setTimeout(loadHistory, 4000);
    return () => window.clearTimeout(t);
  }, [history, loadHistory]);

  const tpl = templates?.find(t => t.id === tplId) ?? null;
  const isAd = tpl?.kind === "ad";
  const text = preview?.final_body.replace(/\{이름\}/g, "김철수") ?? "";
  const lms = preview?.type === "LMS";

  const doSend = async () => {
    if (!tplId) return;
    setConfirm(false);
    setSending(true);
    try {
      await sendSms(tplId, target);
      setSentNow(true);
      loadHistory();
    } catch (e) {
      toast(errorMessage(e, "발송하지 못했어요."), true);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader crumbs={[{ label: "운영" }, { label: "문자 발송" }]} title="문자 발송" />

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 520px", maxWidth: "100%", display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <section className="adm-card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={STEP}>1</span><h2 className="adm-sec-title">템플릿 선택</h2></span>
              <Link to="/sms-templates" className="adm-btn sm">템플릿 관리</Link>
            </div>
            {!templates ? <div className="adm-empty">불러오는 중…</div> : templates.length === 0 ? (
              <div className="adm-empty">아직 템플릿이 없어요. <Link to="/sms-templates/new">새 템플릿 만들기</Link></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {templates.map(t => (
                  <button key={t.id} type="button" className={`adm-option${t.id === tplId ? " on" : ""}`} onClick={() => setTplId(t.id)}>
                    <span className="adm-radio" aria-hidden="true" />
                    <span style={{ flex: "1 1 0", display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</span>
                      <span style={{ fontSize: 12, color: "#5F7290", display: "flex", alignItems: "center", gap: 4 }}>
                        <Icon name="notice" size={13} />{t.notice?.title ?? "연결 없음"}
                      </span>
                    </span>
                    {t.kind === "ad" && <span className="adm-badge orange">광고성</span>}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="adm-card" style={{ padding: 22 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={STEP}>2</span><h2 className="adm-sec-title">받는 사람</h2></span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TARGETS.map(k => {
                const on = k === target;
                return (
                  <button key={k} type="button" onClick={() => setTarget(k)}
                    style={{ height: 36, padding: "0 14px", borderRadius: 18, font: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      background: on ? "#102A56" : "#FFFFFF", color: on ? "#FFFFFF" : "#5F7290", border: `1px solid ${on ? "#102A56" : "#DDEAF7"}` }}>
                    {TARGET_LABEL[k]}{preview ? ` · ${preview.target_counts[k].toLocaleString()}명` : ""}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <section className="adm-card" style={{ flex: "1 1 360px", maxWidth: "100%", padding: 22 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={STEP}>3</span><h2 className="adm-sec-title">미리보기 · 발송</h2></span>
          {!preview ? <div className="adm-empty">템플릿을 선택하세요.</div> : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                <div style={{ padding: "12px 14px", borderRadius: 12, background: "#F7FAFD", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 12, color: "#5F7290" }}>받는 사람</span>
                  <span style={{ fontSize: 22, fontWeight: 800 }}>{preview.recipient_count.toLocaleString()}명</span>
                </div>
                <div style={{ padding: "12px 14px", borderRadius: 12, background: "#F7FAFD", display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#5F7290" }}>문자 종류</span>
                  <span className={`adm-badge ${lms ? "orange" : "blue"}`} style={{ alignSelf: "flex-start", height: 26, fontSize: 13, fontWeight: 800 }}>{lms ? "LMS 장문" : "SMS 단문"}</span>
                  <span style={{ fontSize: 11, color: "#5F7290" }}>{preview.bytes} byte · {lms ? "90byte 초과" : "90byte 이하"}</span>
                </div>
              </div>
              <span style={{ fontSize: 12, color: "#5F7290" }}>
                {isAd ? `마케팅 수신 미동의 회원 ${preview.excluded_count.toLocaleString()}명은 제외돼요 · 휴대폰 번호가 없는 회원도 제외돼요` : "휴대폰 번호가 없는 회원은 제외돼요"}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#5F7290", fontWeight: 600 }}>실제 문구 (“김철수” 회원 기준)</span>
                <div style={{ padding: 14, borderRadius: "4px 16px 16px 16px", background: "#EEF2F7", fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-line", wordBreak: "break-all" }}>{text}</div>
              </div>
              {isAd && (
                <div className="adm-info" style={{ background: "#FFF1DE", color: "#E07E00" }}>
                  <span style={{ display: "flex", marginTop: 1 }}><Icon name="info" size={16} /></span>
                  <span>광고성 문자예요. 밤 9시~아침 8시에는 보낼 수 없어요.</span>
                </div>
              )}
              {preview.blocked_reason && (
                <div className="adm-info" style={{ background: "#FFECEC", color: "#E5484D" }}>
                  <span style={{ display: "flex", marginTop: 1 }}><Icon name="ban" size={16} /></span>
                  <span>{preview.blocked_reason}</span>
                </div>
              )}
              {sentNow ? (
                <div role="status" style={{ padding: 14, borderRadius: 12, background: "#E2F8F4", color: "#0B8574", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="check" size={18} />발송을 시작했어요 · 아래 발송 기록에서 확인하세요
                </div>
              ) : (
                <button type="button" className="adm-btn primary lg" style={{ width: "100%" }}
                  disabled={sending || !!preview.blocked_reason || preview.recipient_count === 0} onClick={() => setConfirm(true)}>
                  <Icon name="send" size={18} />발송하기
                </button>
              )}
            </>
          )}
        </section>
      </div>

      <section className="adm-card">
        <h2 className="adm-card-title">발송 기록 <span className="adm-card-sub">최근 30일</span></h2>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>발송 일시</th><th>템플릿</th><th>구분</th><th>종류</th><th className="adm-hide-m">대상</th><th>받는 사람</th><th>성공</th><th>실패</th><th className="adm-hide-m">보낸 사람</th></tr></thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id}>
                  <td className="muted nowrap">{fmtDate(h.created_at, true)}</td>
                  <td>{h.template ?? "삭제된 템플릿"}</td>
                  <td><span className={`adm-badge ${h.kind === "ad" ? "orange" : "blue"}`}>{h.kind === "ad" ? "광고성" : "안내성"}</span></td>
                  <td className="muted">{h.type}</td>
                  <td className="muted nowrap adm-hide-m">{h.target ?? "-"}</td>
                  <td className="nowrap">{h.recipient_count.toLocaleString()}명</td>
                  <td className="nowrap">{h.status === "sending" ? <span style={{ color: "#0A6CE0", fontWeight: 700 }}>발송 중</span> : `${h.success_count.toLocaleString()}건`}</td>
                  <td className="nowrap" style={{ color: h.fail_count ? "#E5484D" : undefined }}>{h.status === "sending" ? "-" : `${h.fail_count.toLocaleString()}건`}</td>
                  <td className="muted adm-hide-m">{h.sent_by ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {history.length === 0 && <div className="adm-empty">최근 30일 동안 보낸 문자가 없어요.</div>}
      </section>

      {confirm && preview && (
        <ConfirmModal title={`${preview.recipient_count.toLocaleString()}명에게 보낼까요?`} confirmLabel="발송" onCancel={() => setConfirm(false)} onConfirm={doSend}
          body={`${lms ? "LMS 장문" : "SMS 단문"}으로 발송돼요. 발송을 시작하면 취소할 수 없어요.`} />
      )}
    </>
  );
}
