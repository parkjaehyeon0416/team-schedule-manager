import { useState } from "react";
import {
  Typography, Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker,
  Space, Tag, message, Popconfirm, AutoComplete, Divider,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, DeleteOutlined, DownloadOutlined, FileDoneOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  getQuotes, createQuote, approveQuote, deleteQuote, downloadQuotePdf, getMaterials,
} from "../api/quote";
import type { Quote, QuoteLine } from "../api/quote";
import { getWorkTypes } from "../api/workType";
import { formatCurrency } from "../utils/format";

const STATUS_LABEL: Record<Quote["status"], { text: string; color: string }> = {
  draft: { text: "작성중", color: "default" },
  sent: { text: "전달됨", color: "blue" },
  approved: { text: "승인됨", color: "green" },
  rejected: { text: "반려", color: "red" },
};

type LineForm = QuoteLine;

const emptyLine = (): LineForm => ({ name: "", spec: "", quantity: 1, unit: "개", unit_price: 0 });

export default function Quotes() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [lines, setLines] = useState<LineForm[]>([emptyLine()]);
  const [form] = Form.useForm();

  const { data: quoteRes, isLoading } = useQuery({ queryKey: ["quotes"], queryFn: getQuotes });
  const { data: workTypeRes } = useQuery({ queryKey: ["work-types"], queryFn: getWorkTypes });
  const { data: materialRes } = useQuery({ queryKey: ["materials"], queryFn: () => getMaterials() });

  const createMutation = useMutation({
    mutationFn: createQuote,
    onSuccess: () => {
      message.success("견적서가 생성되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      setModalOpen(false);
      form.resetFields();
      setLines([emptyLine()]);
    },
    onError: () => message.error("견적서 생성에 실패했습니다."),
  });

  const approveMutation = useMutation({
    mutationFn: approveQuote,
    onSuccess: () => {
      message.success("견적이 승인되어 일정이 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? "승인에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuote,
    onSuccess: () => {
      message.success("견적서가 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  const total = lines.reduce((sum, l) => sum + (l.quantity || 0) * (l.unit_price || 0), 0);

  const updateLine = (idx: number, patch: Partial<LineForm>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const validLines = lines.filter((l) => l.name && l.quantity > 0);
    if (validLines.length === 0) {
      message.error("최소 1개 이상의 견적 항목을 입력해주세요.");
      return;
    }
    createMutation.mutate({
      client_name: values.client_name,
      client_contact: values.client_contact,
      address: values.address,
      work_type_id: values.work_type_id,
      desired_date: values.desired_date ? values.desired_date.format("YYYY-MM-DD") : undefined,
      memo: values.memo,
      discount_amount: values.discount_amount,
      lines: validLines,
    });
  };

  const columns: ColumnsType<Quote> = [
    { title: "고객명", dataIndex: "client_name", render: (v) => v ?? "-" },
    { title: "현장/주소", render: (_, r) => (r.site ? `${r.site.apt_name ?? ""} ${r.site.dong ?? ""}동 ${r.site.ho ?? ""}호` : r.address ?? "-") },
    { title: "희망 시공일", dataIndex: "desired_date", render: (v) => v ?? "미정" },
    { title: "총 견적가", dataIndex: "total_amount", render: (v) => formatCurrency(v) },
    {
      title: "상태",
      dataIndex: "status",
      render: (s: Quote["status"]) => <Tag color={STATUS_LABEL[s].color}>{STATUS_LABEL[s].text}</Tag>,
    },
    { title: "작성일", dataIndex: "created_at", render: (v) => dayjs(v).format("YYYY-MM-DD") },
    {
      title: "",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => downloadQuotePdf(r.id)}>
            PDF
          </Button>
          {r.status !== "approved" && (
            <Popconfirm
              title="이 견적을 승인하고 일정을 등록하시겠습니까?"
              description={!r.desired_date ? "희망 시공일이 없으면 승인할 수 없습니다." : undefined}
              onConfirm={() => approveMutation.mutate(r.id)}
              okText="승인"
              cancelText="취소"
              disabled={!r.desired_date}
            >
              <Button size="small" type="primary" icon={<FileDoneOutlined />} disabled={!r.desired_date}>
                승인
              </Button>
            </Popconfirm>
          )}
          <Popconfirm title="삭제하시겠습니까?" onConfirm={() => deleteMutation.mutate(r.id)} okText="삭제" cancelText="취소">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>견적서 관리</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          + 견적 작성
        </Button>
      </div>

      <Table rowKey="id" loading={isLoading} columns={columns} dataSource={quoteRes?.data ?? []} />

      <Modal
        title="견적서 작성"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending}
        okText="견적서 생성"
        cancelText="취소"
        width={700}
      >
        <Form form={form} layout="vertical">
          <Space.Compact block>
            <Form.Item name="client_name" label="고객명" style={{ flex: 1, marginRight: 8 }}>
              <Input />
            </Form.Item>
            <Form.Item name="client_contact" label="고객 연락처" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="address" label="현장 주소">
            <Input placeholder="아직 현장이 없다면 견적 승인 시 자동 등록됩니다." />
          </Form.Item>
          <Space.Compact block>
            <Form.Item name="work_type_id" label="공정" style={{ flex: 1, marginRight: 8 }}>
              <Select
                allowClear
                options={(workTypeRes?.data ?? []).map((w) => ({ value: w.id, label: w.name }))}
              />
            </Form.Item>
            <Form.Item name="desired_date" label="희망 시공일" style={{ flex: 1 }}>
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Space.Compact>

          <Divider orientation="left" plain>견적 항목</Divider>
          {lines.map((line, idx) => (
            <Space key={idx} style={{ display: "flex", marginBottom: 8 }} align="baseline">
              <AutoComplete
                style={{ width: 150 }}
                placeholder="항목명"
                value={line.name}
                options={(materialRes?.data ?? []).map((m) => ({ value: m.name, label: m.name }))}
                onChange={(v) => updateLine(idx, { name: v })}
                onSelect={(v) => {
                  const m = materialRes?.data?.find((mm) => mm.name === v);
                  updateLine(idx, {
                    name: v,
                    unit: m?.unit ?? line.unit,
                    unit_price: m?.default_unit_price ?? line.unit_price,
                  });
                }}
              />
              <Input
                style={{ width: 140 }}
                placeholder="규격/설명"
                value={line.spec ?? ""}
                onChange={(e) => updateLine(idx, { spec: e.target.value })}
              />
              <InputNumber
                style={{ width: 80 }}
                placeholder="수량"
                min={0}
                value={line.quantity}
                onChange={(v) => updateLine(idx, { quantity: v ?? 0 })}
              />
              <Input
                style={{ width: 70 }}
                placeholder="단위"
                value={line.unit}
                onChange={(e) => updateLine(idx, { unit: e.target.value })}
              />
              <InputNumber
                style={{ width: 120 }}
                placeholder="단가"
                min={0}
                value={line.unit_price}
                onChange={(v) => updateLine(idx, { unit_price: v ?? 0 })}
              />
              <Typography.Text style={{ width: 90, textAlign: "right", display: "inline-block" }}>
                {formatCurrency((line.quantity || 0) * (line.unit_price || 0))}
              </Typography.Text>
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
              />
            </Space>
          ))}
          <Button type="dashed" block onClick={() => setLines((prev) => [...prev, emptyLine()])} style={{ marginBottom: 12 }}>
            + 항목 추가
          </Button>

          <Space.Compact block>
            <Form.Item name="discount_amount" label="할인 금액" style={{ flex: 1, marginRight: 8 }}>
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
            <div style={{ flex: 1, textAlign: "right", paddingTop: 30 }}>
              <Typography.Text strong>소계 {formatCurrency(total)}</Typography.Text>
            </div>
          </Space.Compact>

          <Form.Item name="memo" label="메모">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
