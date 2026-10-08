// ★ v18.56 — 운영자 관리 (디자인 ADMIN_OPERATORS · _SOLO · _INVITED · _RESENT · _DELETE · ADMIN_OPERATOR_INVITE)
//   목록(PC 표 / 모바일 카드) + 운영자 초대 창 + 링크 다시 보내기 + 삭제 확인
import { useCallback, useEffect, useState } from "react";
import { deleteOperator, getOperators, inviteOperator, resendOperatorLink, type Operator } from "../api/admin";
import Icon from "../components/Icon";
import { ConfirmModal, PageHeader, errorMessage, fmtDate, useToast } from "../components/ui";
import people from "../assets/icons/people.png";

const AVB = ["#FFE3C2", "#D6ECFF", "#D9F6F1", "#ECE5FF"];
const AVT = ["#B95E00", "#0A6CE0", "#0B8574", "#6B4FD8"];

/** 마지막 접속: 1분 안 "방금 전", 오늘 "오늘 HH:MM", 어제 "어제 HH:MM", 그 외 날짜 */
function lastSeen(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`;
  if (now.getTime() - d.getTime() < 60_000) return "방금 전";
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86_400_000);
  if (diff === 0) return `오늘 ${hm}`;
  if (diff === 1) return `어제 ${hm}`;
  return fmtDate(iso);
}

function InviteButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="adm-btn primary" onClick={onClick} style={{ height: 40, padding: "0 16px" }}>
      <Icon name="userPlus" size={18} />운영자 초대
    </button>
  );
}

export default function Operators() {
  const toast = useToast();
  const [rows, setRows] = useState<Operator[] | null>(null);
  const [inviting, setInviting] = useState(false);
  const [del, setDel] = useState<Operator | null>(null);

  const load = useCallback(() => {
    getOperators().then(setRows).catch(e => toast(errorMessage(e, "운영자 목록을 불러오지 못했어요."), true));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const resend = async (op: Operator) => {
    try {
      toast((await resendOperatorLink(op.id)).message);
    } catch (e) {
      toast(errorMessage(e, "링크를 보내지 못했어요."), true);
    }
  };

  const doDelete = async () => {
    const op = del;
    setDel(null);
    if (!op) return;
    try {
      toast((await deleteOperator(op.id)).message);
      load();
    } catch (e) {
      toast(errorMessage(e, "삭제하지 못했어요."), true);
    }
  };

  const solo = rows !== null && rows.length <= 1;

  const status = (op: Operator) => (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
      <span className={`op-st ${op.status}`}>{op.status === "active" ? "활성" : "초대 중"}</span>
      <span style={{ fontSize: 11, color: "#5F7290" }}>{op.status === "active" ? "비밀번호 설정 완료" : "비밀번호 설정 대기"}</span>
    </span>
  );
  const avatar = (op: Operator, i: number) => (
    <span className="adm-avatar" style={{ fontSize: 14, background: AVB[i % 4], color: AVT[i % 4] }}>{op.name.charAt(0)}</span>
  );
  const actions = (op: Operator) => (
    <>
      <button type="button" className="op-btn link" onClick={() => resend(op)} aria-label={`${op.name}에게 링크 다시 보내기`}>
        <Icon name="sms" size={14} />링크 다시 보내기
      </button>
      {op.is_me ? (
        <button type="button" className="op-btn" disabled title="내 계정은 삭제할 수 없어요">삭제</button>
      ) : (
        <button type="button" className="op-btn del" onClick={() => setDel(op)} aria-label={`${op.name} 삭제`}>삭제</button>
      )}
    </>
  );

  return (
    <>
      <PageHeader crumbs={[{ label: "설정" }, { label: "운영자 관리" }]} title="운영자 관리" actions={<InviteButton onClick={() => setInviting(true)} />} />

      {solo && (
        <div className="op-solo">
          <img src={people} alt="" width={56} height={56} style={{ objectFit: "contain", flexShrink: 0 }} />
          <span style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 4 }}>
            <b style={{ fontSize: 16 }}>함께 관리할 운영자를 초대해 보세요</b>
            <span style={{ fontSize: 13, color: "#5F7290", lineHeight: 1.6 }}>초대한 사람의 휴대폰으로 비밀번호 설정 링크가 가요. 지금은 운영자가 나 혼자예요.</span>
          </span>
          {/* 디자인엔 여기에도 [운영자 초대]가 있었지만 위쪽 버튼과 중복이라 뺌(사용자 요청 2026-10-08) */}
        </div>
      )}

      <section className="adm-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, whiteSpace: "nowrap" }}>운영자 {rows?.length ?? ""}명</h2>
          <span style={{ display: "flex", gap: 12, fontSize: 12, color: "#5F7290", flexWrap: "wrap" }}>
            <span><b style={{ color: "#0B8574" }}>활성</b> 비밀번호까지 설정</span>
            <span><b style={{ color: "#B95E00" }}>초대 중</b> 비밀번호 설정 전</span>
          </span>
        </div>

        <div className="op-table adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th>이름</th><th>이메일 (로그인 아이디)</th><th>휴대폰</th><th>상태</th><th>마지막 접속</th><th>추가한 날짜</th><th>관리</th></tr>
            </thead>
            <tbody>
              {(rows ?? []).map((op, i) => (
                <tr key={op.id}>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {avatar(op, i)}<b style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{op.name}</b>{op.is_me && <span className="op-me">나</span>}
                    </span>
                  </td>
                  <td className="muted">{op.email}</td>
                  <td className="nowrap" style={{ fontVariantNumeric: "tabular-nums" }}>{op.phone ?? "-"}</td>
                  <td>{status(op)}</td>
                  <td className="muted nowrap">{lastSeen(op.last_login_at)}</td>
                  <td className="muted nowrap">{fmtDate(op.created_at)}</td>
                  <td className="nowrap"><span style={{ display: "inline-flex", gap: 6 }}>{actions(op)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="op-cards">
          {(rows ?? []).map((op, i) => (
            <div key={op.id} className="op-card">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {avatar(op, i)}
                <span style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 700 }}>{op.name}{op.is_me && <span className="op-me">나</span>}</span>
                  <span style={{ fontSize: 12, color: "#5F7290", overflow: "hidden", textOverflow: "ellipsis" }}>{op.email}</span>
                </span>
                {status(op)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, fontSize: 12 }}>
                {[["휴대폰", op.phone ?? "-"], ["마지막 접속", lastSeen(op.last_login_at)], ["추가한 날짜", fmtDate(op.created_at)]].map(([k, v]) => (
                  <span key={k} style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ color: "#5F7290" }}>{k}</span><b>{v}</b></span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>{actions(op)}</div>
            </div>
          ))}
        </div>

        {rows === null && <div className="adm-empty">불러오는 중…</div>}
        <span style={{ fontSize: 12, color: "#5F7290" }}>비밀번호를 잊은 운영자도 [링크 다시 보내기]로 새 비밀번호를 정할 수 있어요. 링크는 30분 동안 한 번만 쓸 수 있어요.</span>
      </section>

      {del && (
        <ConfirmModal danger title={`${del.name} 운영자를 삭제할까요?`} body="삭제하면 관리 화면에 로그인할 수 없어요." confirmLabel="삭제"
          onCancel={() => setDel(null)} onConfirm={doDelete} />
      )}
      {inviting && <InviteDialog onClose={() => setInviting(false)} onDone={msg => { setInviting(false); toast(msg); load(); }} />}
    </>
  );
}

function ErrLine({ children }: { children: string }) {
  return (
    <span role="alert" className="op-err">
      <span style={{ display: "flex", marginTop: 2 }}><Icon name="info" size={13} color="#E5484D" width={2.2} /></span>{children}
    </span>
  );
}

function InviteDialog({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailErr, setEmailErr] = useState<"member" | "dup" | null>(null);
  const [serverErr, setServerErr] = useState("");
  const [sending, setSending] = useState(false);

  const digits = phone.replace(/[^0-9]/g, "");
  const phBad = phone.length > 0 && !/^01[016789][0-9]{7,8}$/.test(digits);
  const ok = name.trim().length > 0 && /.+@.+/.test(email.trim()) && !emailErr && phone.length > 0 && !phBad;
  const bd = (err: boolean, v: string) => (err ? "#E5484D" : v ? "#7DBBFF" : "#DDEAF7");

  const submit = async () => {
    if (!ok || sending) return;
    setSending(true);
    setServerErr("");
    try {
      const r = await inviteOperator({ name: name.trim(), email: email.trim(), phone });
      onDone(r.message);
    } catch (e: any) {
      const code = e?.response?.data?.error_code;
      if (code === "ERR_OPERATOR_001") setEmailErr("member");
      else if (code === "ERR_OPERATOR_002") setEmailErr("dup");
      else setServerErr(errorMessage(e, "초대 문자를 보내지 못했어요."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="adm-modal-bg" style={{ padding: 16, overflowY: "auto" }} onClick={onClose}>
      <div role="dialog" aria-label="운영자 초대" className="op-dialog" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>운영자 초대</h2>
            <span style={{ fontSize: 13, color: "#5F7290" }}>함께 관리 화면을 쓸 사람을 추가해요</span>
          </span>
          <button type="button" aria-label="닫기" onClick={onClose}
            style={{ width: 40, height: 40, border: 0, background: "transparent", color: "#5F7290", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="adm-field">
          <label htmlFor="opn" className="adm-label">이름</label>
          <div className="op-input" style={{ borderColor: bd(false, name) }}>
            <span style={{ color: "#8FA3BF", display: "flex" }}><Icon name="user" /></span>
            <input id="opn" value={name} onChange={e => setName(e.target.value)} placeholder="예: 박재현" maxLength={50} />
          </div>
        </div>

        <div className="adm-field">
          <label htmlFor="ope" className="adm-label">이메일 (로그인 아이디)</label>
          <div className="op-input" style={{ borderColor: bd(!!emailErr, email) }}>
            <span style={{ color: "#8FA3BF", display: "flex" }}><Icon name="sms" /></span>
            <input id="ope" type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailErr(null); }} placeholder="name@회사도메인" />
          </div>
          {emailErr === "member" && <ErrLine>이미 앱 회원이 쓰는 이메일이에요. 다른 이메일을 써주세요.</ErrLine>}
          {emailErr === "dup" && <ErrLine>이미 등록된 운영자예요.</ErrLine>}
          <span className="op-help">관리 화면에 로그인할 때 쓰는 아이디예요</span>
        </div>

        <div className="adm-field">
          <label htmlFor="opp" className="adm-label">휴대폰 번호</label>
          <div className="op-input" style={{ borderColor: bd(phBad, phone) }}>
            <span style={{ color: "#8FA3BF", display: "flex" }}><Icon name="phone" /></span>
            <input id="opp" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" />
          </div>
          {phBad && <ErrLine>휴대폰 번호 형식이 맞지 않아요. 010-0000-0000처럼 입력해주세요.</ErrLine>}
        </div>

        <div className="adm-info">
          <span style={{ display: "flex", marginTop: 1 }}><Icon name="info" size={16} /></span>
          <span>입력한 휴대폰으로 비밀번호 설정 링크를 보내요(30분, 1회용). 비밀번호는 받은 사람이 직접 정해요.</span>
        </div>
        {serverErr && <ErrLine>{serverErr}</ErrLine>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="adm-btn" onClick={onClose} style={{ height: 46, padding: "0 18px" }}>취소</button>
          <button type="button" className="adm-btn primary" onClick={submit} disabled={!ok || sending}
            style={{ height: 46, padding: "0 18px", ...(ok ? {} : { background: "#B9D6F7", boxShadow: "none" }) }}>
            <Icon name="sms" size={16} />{sending ? "보내는 중…" : "초대 문자 보내기"}
          </button>
        </div>
      </div>
    </div>
  );
}
