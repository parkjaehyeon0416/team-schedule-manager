// ★ v18.41 — 공지 작성·수정 (DESIGN-CANVAS ADMIN_NOTICE_EDIT) — 왼쪽 입력, 오른쪽 앱 미리보기
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createNotice, deleteNotice, getAdminNotice, updateNotice, type AdminNotice } from "../api/notice";
import Icon from "../components/Icon";
import BodyPreview from "../components/BodyPreview";
import ImageUpload from "../components/ImageUpload";
import { ConfirmModal, PageHeader, Switch, errorMessage, fmtDate, useToast } from "../components/ui";

// 선택한 글자를 감싸거나(굵게/기울임/밑줄), 선택한 줄 앞에 기호를 붙임(글머리/번호)
function applyFormat(el: HTMLTextAreaElement, kind: "b" | "i" | "u" | "ul" | "ol"): { value: string; cursor: number } {
  const { value, selectionStart: s, selectionEnd: e } = el;
  if (kind === "b" || kind === "i" || kind === "u") {
    const mark = kind === "b" ? "**" : kind === "u" ? "__" : "*";
    const sel = value.slice(s, e) || "텍스트";
    return { value: value.slice(0, s) + mark + sel + mark + value.slice(e), cursor: s + mark.length + sel.length + mark.length };
  }
  const lineStart = value.lastIndexOf("\n", s - 1) + 1;
  const lineEnd = value.indexOf("\n", e) === -1 ? value.length : value.indexOf("\n", e);
  const lines = value.slice(lineStart, lineEnd).split("\n")
    .map((l, i) => (kind === "ul" ? `- ${l.replace(/^\s*([-•·]|\d+[.)])\s+/, "")}` : `${i + 1}. ${l.replace(/^\s*([-•·]|\d+[.)])\s+/, "")}`));
  const block = lines.join("\n");
  return { value: value.slice(0, lineStart) + block + value.slice(lineEnd), cursor: lineStart + block.length };
}

