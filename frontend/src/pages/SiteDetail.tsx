import { Typography, Card, Descriptions, Empty, Skeleton, Alert } from "antd";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSite } from "../api/site";

export default function SiteDetail() {
  const { id } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["site", id],
    queryFn: () => getSite(id!),
    enabled: !!id,
  });

  const site = data?.data;

  return (
    <div>
      <Typography.Title level={4}>현장 상세 (ID: {id})</Typography.Title>
      <Card>
        {error && <Alert type="error" message="현장 정보를 불러오지 못했습니다." style={{ marginBottom: 16 }} />}
        <Skeleton loading={isLoading} active>
          <Descriptions title="현장 정보" bordered>
            <Descriptions.Item label="현장명">{site?.apt_name ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="주소">{site?.address ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="동/호수">
              {site?.dong || site?.ho ? `${site?.dong ?? ""} ${site?.ho ?? ""}`.trim() : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="면적">
              {site?.area_m2 ? `${site.area_m2}㎡` : "-"}
            </Descriptions.Item>
          </Descriptions>
        </Skeleton>
        {/* 현장 사진은 일정(Schedule) 기준으로 관리되며, 이 현장에 연결된 일정 상세에서 확인할 수 있습니다. */}
        <Empty
          description="이 현장의 작업 사진은 연결된 일정 상세 화면에서 확인할 수 있습니다."
          style={{ marginTop: 24 }}
        />
      </Card>
    </div>
  );
}
