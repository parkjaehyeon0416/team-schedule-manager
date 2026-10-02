// ★ v18.40 — 운영자용 공지·이벤트 관리 (앱의 공지·이벤트 화면에 그대로 노출됨)
import { useEffect, useState } from "react";
import {
  App, Button, DatePicker, Form, Input, Modal, Popconfirm, Radio, Select, Space, Switch, Table, Tag, Typography, Upload,
} from "antd";
import { DeleteOutlined, EditOutlined, MinusCircleOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { createNotice, deleteNotice, getAdminNotices, updateNotice } from "../api/notice";
import type { AdminNotice, NoticeType } from "../api/notice";

// 이벤트 "참여하기" 버튼이 앱에서 이동할 화면
const CTA_ROUTES = [
  { value: "SiteList", label: "현장 목록" },
  { value: "Schedule", label: "일정" },
  { value: "QuoteList", label: "견적서" },
  { value: "BusinessCard", label: "내 명함" },
  { value: "Team", label: "팀 관리" },
  { value: "NoticeList", label: "공지 · 이벤트" },
];

type FormValues = {
  type: NoticeType;
  title: string;
  summary?: string;
  body?: string;
  info?: { label: string; value: string }[];
  steps?: { title: string; desc?: string }[];
  cautions?: string[];
  cta_label?: string;
  cta_route?: string;
  is_pinned?: boolean;
  period?: [Dayjs, Dayjs] | null;
  published: boolean;
};

function eventStatus(n: AdminNotice): { label: string; color: string } | null {
  if (n.type !== "event") return null;
  const today = dayjs().startOf("day");
  if (n.starts_at && today.isBefore(dayjs(n.starts_at))) return { label: "예정", color: "blue" };
  if (n.ends_at && today.isAfter(dayjs(n.ends_at))) return { label: "종료", color: "default" };
  return { label: "진행중", color: "orange" };
}

export default function Notices() {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [items, setItems] = useState<AdminNotice[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<NoticeType | "all">("all");
  const [editing, setEditing] = useState<AdminNotice | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bannerFile, setBannerFile] = useState<UploadFile[]>([]);
  const [removeBanner, setRemoveBanner] = useState(false);
  const type = Form.useWatch("type", form);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await getAdminNotices(filter === "all" ? undefined : filter));
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const openCreate = () => {
    setEditing(null);
    setBannerFile([]);
    setRemoveBanner(false);
    form.resetFields();
    form.setFieldsValue({ type: "notice", published: true, is_pinned: false, info: [], steps: [], cautions: [] });
    setOpen(true);
  };

  const openEdit = (n: AdminNotice) => {
    setEditing(n);
    setBannerFile([]);
    setRemoveBanner(false);
    form.resetFields();
    form.setFieldsValue({
      type: n.type,
      title: n.title,
      summary: n.summary ?? undefined,
      body: n.body ?? undefined,
      info: n.info ?? [],
      steps: (n.steps ?? []).map(s => ({ title: s.title, desc: s.desc ?? undefined })),
      cautions: n.cautions ?? [],
      cta_label: n.cta_label ?? undefined,
      cta_route: n.cta_route ?? undefined,
      is_pinned: n.is_pinned,
      period: n.starts_at && n.ends_at ? [dayjs(n.starts_at), dayjs(n.ends_at)] : undefined,
      published: !!n.published_at,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const v = await form.validateFields();
    const isEvent = v.type === "event";
    const input = {
      type: v.type,
      title: v.title.trim(),
      summary: v.summary?.trim() || null,
      body: v.body?.trim() || null,
      info: (v.info ?? []).filter(r => r?.label && r?.value),
      steps: isEvent ? (v.steps ?? []).filter(s => s?.title) : [],
      cautions: isEvent ? (v.cautions ?? []).filter(Boolean) : [],
      cta_label: isEvent ? v.cta_label?.trim() || null : null,
      cta_route: isEvent ? v.cta_route || null : null,
      is_pinned: !isEvent && !!v.is_pinned,
      starts_at: isEvent && v.period ? v.period[0].format("YYYY-MM-DD") : null,
      ends_at: isEvent && v.period ? v.period[1].format("YYYY-MM-DD") : null,
      published: v.published,
      banner: isEvent ? (bannerFile[0]?.originFileObj as File | undefined) ?? null : null,
      remove_banner: removeBanner,
    };

    setSaving(true);
    try {
      if (editing) await updateNotice(editing.id, input);
      else await createNotice(input);
      message.success(editing ? "수정했습니다." : "등록했습니다.");
      setOpen(false);
      load();
    } catch (e: any) {
      const errors = e?.response?.data?.errors;
      message.error(errors ? (Object.values(errors)[0] as string[])[0] : e?.response?.data?.message ?? "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (n: AdminNotice) => {
    try {
      await deleteNotice(n.id);
      message.success("삭제했습니다.");
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "삭제하지 못했습니다.");
    }
  };

  return (
    <div>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>공지 · 이벤트 관리</Typography.Title>
        <Space>
          <Radio.Group value={filter} onChange={e => setFilter(e.target.value)} optionType="button"
            options={[{ label: "전체", value: "all" }, { label: "공지", value: "notice" }, { label: "이벤트", value: "event" }]} />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>새로 작성</Button>
        </Space>
      </Space>

      <Table<AdminNotice>
        rowKey="id"
        loading={loading}
        dataSource={items}
        pagination={{ pageSize: 20 }}
        columns={[
          {
            title: "구분", dataIndex: "type", width: 90,
            render: (t: NoticeType) => <Tag color={t === "event" ? "orange" : "blue"}>{t === "event" ? "이벤트" : "공지"}</Tag>,
          },
          {
            title: "제목", dataIndex: "title",
            render: (title: string, n) => (
              <Space>
                {n.is_pinned && <Tag color="volcano">중요</Tag>}
                <a onClick={() => openEdit(n)}>{title}</a>
              </Space>
            ),
          },
          {
            title: "상태", width: 160,
            render: (_, n) => {
              const ev = eventStatus(n);
              return (
                <Space>
                  {n.published_at ? <Tag color="green">게시중</Tag> : <Tag>임시저장</Tag>}
                  {ev && <Tag color={ev.color}>{ev.label}</Tag>}
                </Space>
              );
            },
          },
          {
            title: "기간", width: 200,
            render: (_, n) => (n.type === "event" && n.starts_at ? `${n.starts_at} ~ ${n.ends_at ?? ""}` : "-"),
          },
          {
            title: "게시일", dataIndex: "published_at", width: 150,
            render: (d: string | null) => (d ? dayjs(d).format("YYYY.MM.DD HH:mm") : "-"),
          },
          {
            title: "", width: 110,
            render: (_, n) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(n)} />
                <Popconfirm title="삭제할까요?" description="앱에서도 바로 사라집니다." okText="삭제" cancelText="취소"
                  okButtonProps={{ danger: true }} onConfirm={() => handleDelete(n)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? "공지 · 이벤트 수정" : "공지 · 이벤트 작성"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        okText={editing ? "저장" : "등록"}
        cancelText="취소"
        confirmLoading={saving}
        width={720}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="type" label="구분">
            <Radio.Group optionType="button" options={[{ label: "공지", value: "notice" }, { label: "이벤트", value: "event" }]} />
          </Form.Item>
          <Form.Item name="title" label="제목" rules={[{ required: true, message: "제목을 입력하세요" }, { max: 150 }]}>
            <Input placeholder={type === "event" ? "예: 시공 전·후 사진 콘테스트" : "예: [점검] 10월 8일(목) 서버 점검 안내"} />
          </Form.Item>
          <Form.Item name="summary" label="한 줄 요약" extra={type === "event" ? "이벤트 상세 제목 아래에 표시돼요." : "목록 미리보기용(선택)."}>
            <Input maxLength={255} />
          </Form.Item>

          {type === "event" && (
            <>
              <Form.Item name="period" label="이벤트 기간" rules={[{ required: true, message: "기간을 선택하세요" }]}>
                <DatePicker.RangePicker style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item label="배너 이미지 (선택)" extra="없으면 기본 선물 그림이 표시돼요. 가로로 긴 이미지 권장.">
                <Space direction="vertical">
                  <Upload accept="image/*" maxCount={1} beforeUpload={() => false} fileList={bannerFile}
                    onChange={({ fileList }) => { setBannerFile(fileList); if (fileList.length) setRemoveBanner(false); }}>
                    <Button icon={<UploadOutlined />}>이미지 선택</Button>
                  </Upload>
                  {editing?.banner_path && !bannerFile.length && (
                    <Space>
                      <img src={`/storage/${editing.banner_path}`} alt="" style={{ height: 60, borderRadius: 6, opacity: removeBanner ? 0.3 : 1 }} />
                      <Switch checked={removeBanner} onChange={setRemoveBanner} /> 기존 배너 삭제
                    </Space>
                  )}
                </Space>
              </Form.Item>
            </>
          )}

          <Form.Item name="body" label="본문" extra="빈 줄로 문단을 나눠요. '- '로 시작하는 줄은 목록(•)으로 보여요.">
            <Input.TextArea rows={6} />
          </Form.Item>

          <Typography.Text strong>정보표</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ margin: "2px 0 8px" }}>
            {type === "event" ? "예: 대상 / 혜택 / 발표 (기간은 자동으로 맨 위에 표시돼요)" : "예: 점검 일시 / 대상 / 영향"}
          </Typography.Paragraph>
          <Form.List name="info">
            {(fields, { add, remove }) => (
              <>
                {fields.map(f => (
                  <Space key={f.key} align="baseline" style={{ display: "flex" }}>
                    <Form.Item name={[f.name, "label"]} rules={[{ required: true, message: "항목" }]}><Input placeholder="항목" style={{ width: 120 }} /></Form.Item>
                    <Form.Item name={[f.name, "value"]} rules={[{ required: true, message: "내용" }]}><Input placeholder="내용" style={{ width: 440 }} /></Form.Item>
                    <MinusCircleOutlined onClick={() => remove(f.name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} style={{ marginBottom: 16 }}>정보 추가</Button>
              </>
            )}
          </Form.List>

          {type === "event" && (
            <>
              <Typography.Text strong style={{ display: "block" }}>참여 방법</Typography.Text>
              <Form.List name="steps">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((f, i) => (
                      <Space key={f.key} align="baseline" style={{ display: "flex", marginTop: 8 }}>
                        <span>{i + 1}.</span>
                        <Form.Item name={[f.name, "title"]} rules={[{ required: true, message: "단계 제목" }]}><Input placeholder="단계 제목" style={{ width: 180 }} /></Form.Item>
                        <Form.Item name={[f.name, "desc"]}><Input placeholder="설명(선택)" style={{ width: 380 }} /></Form.Item>
                        <MinusCircleOutlined onClick={() => remove(f.name)} />
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} style={{ margin: "8px 0 16px" }}>단계 추가</Button>
                  </>
                )}
              </Form.List>

              <Typography.Text strong style={{ display: "block" }}>유의사항</Typography.Text>
              <Form.List name="cautions">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(f => (
                      <Space key={f.key} align="baseline" style={{ display: "flex", marginTop: 8 }}>
                        <Form.Item name={f.name} rules={[{ required: true, message: "내용" }]}><Input style={{ width: 600 }} /></Form.Item>
                        <MinusCircleOutlined onClick={() => remove(f.name)} />
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} style={{ margin: "8px 0 16px" }}>유의사항 추가</Button>
                  </>
                )}
              </Form.List>

              <Space style={{ display: "flex" }}>
                <Form.Item name="cta_label" label="참여 버튼 문구"><Input placeholder="예: 현장 사진 올리러 가기" style={{ width: 300 }} /></Form.Item>
                <Form.Item name="cta_route" label="버튼 누르면 이동할 앱 화면"><Select allowClear options={CTA_ROUTES} placeholder="선택" style={{ width: 200 }} /></Form.Item>
              </Space>
            </>
          )}

          <Space size="large">
            {type !== "event" && (
              <Form.Item name="is_pinned" label="중요 공지 (목록 맨 위 고정)" valuePropName="checked"><Switch /></Form.Item>
            )}
            <Form.Item name="published" label="앱에 게시" valuePropName="checked" extra="끄면 임시저장(앱에 안 보임)"><Switch /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
