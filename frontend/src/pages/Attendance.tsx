import { Typography, Card, Empty } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";

export default function Attendance() {
  return (
    <div>
      <Typography.Title level={4}>
        <ClockCircleOutlined style={{ marginRight: 8 }} />
        근태 현황
      </Typography.Title>
      <Card>
        {/* v7에서 실제 근태 현황 API 연동 예정 */}
        <Empty description="근태 데이터를 불러오는 중..." />
      </Card>
    </div>
  );
}
