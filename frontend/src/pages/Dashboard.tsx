import { Typography, Card, Row, Col, Statistic } from "antd";
import {
  TeamOutlined,
  CalendarOutlined,
  ShopOutlined,
} from "@ant-design/icons";

export default function Dashboard() {
  return (
    <div>
      <Typography.Title level={4}>대시보드</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card>
            <Statistic
              title="오늘 현장 수"
              value={0}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="이번 달 일정"
              value={0}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="전체 팀원" value={0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

// 나머지 페이지 (Schedule, Sites, Teams, Attendance) 도 같은 방식으로 생성
// 예시:
// export default function Schedule() {
//   return (<div><Typography.Title level={4}>스케줄 관리</Typography.Title></div>)
// }
