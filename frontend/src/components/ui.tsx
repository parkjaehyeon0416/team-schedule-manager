// ★ v18.41 — 운영자 웹 공통 UI (토스트, 확인 모달, 페이지 머리말, 세그먼트 탭, 스위치)
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";

// ── 토스트 ─────────────────────────────
type Toast = { text: string; err?: boolean } | null;
const ToastCtx = createContext<(text: string, err?: boolean) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>(null);
  const show = useCallback((text: string, err = false) => {
    setToast({ text, err });
    window.setTimeout(() => setToast(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && <div role="status" className={`adm-toast${toast.err ? " err" : ""}`}>{toast.text}</div>}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// 서버 오류 메시지 꺼내기 (검증 오류면 첫 항목)
export function errorMessage(e: any, fallback: string): string {
  const errors = e?.response?.data?.errors;
  if (errors) return (Object.values(errors)[0] as string[])[0];
  return e?.response?.data?.message ?? fallback;
}

// ── 확인 모달 ───────────────────────────
export function ConfirmModal({ title, body, confirmLabel, danger, onCancel, onConfirm, children }: {
  title: string; body?: ReactNode; confirmLabel: string; danger?: boolean; onCancel: () => void; onConfirm: () => void; children?: ReactNode;
}) {
  return (
    <div className="adm-modal-bg" onClick={e => { e.stopPropagation(); onCancel(); }}>
      <div role="alertdialog" aria-label={title} className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-icon" style={{ background: danger ? "#FFECEC" : "#E8F3FF", color: danger ? "#E5484D" : "#0A6CE0" }}>
          <Icon name={danger ? "trash" : "info"} size={22} />
        </div>
        <h2>{title}</h2>
        {body && <p>{body}</p>}
        {children}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button type="button" className="adm-btn" onClick={onCancel}>취소</button>
          <button type="button" className={`adm-btn ${danger ? "danger" : "primary"}`} onClick={onConfirm}>
            {danger && <Icon name="trash" size={16} />}{confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 페이지 머리말 (경로 + 제목 + 오른쪽 버튼) ─────
export function PageHeader({ crumbs, title, actions }: { crumbs: { label: string; to?: string }[]; title: string; actions?: ReactNode }) {
  return (
    <header className="adm-head">
      <div>
        <span className="adm-crumb">
          {crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 && <span className="sep">/</span>}
              {c.to ? <Link to={c.to}>{c.label}</Link> : c.label}
            </span>
          ))}
        </span>
        <h1 className="adm-h1">{title}</h1>
      </div>
      {actions && <div className="adm-actions">{actions}</div>}
    </header>
  );
}

// ── 세그먼트 탭 ─────────────────────────
export function Segmented<T extends string | number>({ items, value, onChange, width }: {
  items: { label: string; value: T }[]; value: T; onChange: (v: T) => void; width?: number;
}) {
  return (
    <div role="tablist" className="adm-seg" style={{ width, maxWidth: "100%" }}>
      {items.map(it => (
        <button key={String(it.value)} type="button" role="tab" aria-selected={it.value === value}
          className={it.value === value ? "on" : ""} onClick={() => onChange(it.value)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ── 스위치 ──────────────────────────────
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`adm-switch${checked ? " on" : ""}`}
      onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

// ── 검색 입력 ───────────────────────────
export function SearchInput({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <div className="adm-input-wrap" style={{ width: 300, maxWidth: "100%" }}>
      <span style={{ color: "#8FA3BF", display: "flex" }}><Icon name="search" /></span>
      <input aria-label={label} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

export function fmtDate(d?: string | null, withTime = false): string {
  if (!d) return "-";
  const x = new Date(d);
  const p = (n: number) => String(n).padStart(2, "0");
  const base = `${x.getFullYear()}.${p(x.getMonth() + 1)}.${p(x.getDate())}`;
  return withTime ? `${base} ${p(x.getHours())}:${p(x.getMinutes())}` : base;
}
