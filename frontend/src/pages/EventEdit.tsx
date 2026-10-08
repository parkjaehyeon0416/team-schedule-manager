// ★ v18.41 — 이벤트 작성·수정 (DESIGN-CANVAS ADMIN_EVENT_EDIT) — 왼쪽 입력, 오른쪽 앱 미리보기
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createNotice, deleteNotice, getAdminNotice, updateNotice, type AdminNotice } from "../api/notice";
import Icon from "../components/Icon";
import ImageUpload from "../components/ImageUpload";
import { ConfirmModal, PageHeader, errorMessage, useToast } from "../components/ui";
import { period, runState } from "./EventList";
import iconGift from "../assets/icons/gift.png";

// 앱에서 "참여 버튼"을 누르면 이동할 화면
const CTA_ROUTES = [
  { value: "SiteList", label: "현장 목록" },
  { value: "Schedule", label: "일정" },
  { value: "QuoteList", label: "견적서" },
  { value: "BusinessCard", label: "내 명함" },
  { value: "Team", label: "팀 관리" },
  { value: "NoticeList", label: "공지 · 이벤트" },
];
const INFO_LABELS = ["대상", "혜택", "발표"] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{title}</h2>
      {children}
    </div>
  );
}

export default function EventEdit() {
  const { id } = useParams();
  const editingId = id ? Number(id) : null;
  const navigate = useNavigate();
  const toast = useToast();

  const [loaded, setLoaded] = useState<AdminNotice | null>(null);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [summary, setSummary] = useState("");
  const [info, setInfo] = useState<Record<string, string>>({ 대상: "", 혜택: "", 발표: "" });
  const [steps, setSteps] = useState<string[]>([""]);
  const [cautions, setCautions] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaRoute, setCtaRoute] = useState("SiteList");
  const [banner, setBanner] = useState<File | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [askDelete, setAskDelete] = useState(false);

  useEffect(() => {
    if (!editingId) return;
    getAdminNotice(editingId)
      .then(n => {
        setLoaded(n);
        setTitle(n.title);
        setStart(n.starts_at?.slice(0, 10) ?? "");
        setEnd(n.ends_at?.slice(0, 10) ?? "");
        setSummary(n.summary ?? "");
        const map: Record<string, string> = { 대상: "", 혜택: "", 발표: "" };
        (n.info ?? []).forEach(r => { map[r.label] = r.value; });
        setInfo(map);
        setSteps(n.steps?.length ? n.steps.map(s => s.title) : [""]);
        setCautions((n.cautions ?? []).join("\n"));
        setCtaLabel(n.cta_label ?? "");
        setCtaRoute(n.cta_route ?? "SiteList");
        setSaved(n.published_at ? "게시됨 · 기간 중 앱에 노출돼요" : "임시저장됨 · 앱에는 보이지 않아요");
      })
      .catch(e => { toast(errorMessage(e, "이벤트를 불러오지 못했어요."), true); navigate("/events"); });
  }, [editingId, navigate, toast]);

  const save = async (publish: boolean) => {
    if (!title.trim()) { toast("이벤트명을 입력해주세요.", true); return; }
    if (!start || !end) { toast("이벤트 기간을 선택해주세요.", true); return; }
    if (end < start) { toast("종료일이 시작일보다 빨라요.", true); return; }
    setSaving(true);
    try {
      // 정보표: 대상·혜택·발표 + 예전에 넣어둔 다른 항목은 유지
      const extraInfo = (loaded?.info ?? []).filter(r => !INFO_LABELS.includes(r.label as (typeof INFO_LABELS)[number]));
      const input = {
        type: "event" as const,
        title: title.trim(),
        summary: summary.trim() || null,
        body: loaded?.body ?? null,
        info: [...INFO_LABELS.filter(l => info[l]?.trim()).map(l => ({ label: l, value: info[l].trim() })), ...extraInfo],
        steps: steps.map(s => s.trim()).filter(Boolean).map((t, i) => ({ title: t, desc: loaded?.steps?.[i]?.title === t ? loaded.steps[i].desc ?? null : null })),
        cautions: cautions.split("\n").map(c => c.trim()).filter(Boolean),
        cta_label: ctaLabel.trim() || null,
        cta_route: ctaLabel.trim() ? ctaRoute : null,
        starts_at: start,
        ends_at: end,
        published: publish,
        banner,
        remove_banner: removeBanner,
      };
      const result = editingId ? await updateNotice(editingId, input) : await createNotice(input);
      setLoaded(result);
      setBanner(null);
      setRemoveBanner(false);
      setSaved(publish ? "게시됨 · 기간 중 앱에 노출돼요" : "임시저장됨 · 앱에는 보이지 않아요");
      toast(publish ? "게시했어요." : "임시저장했어요.");
      if (!editingId) navigate(`/events/${result.id}`, { replace: true });
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
      navigate("/events");
    } catch (e) {
      toast(errorMessage(e, "삭제하지 못했어요."), true);
    }
  };

  const existingBanner = loaded?.banner_path ? `/storage/${loaded.banner_path}` : null;
  const previewBanner = banner ? URL.createObjectURL(banner) : !removeBanner ? existingBanner : null;
  const run = start || end ? runState({ starts_at: start || null, ends_at: end || null }) : "진행중";
  const validSteps = steps.filter(s => s.trim());

  return (
    <>
      <PageHeader
        crumbs={[{ label: "콘텐츠" }, { label: "이벤트 관리", to: "/events" }, { label: editingId ? "수정" : "작성" }]}
        title={editingId ? "이벤트 수정" : "새 이벤트 만들기"}
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
        <section className="adm-card" style={{ padding: 24, gap: 20, flex: "1 1 520px", maxWidth: "100%" }}>
          <div className="adm-field">
            <label className="adm-label" htmlFor="etitle">이벤트명</label>
            <input id="etitle" className="adm-input" maxLength={150} value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 시공 전·후 사진 콘테스트" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div className="adm-field">
              <label className="adm-label" htmlFor="estart">시작일</label>
              <input id="estart" type="date" className="adm-input" value={start} onChange={e => setStart(e.target.value)} />
            </div>
            <div className="adm-field">
              <label className="adm-label" htmlFor="eend">종료일</label>
              <input id="eend" type="date" className="adm-input" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="adm-field">
            <label className="adm-label" htmlFor="esummary">한 줄 소개</label>
            <textarea id="esummary" className="adm-textarea" rows={2} maxLength={255} value={summary} onChange={e => setSummary(e.target.value)} placeholder="앱 이벤트 상세 상단에 보여요" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            {INFO_LABELS.map(l => (
              <div key={l} className="adm-field">
                <label className="adm-label" htmlFor={`einfo-${l}`}>{l}</label>
                <input id={`einfo-${l}`} className="adm-input" value={info[l]} onChange={e => setInfo(prev => ({ ...prev, [l]: e.target.value }))}
                  placeholder={l === "대상" ? "현장메이트 회원 누구나" : l === "혜택" ? "[경품 내용]" : "2026.11.07 · 앱 알림"} />
              </div>
            ))}
          </div>

          <Section title="배너 이미지">
            <ImageUpload file={banner} existingUrl={existingBanner} removed={removeBanner} onFile={setBanner} onRemove={setRemoveBanner}
              height={120} hint="배너 이미지 올리기 · 권장 1080 × 540px · JPG/PNG 5MB 이하 (없으면 기본 선물 그림)" />
          </Section>

          <Section title="참여 방법">
            {steps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(180deg,#2492FF 0%,#0A6CE0 100%)", color: "#FFFFFF", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                <input className="adm-input" style={{ height: 44 }} value={s} placeholder="참여 방법을 입력하세요" aria-label={`참여 방법 ${i + 1}`}
                  onChange={e => setSteps(prev => prev.map((x, j) => (j === i ? e.target.value : x)))} />
                <button type="button" aria-label="단계 삭제" className="adm-pin" style={{ color: "#8FA3BF" }}
                  onClick={() => setSteps(prev => (prev.length > 1 ? prev.filter((_, j) => j !== i) : [""]))}>
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}
            <button type="button" className="adm-btn sm" style={{ alignSelf: "flex-start" }} onClick={() => setSteps(prev => [...prev, ""])}>
              <Icon name="plus" size={15} />단계 추가
            </button>
          </Section>

          <Section title="유의사항">
            <div className="adm-field">
              <label className="adm-label" htmlFor="ecautions">유의사항 (줄마다 한 항목)</label>
              <textarea id="ecautions" className="adm-textarea" rows={4} value={cautions} onChange={e => setCautions(e.target.value)}
                placeholder={"직접 시공한 현장 사진만 인정돼요.\n고객 개인정보가 보이는 사진은 제외돼요."} />
            </div>
          </Section>

          <Section title="참여 버튼">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div className="adm-field">
                <label className="adm-label" htmlFor="ecta">버튼 문구</label>
                <input id="ecta" className="adm-input" maxLength={50} value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} placeholder="예: 현장 사진 올리러 가기 (비우면 버튼 없음)" />
              </div>
              <div className="adm-field">
                <label className="adm-label" htmlFor="eroute">누르면 이동할 화면</label>
                <select id="eroute" className="adm-select" value={ctaRoute} onChange={e => setCtaRoute(e.target.value)} disabled={!ctaLabel.trim()}>
                  {CTA_ROUTES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <span className="adm-hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="info" size={14} />이벤트가 끝나면 버튼을 “종료된 이벤트”로 자동 비활성화해요.
            </span>
          </Section>
        </section>

        <div className="adm-prev">
          <span style={{ fontSize: 13, fontWeight: 700, color: "#5F7290" }}>앱 미리보기</span>
          <div className="adm-phone">
            <div className="adm-phone-bar">이벤트</div>
            <div className="adm-phone-body" style={{ background: "#F7FBFF" }}>
              <div style={{ height: 140, borderRadius: 14, overflow: "hidden", position: "relative", background: "linear-gradient(150deg,#FFE3BF 0%,#FFC57A 100%)", flexShrink: 0 }}>
                {previewBanner ? (
                  <img src={previewBanner} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <>
                    <span style={{ position: "absolute", left: 12, top: 12, height: 20, padding: "0 8px", borderRadius: 10, background: "#FFFFFF", color: "#B95E00", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center" }}>EVENT</span>
                    <span style={{ position: "absolute", left: 12, bottom: 12, right: 80, fontSize: 15, fontWeight: 800, color: "#5A2E00", lineHeight: 1.35 }}>{title || "이벤트명"}</span>
                    <img src={iconGift} alt="" width={70} height={70} style={{ position: "absolute", right: 8, bottom: 8, objectFit: "contain" }} />
                  </>
                )}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <span className={`adm-badge ${run === "종료" ? "" : run === "예정" ? "blue" : "orange"}`}>{run}</span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 800 }}>{title || "이벤트명"}</span>
              {summary && <span style={{ fontSize: 12, color: "#5F7290" }}>{summary}</span>}
              <span style={{ fontSize: 12, color: "#5F7290" }}>{start && end ? period({ starts_at: start, ends_at: end }) : "기간을 선택하세요"}</span>
              {validSteps.length > 0 && (
                <>
                  <span style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>참여 방법</span>
                  {validSteps.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#0A6CE0", color: "#FFFFFF", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 12, lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
                </>
              )}
              {ctaLabel.trim() && (
                <div style={{
                  marginTop: 6, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700,
                  background: run === "종료" ? "#EEF2F7" : "linear-gradient(180deg,#2492FF 0%,#0A6CE0 100%)", color: run === "종료" ? "#8FA3BF" : "#FFFFFF",
                }}>
                  {run === "종료" ? "종료된 이벤트" : ctaLabel}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {askDelete && (
        <ConfirmModal danger title="이벤트를 삭제할까요?" confirmLabel="삭제" onCancel={() => setAskDelete(false)} onConfirm={remove}
          body={<>“{title}”<br />삭제하면 앱에서 바로 사라지고 되돌릴 수 없어요.</>} />
      )}
    </>
  );
}
