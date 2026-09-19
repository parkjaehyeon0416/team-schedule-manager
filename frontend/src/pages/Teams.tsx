import { useState } from "react";
import { Typography, Table, Tag, Alert, Card, Button, Input, Space, Tabs, Popconfirm, message, Descriptions } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTeamMembers, getTeams, createTeam, updateTeam, deleteTeam, joinTeam } from "../api/team";
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

function NoTeamPanel() {
  const queryClient = useQueryClient();
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const createMutation = useMutation({
    mutationFn: (name: string) => createTeam(name),
    onSuccess: () => {
      message.success("팀이 생성되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message ?? "팀 생성에 실패했습니다.");
    },
  });

  const joinMutation = useMutation({
    mutationFn: (code: string) => joinTeam(code),
    onSuccess: () => {
      message.success("팀에 가입되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message ?? "팀 가입에 실패했습니다.");
    },
  });

  return (
    <Card>
      <Typography.Paragraph type="secondary">
        아직 소속된 팀이 없습니다. 새 팀을 만들거나, 초대 코드로 기존 팀에 가입하세요.
      </Typography.Paragraph>
      <Tabs
        items={[
          {
            key: "create",
            label: "팀 생성",
            children: (
              <Space.Compact style={{ width: "100%", maxWidth: 400 }}>
                <Input
                  placeholder="팀 이름"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  onPressEnter={() => teamName && createMutation.mutate(teamName)}
                />
                <Button
                  type="primary"
                  loading={createMutation.isPending}
                  disabled={!teamName}
                  onClick={() => createMutation.mutate(teamName)}
                >
                  생성
                </Button>
              </Space.Compact>
            ),
          },
          {
            key: "join",
            label: "초대 코드로 가입",
            children: (
              <Space.Compact style={{ width: "100%", maxWidth: 400 }}>
                <Input
                  placeholder="초대 코드"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  onPressEnter={() => inviteCode && joinMutation.mutate(inviteCode)}
                />
                <Button
                  type="primary"
                  loading={joinMutation.isPending}
                  disabled={!inviteCode}
                  onClick={() => joinMutation.mutate(inviteCode)}
                >
                  가입
                </Button>
              </Space.Compact>
            ),
          },
        ]}
      />
    </Card>
  );
}

export default function Teams() {
  const queryClient = useQueryClient();
  const [editingName, setEditingName] = useState<string | null>(null);

  const { data: teamRes, isLoading: teamLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: getTeams,
  });

  const { data: memberRes, isLoading: memberLoading, error: memberError } = useQuery({
    queryKey: ["team-members"],
    queryFn: getTeamMembers,
  });

  const team = teamRes?.data?.[0];

  const updateMutation = useMutation({
    mutationFn: (name: string) => updateTeam(team!.id, name),
    onSuccess: () => {
      message.success("팀 이름이 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setEditingName(null);
    },
    onError: () => message.error("수정 권한이 없거나 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTeam(team!.id),
    onSuccess: () => {
      message.success("팀이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: () => message.error("삭제 권한이 없거나 실패했습니다."),
  });

  if (!teamLoading && !team) {
    return (
      <div>
        <Typography.Title level={4}>팀/팀원 관리</Typography.Title>
        <NoTeamPanel />
      </div>
    );
  }

  return (
    <div>
      <Typography.Title level={4}>팀/팀원 관리</Typography.Title>

      <Card loading={teamLoading} style={{ marginBottom: 16 }}>
        {team && (
          <Descriptions
            title={
              editingName === null ? (
                <Space>
                  {team.name}
                  <Button size="small" onClick={() => setEditingName(team.name)}>
                    이름 수정
                  </Button>
                  <Popconfirm
                    title="정말 팀을 삭제하시겠습니까?"
                    onConfirm={() => deleteMutation.mutate()}
                    okText="삭제"
                    cancelText="취소"
                  >
                    <Button size="small" danger loading={deleteMutation.isPending}>
                      팀 삭제
                    </Button>
                  </Popconfirm>
                </Space>
              ) : (
                <Space.Compact>
                  <Input
                    size="small"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                  />
                  <Button
                    size="small"
                    type="primary"
                    loading={updateMutation.isPending}
                    onClick={() => editingName && updateMutation.mutate(editingName)}
                  >
                    저장
                  </Button>
                  <Button size="small" onClick={() => setEditingName(null)}>
                    취소
                  </Button>
                </Space.Compact>
              )
            }
            bordered
          >
            <Descriptions.Item label="초대 코드">{team.invite_code}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      {memberError && (
        <Alert
          type="error"
          message="팀원 목록을 불러오지 못했습니다."
          style={{ marginBottom: 16 }}
        />
      )}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={memberRes?.data ?? []}
        loading={memberLoading}
        pagination={false}
      />
    </div>
  );
}
