import { Typography, Card, Empty } from "antd";
import { ShopOutlined } from "@ant-design/icons";

export default function Sites() {
  return (
    <div>
      <Typography.Title level={4}>
        <ShopOutlined style={{ marginRight: 8 }} />
        현장 목록
      </Typography.Title>
      <Card>
        {/* v7에서 실제 현장 목록 API 연동 예정 */}
        <Empty description="현장 데이터를 불러오는 중..." />
      </Card>
    </div>
  );
}
