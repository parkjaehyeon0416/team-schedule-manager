// ★ v18.43 — 문자 템플릿 목록 (DESIGN-CANVAS ADMIN_SMS_TEMPLATES)
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSmsTemplates, type SmsTemplate } from "../api/operator";
import Icon from "../components/Icon";
import { PageHeader, errorMessage, fmtDate, useToast } from "../components/ui";

export default function SmsTemplates() {
  const toast = useToast();
  const [items, setItems] = useState<SmsTemplate[] | null>(null);

  useEffect(() => {
    getSmsTemplates().then(setItems).catch(e => { toast(errorMessage(e, "템플릿을 불러오지 못했어요."), true); setItems([]); });
  }, [toast]);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "운영" }, { label: "문자 템플릿" }]}
        title="문자 템플릿"
        actions={<Link to="/sms-templates/new" className="adm-btn primary"><Icon name="plus" size={16} />새 템플릿</Link>}
      />
      <div className="adm-info">
        <span style={{ display: "flex", marginTop: 1 }}><Icon name="info" size={16} /></span>
        <span>문구에 {"{이름}"}을 넣으면 받는 사람 이름으로 바뀌어요. 광고성 문자는 “(광고)” 표기와 무료 수신거부 번호가 꼭 들어가야 해요.</span>
      </div>

      {!items ? <div className="adm-empty">불러오는 중…</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: 14 }}>
          {items.map(t => (
            <Link key={t.id} to={`/sms-templates/${t.id}`} className="adm-card" style={{ gap: 10, padding: 18, textDecoration: "none", color: "#102A56" }}>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</span>
                <span style={{ display: "flex", gap: 4 }}>
                  <span className={`adm-badge ${t.kind === "ad" ? "orange" : "blue"}`}>{t.kind === "ad" ? "광고성" : "안내성"}</span>
                  <span className="adm-badge">{t.type}</span>
                </span>
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.6, color: "#3B4F70", whiteSpace: "pre-line", padding: 12, borderRadius: 10, background: "#F7FAFD", minHeight: 64, wordBreak: "break-all" }}>
                {t.final_body}
              </span>
              <span style={{ fontSize: 12, color: t.notice ? "#3B4F70" : "#8FA3BF", display: "flex", alignItems: "center", gap: 4 }}>
                {t.notice ? <><Icon name="notice" size={14} />{t.notice.title}</> : "연결된 공지·이벤트 없음"}
              </span>
              <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#5F7290" }}>
                <span>수정 {fmtDate(t.updated_at)}</span>
                <span style={{ color: "#0A6CE0", fontWeight: 700 }}>수정 ›</span>
              </span>
            </Link>
          ))}
          <Link to="/sms-templates/new" style={{ minHeight: 200, border: "1px dashed #9CC9FA", borderRadius: 16, background: "#F3F9FF", color: "#0A6CE0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
            <Icon name="plus" size={22} />새 템플릿 만들기
          </Link>
        </div>
      )}
    </>
  );
}
