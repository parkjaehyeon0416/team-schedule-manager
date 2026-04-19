import { Typography, Card, Descriptions, Empty } from "antd";
import { useParams } from "react-router-dom";

export default function SiteDetail() {
  // useParams: 주소창의 :id 값을 읽어오는 함수
  // 예) /sites/5 로 접속하면 id = '5'
  const { id } = useParams();

  return (
    <div>
      <Typography.Title level={4}>현장 상세 (ID: {id})</Typography.Title>
      <Card>
        <Descriptions title="현장 정보" bordered>
          <Descriptions.Item label="현장명">-</Descriptions.Item>
          <Descriptions.Item label="주소">-</Descriptions.Item>
          <Descriptions.Item label="동/호수">-</Descriptions.Item>
          <Descriptions.Item label="면적">-</Descriptions.Item>
        </Descriptions>
        {/* v7에서 실제 현장 상세 API 연동 예정 */}
        <Empty
          description="파일 첨부 기능은 v7에서 구현 예정"
          style={{ marginTop: 24 }}
        />
      </Card>
    </div>
  );
}
