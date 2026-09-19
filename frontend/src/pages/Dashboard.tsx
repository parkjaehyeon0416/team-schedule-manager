import { Typography, Card, Row, Col, Statistic, Skeleton } from "antd";
import {
  TeamOutlined,
  CalendarOutlined,
  DollarOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { getSchedules } from "../api/schedule";
import { getTeamMembers } from "../api/team";
import { getMonthlySummary } from "../api/summary";
import { formatCurrency } from "../utils/format";

export default function Dashboard() {
  const now = dayjs();

  const { data: scheduleRes, isLoading: scheduleLoading } = useQuery({
    queryKey: ["schedules", now.year(), now.month() + 1],
    queryFn: () => getSchedules({ year: now.year(), month: now.month() + 1 }),
  });

  const { data: memberRes, isLoading: memberLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: getTeamMembers,
  });

  const { data: summaryRes, isLoading: summaryLoading } = useQuery({
    queryKey: ["monthly-summary", now.year(), now.month() + 1],
    queryFn: () => getMonthlySummary(now.year(), now.month() + 1),
  });

  const summary = summaryRes?.data;

  return (
    <div>
      <Typography.Title level={4}>대시보드</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Skeleton loading={scheduleLoading} active paragraph={false}>
              <Statistic
                title="이번 달 일정"
                value={scheduleRes?.data?.length ?? 0}
                prefix={<CalendarOutlined />}
              />
            </Skeleton>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Skeleton loading={memberLoading} active paragraph={false}>
              <Statistic
                title="전체 팀원"
                value={memberRes?.data?.length ?? 0}
                prefix={<TeamOutlined />}
              />
            </Skeleton>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Skeleton loading={summaryLoading} active paragraph={false}>
              <Statistic
                title="이번 달 수입"
                value={summary ? formatCurrency(summary.total_income) : "-"}
                prefix={<DollarOutlined />}
              />
            </Skeleton>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Skeleton loading={summaryLoading} active paragraph={false}>
              <Statistic
                title="이번 달 실수령액"
                value={summary ? formatCurrency(summary.net_income) : "-"}
                prefix={<WalletOutlined />}
              />
            </Skeleton>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
