// ★ v18.41 — 준비 중 메뉴 (DESIGN-CANVAS ADMIN_COMING_SOON)
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { PageHeader } from "../components/ui";
import gear from "../assets/icons/gear.png";

const MENUS = {
  stats: { label: "통계", desc: "가입 · 활동 추이", icon: "stats" },
  inquiries: { label: "고객 문의", desc: "문의 접수 · 답변", icon: "inquiry" },
  sms: { label: "문자 발송", desc: "회원 대상 문자 발송", icon: "sms" },
  payments: { label: "결제", desc: "결제 내역 · 환불", icon: "payment" },
} as const;

export default function ComingSoon({ menu }: { menu: keyof typeof MENUS }) {
  const cur = MENUS[menu];
  return (
    <>
      <PageHeader crumbs={[{ label: "준비 중" }, { label: cur.label }]} title={cur.label} />
      <section className="adm-card" style={{ alignItems: "center", textAlign: "center", padding: "48px 24px", gap: 12 }}>
        <img src={gear} alt="" width={88} height={88} style={{ objectFit: "contain" }} />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>준비 중인 메뉴예요</h2>
        <p style={{ margin: 0, fontSize: 14, color: "#5F7290", lineHeight: 1.6 }}>
          이 기능은 아직 개발 중이에요. 메뉴 자리만 먼저 만들어 두었어요.<br />
          지금은 대시보드, 공지 · 이벤트 관리, 회원 관리를 이용할 수 있어요.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <Link to="/" className="adm-btn">대시보드로</Link>
          <Link to="/notices" className="adm-btn primary">공지 관리</Link>
        </div>
      </section>
      <section className="adm-card">
        <h2 className="adm-card-title">준비 중인 메뉴</h2>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {Object.entries(MENUS).map(([key, m]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #EDF3FA" }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: "#F2F7FE", color: "#5F7290", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={m.icon} size={18} />
              </span>
              <span style={{ flex: "1 1 0", display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{m.label}</span>
                <span style={{ fontSize: 12, color: "#5F7290" }}>{m.desc}</span>
              </span>
              <span className="adm-badge">준비 중</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
