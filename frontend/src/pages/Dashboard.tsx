// ★ v18.41 — 운영자 대시보드 (DESIGN-CANVAS ADMIN_DASHBOARD)
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard, type Dashboard as DashboardData } from "../api/admin";
import Icon from "../components/Icon";
import { PageHeader, errorMessage, fmtDate, useToast } from "../components/ui";
import iconProfile from "../assets/icons/profile.png";
import iconSchedule from "../assets/icons/schedule.png";
import iconTeam from "../assets/icons/team.png";
import iconQuote from "../assets/icons/quote.png";
import iconBell from "../assets/icons/bell.png";
import iconMegaphone from "../assets/icons/megaphone.png";
import iconGift from "../assets/icons/gift.png";

const nf = (n?: number) => (n ?? 0).toLocaleString("ko-KR");

export default function Dashboard() {
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getDashboard()
      .then(setData)
      .catch(e => toast(errorMessage(e, "대시보드를 불러오지 못했어요."), true))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const s = data?.stats;
  const month = new Date().getMonth() + 1;
  const cards = [
    { icon: iconProfile, label: "전체 회원", value: s?.members_total, unit: "명", sub: `+${nf(s?.members_today)} 오늘` },
    { icon: iconProfile, label: "오늘 가입", value: s?.members_today, unit: "명", sub: `어제 ${nf(s?.members_yesterday)}명` },
    { icon: iconSchedule, label: "이번 달 가입", value: s?.members_this_month, unit: "명", sub: `${month}월 1일 ~ 오늘` },
    { icon: iconTeam, label: "팀 수", value: s?.teams_total, unit: "개", sub: "활동 팀 기준" },
    { icon: iconSchedule, label: "이번 달 일정", value: s?.schedules_this_month, unit: "건", sub: "개인 + 팀 일정" },
    { icon: iconQuote, label: "이번 달 견적서", value: s?.quotes_this_month, unit: "건", sub: "작성 · 발송 포함" },
    { icon: iconBell, label: "푸시 받는 기기", value: s?.push_devices, unit: "대", sub: "알림 허용 기기" },
    {
      icon: iconMegaphone, label: "게시 중인 공지", value: (s?.notices_published ?? 0) + (s?.events_published ?? 0), unit: "건",
      sub: `공지 ${nf(s?.notices_published)} · 이벤트 ${nf(s?.events_published)}`,
    },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "홈" }, { label: "대시보드" }]}
        title="대시보드"
        actions={
          <>
            <span style={{ fontSize: 13, color: "#5F7290" }}>기준 {data ? fmtDate(data.generated_at, true) : "-"}</span>
            <button type="button" className="adm-btn" onClick={load} disabled={loading}>
              <Icon name="refresh" size={17} />새로고침
            </button>
          </>
        }
      />

      <div className="adm-stats">
        {cards.map(c => (
          <div key={c.label} className="adm-stat">
            <div className="adm-stat-icon"><img src={c.icon} alt="" /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span className="adm-stat-label">{c.label}</span>
              <span className="adm-stat-value">{loading && !data ? "–" : nf(c.value)}<small>{c.unit}</small></span>
              <span className="adm-stat-sub">{c.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))", gap: 16, alignItems: "start" }}>
        <section className="adm-card adm-span2" style={{ gridColumn: "span 2" }}>
          <div className="adm-card-title">
            <span>최근 가입 회원</span>
            <Link to="/members" className="adm-card-sub" style={{ textDecoration: "none" }}>최근 5명 · 전체 보기</Link>
          </div>
          <div className="adm-table-wrap" style={{ border: "1px solid #E3ECF6", borderRadius: 12 }}>
            <table className="adm-table">
              <thead>
                <tr><th>이름</th><th>이메일</th><th>주요 공정</th><th>지역</th><th>가입 방식</th><th>가입 일시</th></tr>
              </thead>
              <tbody>
                {(data?.recent_members ?? []).map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="adm-avatar">{m.name.charAt(0)}</div>
                        <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{m.name}</span>
                      </div>
                    </td>
                    <td className="muted">{m.email_masked}</td>
                    <td className="muted">{m.specialty || "-"}</td>
                    <td className="muted">{m.service_area || "-"}</td>
                    <td className="muted">{m.signup_method}</td>
                    <td className="muted nowrap">{fmtDate(m.created_at, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && data.recent_members.length === 0 && <div className="adm-empty">아직 가입한 회원이 없어요.</div>}
          </div>
        </section>

        <section className="adm-card" style={{ gap: 6 }}>
          <div className="adm-card-title">
            <span>게시 중인 공지 · 이벤트</span>
            <Link to="/notices/new" className="adm-btn sm" style={{ background: "#EAF4FF", color: "#0A6CE0", border: 0 }}>
              <Icon name="plus" size={15} />새 공지
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {(data?.published_notices ?? []).map(n => (
              <Link key={n.id} to={n.type === "event" ? `/events/${n.id}` : `/notices/${n.id}`}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid #EDF3FA", textDecoration: "none", color: "#102A56" }}>
                <img src={n.type === "event" ? iconGift : iconMegaphone} alt="" width={30} height={30} style={{ objectFit: "contain", flexShrink: 0 }} />
                <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.title}</span>
                  <span style={{ fontSize: 12, color: "#5F7290" }}>
                    {n.type === "event" ? `이벤트${n.ends_at ? ` · ~${fmtDate(n.ends_at).slice(5)}` : ""}` : `공지${n.is_pinned ? " · 중요 고정" : ""}`}
                  </span>
                </div>
                <span className="adm-badge ok">게시</span>
              </Link>
            ))}
            {data && data.published_notices.length === 0 && <div className="adm-empty" style={{ padding: 24 }}>게시 중인 글이 없어요.</div>}
          </div>
        </section>
      </div>
    </>
  );
}
