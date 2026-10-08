// ★ v18.41 — 운영자 로그인 (DESIGN-CANVAS ADMIN_LOGIN)
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import Icon from "../components/Icon";
import logo from "../assets/icons/logo.png";

const SAVED_KEY = "wm-admin-saved-email";

function readSaved(): string {
  try { return localStorage.getItem(SAVED_KEY) ?? ""; } catch { return ""; }
}

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState(readSaved);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(!!readSaved());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("아이디와 비밀번호를 입력해주세요."); return; }
    setLoading(true);
    setError("");
    try {
      const result = await login(email.trim(), password);
      try { remember ? localStorage.setItem(SAVED_KEY, email.trim()) : localStorage.removeItem(SAVED_KEY); } catch { /* 저장소 사용 불가 */ }
      setAuth(result.data.user, result.data.token);
      navigate("/");
    } catch (err: any) {
      const code = err?.response?.data?.error_code;
      setError(
        code === "ERR_AUTH_001" ? "아이디 또는 비밀번호를 확인해주세요."
          : code === "ERR_AUTH_007" ? "운영자 계정이 아니에요. 일반 회원은 모바일 앱을 이용해주세요."
          : code === "ERR_AUTH_009" ? "이용이 정지된 계정입니다."
          : "로그인에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", background: "#F4F8FD" }}>
      <div className="adm-side adm-login-side" style={{
        flex: "1 1 0", width: "auto", height: "auto", minHeight: "100vh", position: "static", border: 0,
        background: "linear-gradient(160deg,#2492FF 0%,#0A6CE0 70%,#0B4FB0 100%)", color: "#FFFFFF", padding: 56,
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logo} alt="현장메이트" width={44} height={44} style={{ objectFit: "contain" }} />
          <span style={{ fontSize: 20, fontWeight: 800 }}>현장메이트 관리자</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, lineHeight: 1.3, letterSpacing: -0.8 }}>앱 운영을<br />한 곳에서 관리하세요</h1>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: "rgba(255,255,255,0.88)" }}>회원 현황 확인, 공지·이벤트 게시까지<br />운영자 전용 화면입니다.</p>
        </div>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>© 현장메이트 · 운영자 전용</span>
      </div>

      <div style={{ flex: "1 1 0", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <form onSubmit={onSubmit} style={{
          width: "100%", maxWidth: 400, background: "#FFFFFF", border: "1px solid #E3ECF6", borderRadius: 20, padding: 36,
          boxShadow: "0 12px 32px rgba(16,42,86,0.08)", display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>운영자 로그인</h2>
            <p style={{ margin: 0, fontSize: 14, color: "#5F7290" }}>발급받은 운영자 계정으로 로그인해주세요.</p>
          </div>
          <div className="adm-field">
            <label className="adm-label" htmlFor="login-id">운영자 아이디</label>
            <div className="adm-input-wrap" style={{ height: 48 }}>
              <span style={{ color: "#8FA3BF", display: "flex" }}><Icon name="user" /></span>
              <input id="login-id" type="email" autoComplete="username" placeholder="아이디 또는 이메일" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="adm-field">
            <label className="adm-label" htmlFor="login-pw">비밀번호</label>
            <div className="adm-input-wrap" style={{ height: 48 }}>
              <span style={{ color: "#8FA3BF", display: "flex" }}><Icon name="lock" /></span>
              <input id="login-pw" type="password" autoComplete="current-password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#5F7290", cursor: "pointer" }}>
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#168BFF" }} />
            아이디 저장
          </label>
          {error && <div className="adm-info" style={{ background: "#FFF2F2", color: "#E5484D" }}>{error}</div>}
          <button type="submit" className="adm-btn primary lg" style={{ marginTop: 4 }} disabled={loading}>
            {loading ? "로그인 중…" : "로그인"}
          </button>
          <div className="adm-info">
            <span style={{ display: "flex", marginTop: 1 }}><Icon name="info" size={16} /></span>
            <span>운영자 계정이 없으면 접속할 수 없어요. 계정은 최고 관리자에게 발급받으세요.</span>
          </div>
        </form>
      </div>
    </div>
  );
}
