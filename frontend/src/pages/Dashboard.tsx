// ★ v18.40 — 운영자 대시보드: 앱 전체 현황 숫자 + 최근 가입 회원
import { useEffect, useState } from "react";
import { App, Card, Col, Row, Statistic, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { getDashboard } from "../api/admin";
import type { DashboardStats, RecentMember } from "../api/admin";

export default function Dashboard() {
  const { message } = App.useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(d => { setStats(d.stats); setRecent(d.recent_members); })
      .catch(e => message.error(e?.response?.data?.message ?? "대시보드를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards: { title: string; value?: number; suffix: string }[] = [
    { title: "전체 회원", value: stats?.members_total, suffix: "명" },
    { title: "오늘 가입", value: stats?.members_today, suffix: "명" },
    { title: "이번 달 가입", value: stats?.members_this_month, suffix: "명" },
    { title: "팀 수", value: stats?.teams_total, suffix: "개" },
    { title: "이번 달 일정", value: stats?.schedules_this_month, suffix: "건" },
    { title: "이번 달 견적서", value: stats?.quotes_this_month, suffix: "건" },
    { title: "푸시 수신 기기", value: stats?.push_devices, suffix: "대" },
    { title: "게시중 공지·이벤트", value: stats?.notices_published, suffix: "건" },
  ];

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>대시보드</Typography.Title>
      <Row gutter={[16, 16]}>
        {cards.map(c => (
          <Col key={c.title} xs={12} md={6}>
            <Card loading={loading} size="small">
              <Statistic title={c.title} value={c.value ?? 0} suffix={c.suffix} />
            </Card>
          </Col>
        ))}
      </Row>

      <Typography.Title level={5} style={{ marginTop: 24 }}>최근 가입 회원</Typography.Title>
      <Table<RecentMember>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={recent}
        pagination={false}
        columns={[
          { title: "이름", dataIndex: "name" },
          { title: "이메일", dataIndex: "email" },
          {
            title: "구분", dataIndex: "user_type", width: 100,
            render: (t: string) => <Tag color={t === "team" ? "blue" : "purple"}>{t === "team" ? "팀" : "개인"}</Tag>,
          },
          { title: "가입일", dataIndex: "created_at", width: 160, render: (d: string) => dayjs(d).format("YYYY.MM.DD HH:mm") },
        ]}
      />
    </div>
  );
}
