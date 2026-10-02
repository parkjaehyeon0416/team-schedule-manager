// ★ v18.41 — 이미지 1장 올리기 (끌어다 놓기 / 클릭). 기존 이미지 미리보기 + 삭제
import { useRef, useState, type DragEvent } from "react";
import Icon from "./Icon";

export default function ImageUpload({ file, existingUrl, removed, onFile, onRemove, hint, height = 88 }: {
  file: File | null;
  existingUrl: string | null;
  removed: boolean;
  onFile: (f: File | null) => void;
  onRemove: (removed: boolean) => void;
  hint: string;
  height?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const preview = file ? URL.createObjectURL(file) : !removed ? existingUrl : null;

  const pick = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    onFile(f);
    onRemove(false);
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => pick(e.target.files?.[0] ?? undefined)} />
      {preview ? (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid #DDEAF7" }}>
          <img src={preview} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", right: 8, bottom: 8, display: "flex", gap: 6 }}>
            <button type="button" className="adm-btn sm" onClick={() => input.current?.click()}>변경</button>
            <button type="button" className="adm-btn sm danger" onClick={() => { onFile(null); onRemove(true); }}>삭제</button>
          </div>
        </div>
      ) : (
        <button type="button" className="adm-drop" style={{ height, borderColor: over ? "#0A6CE0" : undefined }}
          onClick={() => input.current?.click()} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
          <Icon name="image" size={20} />
          {hint}
        </button>
      )}
    </div>
  );
}
