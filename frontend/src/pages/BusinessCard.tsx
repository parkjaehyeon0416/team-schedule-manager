import { useEffect } from "react";
import { Typography, Card, Form, Input, InputNumber, Switch, Button, Empty, message, Space, Statistic, Row, Col, Popconfirm, Divider } from "antd";
import { LinkOutlined, DeleteOutlined, IdcardOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { getMyBusinessCard, saveBusinessCard, deleteBusinessCard, getPublicCardUrl } from "../api/businessCard";
import type { BusinessCardInput } from "../api/businessCard";

export default function BusinessCard() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: cardRes, isLoading } = useQuery({
    queryKey: ["business-card"],
    queryFn: getMyBusinessCard,
  });

  const card = cardRes?.data ?? null;

  useEffect(() => {
    if (card) {
      form.setFieldsValue(card);
    }
  }, [card, form]);

  const saveMutation = useMutation({
    mutationFn: (data: BusinessCardInput) => saveBusinessCard(data),
    onSuccess: (res) => {
      message.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["business-card"] });
    },
    onError: () => message.error("명함 저장에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBusinessCard,
    onSuccess: () => {
      message.success("명함이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["business-card"] });
      form.resetFields();
    },
  });

  const handleSave = async () => {
    const values = await form.validateFields();
    saveMutation.mutate(values);
  };

  const handleCopyLink = async () => {
    if (!card) return;
    const url = getPublicCardUrl(card.share_code);
    try {
      await navigator.clipboard.writeText(url);
      message.success("명함 링크가 복사되었습니다.");
    } catch {
      message.info(url);
    }
  };

  return (
    <div>
      <Typography.Title level={4}>
        <IdcardOutlined style={{ marginRight: 8 }} />
        내 명함
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        고객이 지인에게 추천할 때 바로 전달할 수 있는 모바일 명함입니다. 저장하면 로그인 없이도 볼 수 있는 공유 링크가 생성되고,
        최근 업로드한 시공 사진 최대 3장이 자동으로 포트폴리오에 표시됩니다. 자동 보고서 PDF에도 이 명함으로 연결되는 QR코드가 함께 삽입됩니다.
      </Typography.Paragraph>

      <Row gutter={16}>
        <Col span={14}>
          <Card loading={isLoading}>
            <Form form={form} layout="vertical">
              <Form.Item name="display_name" label="표시 이름" rules={[{ required: true, message: "이름을 입력해주세요." }]}>
                <Input placeholder="예: 김도배 기사" />
              </Form.Item>
              <Form.Item name="job_title" label="직함">
                <Input placeholder="예: 도배 전문" />
              </Form.Item>
              <Form.Item name="years_experience" label="경력(년)">
                <InputNumber style={{ width: "100%" }} min={0} max={80} />
              </Form.Item>
              <Form.Item name="service_area" label="활동 지역">
                <Input placeholder="예: 서울/경기" />
              </Form.Item>
              <Form.Item name="specialty" label="전문 분야">
                <Input placeholder="예: 합지·실크·천장도배" />
              </Form.Item>
              <Form.Item name="contact_phone" label="연락처">
                <Input placeholder="예: 010-1234-5678" />
              </Form.Item>
              <Form.Item name="tagline" label="한 줄 소개">
                <Input.TextArea rows={2} placeholder="예: 꼼꼼한 시공 약속드립니다" />
              </Form.Item>
              <Form.Item name="is_public" label="공개 여부" valuePropName="checked" initialValue={true}>
                <Switch checkedChildren="공개" unCheckedChildren="비공개" />
              </Form.Item>
              <Space>
                <Button type="primary" loading={saveMutation.isPending} onClick={handleSave}>
                  {card ? "명함 저장" : "명함 만들기"}
                </Button>
                {card && (
                  <Popconfirm
                    title="명함을 삭제하시겠습니까?"
                    onConfirm={() => deleteMutation.mutate()}
                    okText="삭제"
                    cancelText="취소"
                  >
                    <Button danger icon={<DeleteOutlined />} loading={deleteMutation.isPending}>
                      삭제
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            </Form>
          </Card>
        </Col>

        <Col span={10}>
          <Card title="공유 & 조회 통계">
            {card ? (
              <>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Button block icon={<LinkOutlined />} onClick={handleCopyLink}>
                    공유 링크 복사
                  </Button>
                  <Typography.Text type="secondary" copyable style={{ wordBreak: "break-all" }}>
                    {getPublicCardUrl(card.share_code)}
                  </Typography.Text>
                </Space>
                <Divider />
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic title="누적 조회수" value={card.view_count} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="이번 달 조회수" value={card.monthly_view_count} />
                  </Col>
                </Row>
                {card.last_viewed_at && (
                  <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
                    마지막 열람: {dayjs(card.last_viewed_at).format("YYYY-MM-DD HH:mm")}
                  </Typography.Paragraph>
                )}
                <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
                  포트폴리오 사진은 최근 업로드한 시공 사진 중 최대 3장이 자동으로 선택됩니다(수동 선택은 아직 지원하지 않습니다).
                </Typography.Paragraph>
              </>
            ) : (
              <Empty description="명함을 먼저 만들어주세요." />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
