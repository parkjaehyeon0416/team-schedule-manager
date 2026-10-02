// ★ v18.40~41 — 운영자 비밀번호 설정 (문자로 받은 1회용 링크: /admin/set-password?token=...) — 로그인 화면과 같은 스타일
import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Icon from "../components/Icon";
import { errorMessage } from "../components/ui";
import logo from "../assets/icons/logo.png";

export default function SetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [doneEmail, setDoneEmail] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { setError("비밀번호는 8자 이상이어야 해요."); return; }
    if (pw !== pw2) { setError("비밀번호가 일치하지 않아요."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.post("/api/operator/set-password", { token, password: pw, password_confirmation: pw2 });
      setDoneEmail(res.data.data.email);
    } catch (err) {
      setError(errorMessage(err, "설정하지 못했어요."));
    } finally {
      setLoading(false);
    }
  };

  const card = {
    width: "100%", maxWidth: 400, background: "#FFFFFF", border: "1px solid #E3ECF6", borderRadius: 20, padding: 32,
    boxShadow: "0 12px 32px rgba(16,42,86,0.08)", display: "flex", flexDirection: "column" as const, gap: 14,
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "#F4F8FD" }}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={logo} alt="WorkMate" width={36} height={36} style={{ objectFit: "contain" }} />
          <span style={{ fontSize: 17, fontWeight: 800 }}>WorkMate 관리자</span>
        </div>
        {doneEmail ? (
          <>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>비밀번호가 설정됐어요</h2>
            <p style={{ margin: 0, fontSize: 14, color: "#5F7290" }}>{doneEmail} 으로 로그인하세요.</p>
            <button type="button" className="adm-btn primary lg" onClick={() => navigate("/login")}>로그인하러 가기</button>
          </>
        ) : !token ? (
          <>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>잘못된 링크예요</h2>
            <p style={{ margin: 0, fontSize: 14, color: "#5F7290" }}>문자로 받은 링크를 다시 열어주세요.</p>
          </>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>운영자 비밀번호 설정</h2>
              <p style={{ margin: 0, fontSize: 14, color: "#5F7290" }}>이 링크는 30분 동안 한 번만 쓸 수 있어요.</p>
            </div>
            <div className="adm-field">
              <label className="adm-label" htmlFor="pw1">새 비밀번호</label>
              <div className="adm-input-wrap" style={{ height: 48 }}>
                <span style={{ color: "#8FA3BF", display: "flex" }}><Icon name="lock" /></span>
                <input id="pw1" type="password" autoComplete="new-password" placeholder="8자 이상" value={pw} onChange={e => setPw(e.target.value)} />
              </div>
            </div>
            <div className="adm-field">
              <label className="adm-label" htmlFor="pw2">비밀번호 확인</label>
              <div className="adm-input-wrap" style={{ height: 48 }}>
                <span style={{ color: "#8FA3BF", display: "flex" }}><Icon name="lock" /></span>
                <input id="pw2" type="password" autoComplete="new-password" placeholder="한 번 더 입력" value={pw2} onChange={e => setPw2(e.target.value)} />
              </div>
            </div>
            {error && <div className="adm-info" style={{ background: "#FFF2F2", color: "#E5484D" }}>{error}</div>}
            <button type="submit" className="adm-btn primary lg" disabled={loading}>{loading ? "설정 중…" : "비밀번호 설정"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
