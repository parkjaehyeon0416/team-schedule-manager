// ★ v18.43 — 문자 템플릿 작성·수정 (DESIGN-CANVAS ADMIN_SMS_TEMPLATE_EDIT)
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  buildSmsBody, createSmsTemplate, deleteSmsTemplate, getSmsConfig, getSmsTemplate, sendTestSms, smsBytes, updateSmsTemplate,
  type SmsConfig, type SmsKind,
} from "../api/operator";
import { getAdminNotices, type AdminNotice } from "../api/notice";
import Icon from "../components/Icon";
import { ConfirmModal, PageHeader, Segmented, errorMessage, useToast } from "../components/ui";

export default function SmsTemplateEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SmsKind>("info");
  const [body, setBody] = useState("");
  const [noticeId, setNoticeId] = useState<number | null>(null);
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [cfg, setCfg] = useState<SmsConfig | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [askDelete, setAskDelete] = useState(false);

  useEffect(() => {
    getSmsConfig().then(setCfg).catch(() => {});
    // 게시된 공지·이벤트만 (최근 12개) — 링크는 게시된 글만 열림
    getAdminNotices().then(list => setNotices(list.filter(n => n.published_at && new Date(n.published_at) <= new Date()).slice(0, 12))).catch(() => {});
    if (!isNew) {
      getSmsTemplate(Number(id))
        .then(t => { setName(t.name); setKind(t.kind); setBody(t.body); setNoticeId(t.notice_id); })
        .catch(e => { toast(errorMessage(e, "템플릿을 불러오지 못했어요."), true); navigate("/sms-templates"); });
    }
  }, [id, isNew, navigate, toast]);

  const full = useMemo(() => buildSmsBody(kind, body || " ", noticeId, cfg), [kind, body, noticeId, cfg]);
  const preview = full.replace(/\{이름\}/g, "김철수");
  const bytes = smsBytes(preview);
  const lms = bytes > 90;

  const save = async () => {
    if (!name.trim()) { toast("템플릿 이름을 입력해주세요.", true); return; }
    if (!body.trim()) { toast("내용을 입력해주세요.", true); return; }
    setSaving(true);
    try {
      const input = { name: name.trim(), kind, body: body.trim(), notice_id: noticeId };
      if (isNew) {
        const t = await createSmsTemplate(input);
        toast("템플릿을 저장했어요.");
        navigate(`/sms-templates/${t.id}`, { replace: true });
      } else {
        await updateSmsTemplate(Number(id), input);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
      }
    } catch (e) {
      toast(errorMessage(e, "저장하지 못했어요."), true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setAskDelete(false);
    try {
      await deleteSmsTemplate(Number(id));
      toast("템플릿을 삭제했어요.");
      navigate("/sms-templates");
    } catch (e) {
      toast(errorMessage(e, "삭제하지 못했어요."), true);
    }
  };

  const test = async () => {
    if (!body.trim()) { toast("내용을 먼저 입력해주세요.", true); return; }
    try {
      const r = await sendTestSms({ kind, body: body.trim(), notice_id: noticeId, phone: testPhone.trim() });
      toast(r.message);
    } catch (e) {
      toast(errorMessage(e, "테스트 문자를 보내지 못했어요."), true);
    }
  };

  const linkOptions: { id: number | null; label: string }[] = [{ id: null, label: "연결 안 함" }, ...notices.map(n => ({ id: n.id, label: n.title }))];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "운영" }, { label: "문자 템플릿", to: "/sms-templates" }, { label: isNew ? "작성" : "수정" }]}
        title={isNew ? "템플릿 작성" : "템플릿 수정"}
        actions={<>
          {saved && <span role="status" style={{ fontSize: 13, color: "#0B8574", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Icon name="check" size={16} />저장됐어요</span>}
          {!isNew && <button type="button" className="adm-btn danger" onClick={() => setAskDelete(true)}><Icon name="trash" size={16} />삭제</button>}
          <button type="button" className="adm-btn primary" disabled={saving} onClick={save}><Icon name="check" size={16} />저장</button>
        </>}
      />

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <section className="adm-card" style={{ flex: "1 1 520px", padding: 24, gap: 18 }}>
          <div className="adm-field">
            <label className="adm-label" htmlFor="tn">템플릿 이름</label>
            <input id="tn" className="adm-input" style={{ height: 46, fontSize: 14 }} maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="예: 서버 점검 안내" />
          </div>

          <div className="adm-field">
            <span className="adm-label">구분</span>
            <Segmented<SmsKind> width={260} value={kind} onChange={setKind} items={[{ label: "안내성", value: "info" }, { label: "광고성", value: "ad" }]} />
          </div>
          {kind === "ad" && (
            <div className="adm-info" style={{ background: "#FFF1DE", color: "#E07E00" }}>
              <span style={{ display: "flex", marginTop: 1 }}><Icon name="info" size={16} /></span>
              <span>광고성 문자는 앞에 (광고), 끝에 무료 수신거부 번호가 자동으로 붙어요. 마케팅 수신에 동의한 회원에게만 보낼 수 있고, 밤 9시~아침 8시에는 보낼 수 없어요.</span>
            </div>
          )}

          <div className="adm-field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="adm-label" htmlFor="tt">내용</label>
              <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#5F7290" }}>{bytes} / {lms ? 2000 : 90} byte</span>
                <span className={`adm-badge ${lms ? "orange" : "blue"}`} style={{ height: 22, fontSize: 11 }}>{lms ? "LMS (장문)" : "SMS (단문)"}</span>
              </span>
            </div>
            <textarea id="tt" className="adm-textarea" rows={7} maxLength={1800} value={body} onChange={e => setBody(e.target.value)}
              placeholder="[WorkMate] {이름}님, ..." style={{ borderRadius: 12, padding: "14px 16px" }} />
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" className="adm-pill" style={{ height: 28, borderColor: "#BFDBFB", background: "#F3F9FF", color: "#0A6CE0" }} onClick={() => setBody(b => b + "{이름}")}>+ {"{이름}"} 넣기</button>
              <span className="adm-hint">받는 사람 이름으로 바뀌어요</span>
            </div>
          </div>

          <div className="adm-field" style={{ gap: 8 }}>
            <span className="adm-label">연결할 공지·이벤트 <span style={{ color: "#5F7290", fontWeight: 400 }}>(선택 · 문자 끝에 바로가기 링크가 붙어요)</span></span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 8 }}>
              {linkOptions.map(o => {
                const on = o.id === noticeId;
                return (
                  <button key={String(o.id)} type="button" onClick={() => setNoticeId(o.id)}
                    style={{ minHeight: 44, padding: "8px 12px", borderRadius: 10, font: "inherit", fontSize: 13, color: "#102A56", textAlign: "left", cursor: "pointer",
                      background: on ? "#F3F9FF" : "#FFFFFF", border: `1px solid ${on ? "#7DBBFF" : "#DDEAF7"}`, fontWeight: on ? 700 : 500 }}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="adm-field">
            <span className="adm-label">테스트 발송</span>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="adm-input-wrap" style={{ flex: "1 1 0", height: 48 }}>
                <span style={{ color: "#8FA3BF", display: "flex" }}><Icon name="phone" /></span>
                <input type="tel" aria-label="테스트 번호" placeholder="010-0000-0000" value={testPhone} onChange={e => setTestPhone(e.target.value)} />
              </div>
              <button type="button" className="adm-btn" style={{ height: 48 }} disabled={!testPhone.trim()} onClick={test}><Icon name="send" size={16} />테스트 보내기</button>
            </div>
            <span className="adm-hint">입력한 번호 한 곳으로만 보내요. ({"{이름}"}은 운영자 이름으로 바뀌어요)</span>
          </div>
        </section>

        <div className="adm-prev">
          <span style={{ fontSize: 13, fontWeight: 700, color: "#5F7290" }}>수신 화면 미리보기</span>
          <div className="adm-phone">
            <div className="adm-phone-bar">문자 미리보기</div>
            <div className="adm-phone-body">
              <div style={{ alignSelf: "flex-start", maxWidth: "92%", padding: "12px 14px", borderRadius: "4px 16px 16px 16px", background: "#EEF2F7", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-line", wordBreak: "break-all" }}>
                {preview}
              </div>
              <span style={{ fontSize: 11, color: "#5F7290" }}>“김철수” 회원 기준 미리보기</span>
              <span style={{ fontSize: 11, color: "#5F7290" }}>발신 {cfg?.sender ?? "-"}</span>
            </div>
          </div>
        </div>
      </div>

      {askDelete && (
        <ConfirmModal danger title="템플릿을 삭제할까요?" confirmLabel="삭제" onCancel={() => setAskDelete(false)} onConfirm={remove}
          body="삭제해도 이미 보낸 문자 기록은 남아요." />
      )}
    </>
  );
}
