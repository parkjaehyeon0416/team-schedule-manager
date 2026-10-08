// ★ v18.41 — 운영자 웹 레이아웃 (DESIGN-CANVAS ADMIN_DASHBOARD: 왼쪽 메뉴 / 모바일은 상단 칩 메뉴)
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import Icon from "../Icon";
import logo from "../../assets/icons/logo.png";
import { useAuthStore } from "../../store/authStore";

type Item = { to: string; label: string; icon: string; soon?: boolean };
// ★ v18.43 — 디자인(ADMIN_*) 메뉴 묶음: 콘텐츠 / 운영 / 회원 / 준비 중
//   (디자인엔 회원이 "준비 중"으로 돼 있지만 v18.41에 이미 만들어서 사용 가능한 메뉴로 둠)
const GROUPS: { title?: string; items: Item[] }[] = [
  { items: [{ to: "/", label: "대시보드", icon: "dashboard" }] },
  { title: "콘텐츠", items: [{ to: "/notices", label: "공지 관리", icon: "notice" }, { to: "/events", label: "이벤트 관리", icon: "event" }] },
  {
    title: "운영",
    items: [
      { to: "/inquiries", label: "고객 문의", icon: "inquiry" },
      { to: "/sms", label: "문자 발송", icon: "sms" },
      { to: "/sms-templates", label: "문자 템플릿", icon: "template" },
      { to: "/stats", label: "통계", icon: "stats" },
    ],
  },
  { title: "회원", items: [{ to: "/members", label: "회원 관리", icon: "members" }] },
  // ★ v18.56 — 디자인(ADMIN_OPERATORS) 사이드 메뉴 "설정 › 운영자 관리"
  { title: "설정", items: [{ to: "/operators", label: "운영자 관리", icon: "shield" }] },
  { title: "준비 중", items: [{ to: "/payments", label: "결제", icon: "payment", soon: true }] },
];
const ALL = GROUPS.flatMap(g => g.items);

function isActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/");
}

export default function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const logout = () => { clearAuth(); navigate("/login"); };

  return (
    <div className="adm-root">
      <aside className="adm-side">
        <Link to="/" className="adm-brand">
          <img src={logo} alt="현장메이트" />
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <span className="adm-brand-name">현장<b>메이트</b></span>
            <span className="adm-brand-sub">운영자 관리자</span>
          </span>
        </Link>
        <nav aria-label="관리자 메뉴" className="adm-nav">
          {GROUPS.map((g, gi) => (
            <div key={gi} style={{ display: "contents" }}>
              {g.title && <span className="adm-nav-group">{g.title}</span>}
              {g.items.map(it => {
                const on = isActive(pathname, it.to);
                return (
                  <Link key={it.to} to={it.to} className={`adm-nav-item${on ? " on" : ""}${it.soon ? " soon" : ""}`}>
                    <Icon name={it.icon} size={19} width={on ? 2 : 1.8} />
                    <span>{it.label}</span>
                    {it.soon && <span className="adm-soon-tag">준비 중</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="adm-me">
          <div className="adm-avatar">{user?.name?.[0] ?? "운"}</div>
          <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column" }}>
            <span className="adm-me-name">{user?.name ?? "운영자"}</span>
            <span className="adm-me-mail">{user?.email}</span>
          </div>
          <button type="button" aria-label="로그아웃" onClick={logout}
            style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "#5F7290", border: 0, background: "transparent", cursor: "pointer" }}>
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <div className="adm-mtop">
        <div className="adm-mtop-row">
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <img src={logo} alt="현장메이트" width={30} height={30} style={{ objectFit: "contain" }} />
            <span className="adm-brand-name" style={{ fontSize: 17 }}>현장<b>메이트</b></span>
            <span className="adm-soon-tag" style={{ marginLeft: 0, fontSize: 11 }}>관리자</span>
          </Link>
          <button type="button" aria-label="로그아웃" onClick={logout}
            style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "flex-end", color: "#5F7290", border: 0, background: "transparent" }}>
            <Icon name="logout" size={20} />
          </button>
        </div>
        <nav aria-label="관리자 메뉴" className="adm-chips">
          {ALL.map(it => (
            <Link key={it.to} to={it.to} className={`adm-chip${isActive(pathname, it.to) ? " on" : ""}${it.soon ? " soon" : ""}`}>
              <Icon name={it.icon} size={15} />{it.label}
            </Link>
          ))}
        </nav>
      </div>

      <main className="adm-pad">
        <div className="adm-wrap">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
