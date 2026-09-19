import { useState } from "react";
import { Typography, Card, Table, Button, Modal, Form, Input, InputNumber, message } from "antd";
import { ShopOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getSites, createSite } from "../api/site";
import type { SiteInput } from "../api/site";
import type { Site } from "../types";

const columns = (onClickRow: (id: number) => void): ColumnsType<Site> => [
  { title: "아파트명", dataIndex: "apt_name", render: (v) => v ?? "-" },
  { title: "주소", dataIndex: "address" },
  { title: "동", dataIndex: "dong", render: (v) => v ?? "-" },
  { title: "호수", dataIndex: "ho", render: (v) => v ?? "-" },
  { title: "면적(㎡)", dataIndex: "area_m2", render: (v) => v ?? "-" },
  {
    title: "",
    key: "action",
    render: (_, record) => (
      <a onClick={() => onClickRow(record.id)}>상세보기</a>
    ),
  },
];

export default function Sites() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: getSites,
  });

  const createMutation = useMutation({
    mutationFn: (values: SiteInput) => createSite(values),
    onSuccess: () => {
      message.success("현장이 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: () => message.error("현장 등록에 실패했습니다."),
  });

  const handleSubmit = async () => {
    const values = await form.validateFields();
    createMutation.mutate(values);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          <ShopOutlined style={{ marginRight: 8 }} />
          현장 목록
        </Typography.Title>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          + 현장 등록
        </Button>
      </div>
      <Card>
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={data?.data ?? []}
          columns={columns((id) => navigate(`/sites/${id}`))}
        />
      </Card>

      <Modal
        title="현장 등록"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending}
        okText="등록"
        cancelText="취소"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="address" label="주소" rules={[{ required: true, message: "주소를 입력해주세요." }]}>
            <Input placeholder="예: 서울시 강남구 역삼동 123-45" />
          </Form.Item>
          <Form.Item name="apt_name" label="아파트/건물명">
            <Input />
          </Form.Item>
          <Form.Item name="dong" label="동">
            <Input />
          </Form.Item>
          <Form.Item name="ho" label="호수">
            <Input />
          </Form.Item>
          <Form.Item name="area_m2" label="면적(㎡)">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="memo" label="메모">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