export default function NoticeEdit() {
  const { id } = useParams();
  const editingId = id ? Number(id) : null;
  const navigate = useNavigate();
  const toast = useToast();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [loaded, setLoaded] = useState<AdminNotice | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pin, setPin] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [askDelete, setAskDelete] = useState(false);

  useEffect(() => {
    if (!editingId) return;
    getAdminNotice(editingId)
      .then(n => {
        setLoaded(n);
        setTitle(n.title);
        setBody(n.body ?? "");
        setPin(n.is_pinned);
        setSaved(n.published_at ? "게시됨 · 앱 공지 목록에 노출 중" : "임시저장됨 · 앱에는 보이지 않아요");
      })
      .catch(e => { toast(errorMessage(e, "공지를 불러오지 못했어요."), true); navigate("/notices"); });
  }, [editingId, navigate, toast]);

  const format = (kind: "b" | "i" | "u" | "ul" | "ol") => {
    const el = bodyRef.current;
    if (!el) return;
    const { value, cursor } = applyFormat(el, kind);
    setBody(value);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cursor, cursor); });
  };

  const save = async (publish: boolean) => {
    if (!title.trim()) { toast("제목을 입력해주세요.", true); return; }
    setSaving(true);
    try {
      const input = {
        type: "notice" as const,
        title: title.trim(),
        summary: loaded?.summary ?? null,
        body: body.trim() || null,
        info: loaded?.info ?? [], // 예전에 넣어둔 정보표는 그대로 유지
        is_pinned: pin,
        published: publish,
        banner: image,
        remove_banner: removeImage,
      };
      const result = editingId ? await updateNotice(editingId, input) : await createNotice(input);
      setLoaded(result);
      setImage(null);
      setRemoveImage(false);
      setSaved(publish ? "게시됨 · 앱 공지 목록에 노출 중" : "임시저장됨 · 앱에는 보이지 않아요");
      toast(publish ? "게시했어요. 앱 공지 목록에 바로 보여요." : "임시저장했어요.");
      if (!editingId) navigate(`/notices/${result.id}`, { replace: true });
    } catch (e) {
      toast(errorMessage(e, "저장하지 못했어요."), true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setAskDelete(false);
    if (!editingId) return;
    try {
      await deleteNotice(editingId);
      toast("삭제했어요.");
      navigate("/notices");
    } catch (e) {
      toast(errorMessage(e, "삭제하지 못했어요."), true);
    }
  };

  const existingImage = loaded?.banner_path ? `/storage/${loaded.banner_path}` : null;
  const previewImage = image ? URL.createObjectURL(image) : !removeImage ? existingImage : null;
  const toolBtn = { width: 32, height: 32, border: 0, borderRadius: 6, background: "transparent", fontSize: 14, color: "#3B4F70", cursor: "pointer" } as const;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "콘텐츠" }, { label: "공지 관리", to: "/notices" }, { label: editingId ? "수정" : "작성" }]}
        title={editingId ? "공지 수정" : "새 공지 작성"}
        actions={
          <>
            {saved && (
              <span role="status" style={{ fontSize: 13, color: "#0B8574", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="check" size={15} />{saved}
              </span>
            )}
            {editingId && <button type="button" className="adm-btn danger" onClick={() => setAskDelete(true)}><Icon name="trash" size={16} />삭제</button>}
            <button type="button" className="adm-btn" disabled={saving} onClick={() => save(false)}>임시저장</button>
            <button type="button" className="adm-btn primary" disabled={saving} onClick={() => save(true)}><Icon name="send" size={16} />게시하기</button>
          </>
        }
      />

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <section className="adm-card" style={{ padding: 24, gap: 16, flex: "1 1 520px", maxWidth: "100%" }}>
          <div className="adm-field">
            <label className="adm-label" htmlFor="ntitle">제목</label>
            <input id="ntitle" className="adm-input" value={title} maxLength={150} onChange={e => setTitle(e.target.value)} placeholder="예: [점검] 10월 8일(목) 서버 점검 안내" />
          </div>
          <div className="adm-field">
            <label className="adm-label" htmlFor="nbody">본문</label>
            <div style={{ border: "1px solid #DDEAF7", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", gap: 2, padding: "6px 8px", borderBottom: "1px solid #EDF3FA", background: "#F7FAFD" }}>
                <button type="button" aria-label="굵게" title="굵게" style={{ ...toolBtn, fontWeight: 800 }} onClick={() => format("b")}>B</button>
                <button type="button" aria-label="기울임" title="기울임" style={{ ...toolBtn, fontStyle: "italic" }} onClick={() => format("i")}>I</button>
                <button type="button" aria-label="밑줄" title="밑줄" style={{ ...toolBtn, textDecoration: "underline" }} onClick={() => format("u")}>U</button>
                <button type="button" aria-label="글머리 기호" title="글머리 기호" style={{ ...toolBtn, fontWeight: 700 }} onClick={() => format("ul")}>•</button>
                <button type="button" aria-label="번호 목록" title="번호 목록" style={{ ...toolBtn, fontWeight: 700 }} onClick={() => format("ol")}>1.</button>
                <button type="button" aria-label="이미지 넣기" title="첨부 이미지 올리기" style={{ ...toolBtn, display: "flex", alignItems: "center", justifyContent: "center" }}
                  onClick={() => document.getElementById("notice-image-anchor")?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                  <Icon name="image" size={17} />
                </button>
              </div>
              <textarea id="nbody" ref={bodyRef} rows={12} value={body} onChange={e => setBody(e.target.value)}
                placeholder={"안녕하세요, WorkMate입니다.\n\n- 목록은 줄 앞에 '- '\n- 빈 줄로 문단을 나눠요"}
                style={{ width: "100%", border: 0, outline: 0, padding: "14px 16px", font: "inherit", fontSize: 14, lineHeight: 1.7, color: "#102A56", resize: "vertical", display: "block" }} />
            </div>
          </div>
          <div className="adm-switch-row">
            <div style={{ flex: "1 1 0", display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>중요 공지로 고정</span>
              <span style={{ fontSize: 12, color: "#5F7290" }}>앱 공지 목록 맨 위에 “중요” 표시와 함께 고정돼요.</span>
            </div>
            <Switch checked={pin} onChange={setPin} label="중요 공지로 고정" />
          </div>
          <div className="adm-field" id="notice-image-anchor">
            <span className="adm-label">첨부 이미지</span>
            <ImageUpload file={image} existingUrl={existingImage} removed={removeImage} onFile={setImage} onRemove={setRemoveImage}
              hint="이미지를 끌어오거나 클릭해서 올리기 (선택)" />
          </div>
        </section>

        <div className="adm-prev">
          <span style={{ fontSize: 13, fontWeight: 700, color: "#5F7290" }}>앱 미리보기</span>
          <div className="adm-phone">
            <div className="adm-phone-bar">공지사항</div>
            <div className="adm-phone-body">
              <div style={{ display: "flex", gap: 4 }}>
                <span className="adm-badge blue">공지</span>
                {pin && <span className="adm-badge orange">중요</span>}
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.45 }}>{title || "제목을 입력하세요"}</span>
              <span style={{ fontSize: 11, color: "#5F7290" }}>{loaded?.author ?? "WorkMate 운영팀"} · {fmtDate(loaded?.published_at ?? new Date().toISOString())}</span>
              <div style={{ height: 1, background: "#DDEAF7" }} />
              {previewImage && <img src={previewImage} alt="" style={{ width: "100%", borderRadius: 10 }} />}
              <BodyPreview body={body} />
            </div>
          </div>
        </div>
      </div>

      {askDelete && (
        <ConfirmModal danger title="공지를 삭제할까요?" confirmLabel="삭제" onCancel={() => setAskDelete(false)} onConfirm={remove}
          body={<>“{title}”<br />삭제하면 앱에서 바로 사라지고 되돌릴 수 없어요.</>} />
      )}
    </>
  );
}
