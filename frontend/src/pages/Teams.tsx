import { Typography, Table, Tag, Alert } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery } from "@tanstack/react-query";
import { getTeamMembers } from "../api/team";
import type { TeamMember } from "../api/team";

const ROLE_LABEL: Record<number, { text: string; color: string }> = {
  1: { text: "최고 관리자", color: "red" },
  2: { text: "관리자", color: "blue" },
  3: { text: "팀원", color: "default" },
};

const columns: ColumnsType<TeamMember> = [
  { title: "ID", dataIndex: "id" },
  { title: "이름", dataIndex: "name" },
  {
    title: "역할",
    dataIndex: "role_id",
    render: (roleId: number) => {
      const role = ROLE_LABEL[roleId] ?? { text: "알 수 없음", color: "default" };
      return <Tag color={role.color}>{role.text}</Tag>;
    },
  },
];

export default function Teams() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["team-members"],
    queryFn: getTeamMembers,
  });

  return (
    <div>
      <Typography.Title level={4}>팀/팀원 관리</Typography.Title>
      <Typography.Paragraph type="secondary">
        팀 생성·수정·삭제, 초대를 통한 팀원 가입 기능은 아직 개발 중입니다. 현재는 내 팀의 팀원 목록만 조회할 수 있습니다.
      </Typography.Paragraph>
      {error && (
        <Alert
          type="error"
          message="팀원 목록을 불러오지 못했습니다."
          style={{ marginBottom: 16 }}
        />
      )}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.data ?? []}
        loading={isLoading}
        locale={{ emptyText: data?.message ?? "소속된 팀이 없습니다." }}
        pagination={false}
      />
    </div>
  );
}
