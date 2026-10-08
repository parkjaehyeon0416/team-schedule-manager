// ★ v18.40~41 — 운영자 비밀번호 설정 (문자로 받은 1회용 링크: /admin/set-password?token=...)
// ★ v18.56 — 디자인 ADMIN_SET_PASSWORD(·_ERR·_INVALID·_M)대로: 로고는 카드 위, 입력 중 바로 오류 표시, 잘못된 링크·완료 카드
import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Icon from "../components/Icon";
import { errorMessage } from "../components/ui";
import logo from "../assets/icons/logo.png";

const card: CSSProperties = {
  width: "100%", maxWidth: 420, background: "#FFFFFF", border: "1px solid #E3ECF6", borderRadius: 20, padding: 32,
  boxShadow: "0 12px 32px rgba(16,42,86,0.08)", display: "flex", flexDirection: "column", gap: 14, boxSizing: "border-box",
};
const center: CSSProperties = { ...card, alignItems: "center", textAlign: "center", padding: "40px 32px" };
const bd = (err: boolean, v: string) => (err ? "#E5484D" : v ? "#7DBBFF" : "#DDEAF7");

function ErrLine({ children }: { children: string }) {
  return (
    <span role="alert" style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12, fontWeight: 600, color: "#E5484D" }}>
      <Icon name="info" size={13} color="#E5484D" width={2.2} />{children}
    </span>
  );
}

export default function SetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState(token.length !== 64);
  const [done, setDone] = useState(false);

  const short = pw.length > 0 && pw.length < 8;
  const diff = pw2.length > 0 && pw !== pw2;
  const ok = pw.length >= 8 && pw === pw2;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ok || loading) return;
    setLoading(true);
    setError("");
    try {
      await axiosInstance.post("/api/operator/set-password", { token, password: pw, password_confirmation: pw2 });
      setDone(true);
    } catch (err: any) {
      // 410 = 만료됐거나 이미 쓴 링크
      if (err?.response?.status === 410) setInvalid(true);
      else setError(errorMessage(err, "설정하지 못했어요."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: "32px 16px", boxSizing: "border-box", background: "#F4F8FD" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src={logo} alt="현장메이트" width={36} height={36} style={{ objectFit: "contain", filter: "drop-shadow(0 4px 10px rgba(10,108,224,0.16))" }} />
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.4 }}>현장<span style={{ color: "#0A6CE0" }}>메이트</span></span>
          <span style={{ fontSize: 11, color: "#5F7290", fontWeight: 600 }}>운영자 관리자</span>
        </span>
      </div>

      {done ? (
        <div style={center}>
          <span style={{ width: 64, height: 64, borderRadius: "50%", background: "#E2F8F4", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="check" size={32} color="#0B8574" width={2.6} />
          </span>
          <h1 style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 800 }}>비밀번호를 설정했어요</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#5F7290", lineHeight: 1.6 }}>이제 이메일과 새 비밀번호로 관리 화면에 로그인할 수 있어요.</p>
          <Link to="/login" className="adm-btn primary lg" style={{ width: "100%", marginTop: 6, height: 52 }}>로그인하러 가기</Link>
        </div>
      ) : invalid ? (
        <div style={center}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "#FFECEC", color: "#E5484D", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
            </svg>
          </div>
          <h1 style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 800 }}>잘못된 링크예요</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#5F7290", lineHeight: 1.6 }}>
            문자로 받은 링크를 다시 열어주세요.<br />링크가 만료됐다면 운영자에게 다시 보내달라고 요청하세요.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} style={card}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 23, fontWeight: 800 }}>운영자 비밀번호 설정</h1>
            <p style={{ margin: 0, fontSize: 14, color: "#5F7290" }}>이 링크는 30분 동안 한 번만 쓸 수 있어요.</p>
          </div>
          <div className="adm-field">
            <label className="adm-label" htmlFor="pwa">새 비밀번호</label>
            <div className="op-input" style={{ height: 50, borderColor: bd(short, pw) }}>
              <span style={{ color: "#8FA3BF", display: "flex" }}><Icon name="lock" /></span>
              <input id="pwa" type="password" autoComplete="new-password" placeholder="8자 이상" value={pw} onChange={e => setPw(e.target.value)} />
            </div>
            {short && <ErrLine>8자 이상 입력해주세요.</ErrLine>}
          </div>
          <div className="adm-field">
            <label className="adm-label" htmlFor="pwb">비밀번호 확인</label>
            <div className="op-input" style={{ height: 50, borderColor: bd(diff, pw2) }}>
              <span style={{ color: "#8FA3BF", display: "flex" }}><Icon name="lock" /></span>
              <input id="pwb" type="password" autoComplete="new-password" placeholder="한 번 더 입력" value={pw2} onChange={e => setPw2(e.target.value)} />
            </div>
            {diff && <ErrLine>비밀번호가 서로 달라요.</ErrLine>}
          </div>
          {error && <ErrLine>{error}</ErrLine>}
          <button type="submit" disabled={!ok || loading}
            style={{ height: 52, border: 0, borderRadius: 12, marginTop: 4, font: "inherit", fontSize: 16, fontWeight: 700, color: "#FFFFFF",
              cursor: ok ? "pointer" : "default", background: ok ? "linear-gradient(180deg,#2492FF 0%,#0A6CE0 100%)" : "#B9D6F7" }}>
            {loading ? "설정 중…" : "비밀번호 설정"}
          </button>
          <span style={{ fontSize: 12, color: "#5F7290", textAlign: "center" }}>설정이 끝나면 운영자 로그인 화면으로 이동해요.</span>
        </form>
      )}
    </div>
  );
}
