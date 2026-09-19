import { useMemo, useState } from "react";
import { Typography, Button, Modal, Form, Input, InputNumber, Select, DatePicker, message, List, Popconfirm, Empty, Divider } from "antd";
import { DownloadOutlined, DeleteOutlined } from "@ant-design/icons";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import koLocale from "@fullcalendar/core/locales/ko";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { getSchedules, createSchedule } from "../api/schedule";
import type { ScheduleInput } from "../api/schedule";
import { getTeamMembers } from "../api/team";
import { getReports, createReport, deleteReport, downloadReport } from "../api/report";
import type { ReportInput } from "../api/report";

const WORK_TYPE_COLOR: Record<string, string> = {
  도배: "#1E88E5",
  타일: "#43A047",
  필름: "#FB8C00",
};

export default function Schedule() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(dayjs().year());
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailScheduleId, setDetailScheduleId] = useState<number | null>(null);
  const [reportForm] = Form.useForm();
  const [form] = Form.useForm();

  const { data: scheduleRes, isLoading } = useQuery({
    queryKey: ["schedules", year, month],
    queryFn: () => getSchedules({ year, month }),
  });

  const { data: memberRes } = useQuery({
    queryKey: ["team-members"],
    queryFn: getTeamMembers,
  });

  const createMutation = useMutation({
    mutationFn: (data: ScheduleInput) => createSchedule(data),
    onSuccess: () => {
      message.success("일정이 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: () => {
      message.error("일정 등록에 실패했습니다.");
    },
  });

  const events = useMemo(
    () =>
      (scheduleRes?.data ?? []).map((s) => ({
        id: String(s.id),
        title: s.site
          ? `${s.site.apt_name} ${s.site.dong}동 ${s.site.ho}호`
          : s.district ?? "일정",
        date: s.date,
        color: s.work_type ? WORK_TYPE_COLOR[s.work_type] : "#999",
      })),
    [scheduleRes],
  );

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    form.setFieldsValue({ date: dayjs(dateStr) });
    setModalOpen(true);
  };

  const { data: reportRes, isLoading: reportsLoading } = useQuery({
    queryKey: ["reports", detailScheduleId],
    queryFn: () => getReports(detailScheduleId!),
    enabled: detailScheduleId !== null,
  });

  const createReportMutation = useMutation({
    mutationFn: (data: ReportInput) => createReport(detailScheduleId!, data),
    onSuccess: () => {
      message.success("보고서가 생성되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["reports", detailScheduleId] });
      reportForm.resetFields();
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message ?? "보고서 생성에 실패했습니다.");
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id: number) => deleteReport(id),
    onSuccess: () => {
      message.success("보고서가 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["reports", detailScheduleId] });
    },
  });

  const detailSchedule = (scheduleRes?.data ?? []).find((s) => s.id === detailScheduleId);

  const handleEventClick = (scheduleId: number) => {
    setDetailScheduleId(scheduleId);
  };

  const handleCreateReport = async () => {
    const values = await reportForm.validateFields();
    createReportMutation.mutate(values);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    createMutation.mutate({
      date: values.date.format("YYYY-MM-DD"),
      district: values.district,
      work_type: values.work_type,
      area_m2: values.area_m2,
      daily_wage: values.daily_wage,
      work_units: values.work_units,
      memo: values.memo,
      user_ids: values.user_ids,
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography.Title level={4}>스케줄 관리</Typography.Title>
        <Button type="primary" onClick={() => handleDateClick(dayjs().format("YYYY-MM-DD"))}>
          + 새 일정
        </Button>
      </div>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={koLocale}
        events={events}
        datesSet={(info) => {
          const mid = dayjs(info.view.currentStart).add(15, "day");
          setYear(mid.year());
          setMonth(mid.month() + 1);
        }}
        dateClick={(info) => handleDateClick(info.dateStr)}
        eventClick={(info) => handleEventClick(Number(info.event.id))}
        height="auto"
      />
      {isLoading && <div style={{ marginTop: 8, color: "#999" }}>불러오는 중...</div>}

      <Modal
        title={`${selectedDate ?? ""} 일정 등록`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending}
        okText="등록"
        cancelText="취소"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="date" label="날짜" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="district" label="지역/구역">
            <Input placeholder="예: 강남구" />
          </Form.Item>
          <Form.Item name="work_type" label="공정">
            <Select
              allowClear
              options={[
                { value: "도배", label: "도배" },
                { value: "타일", label: "타일" },
                { value: "필름", label: "필름" },
              ]}
            />
          </Form.Item>
          <Form.Item name="user_ids" label="투입 인원">
            <Select
              mode="multiple"
              allowClear
              options={(memberRes?.data ?? []).map((m) => ({
                value: m.id,
                label: m.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="area_m2" label="면적(㎡)">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="daily_wage" label="일당">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="work_units" label="공수">
            <InputNumber style={{ width: "100%" }} min={0} step={0.1} />
          </Form.Item>
          <Form.Item name="memo" label="메모">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          detailSchedule
            ? `${detailSchedule.date} ${detailSchedule.site ? `${detailSchedule.site.apt_name} ${detailSchedule.site.dong}동 ${detailSchedule.site.ho}호` : detailSchedule.district ?? "일정"}`
            : "일정 상세"
        }
        open={detailScheduleId !== null}
        onCancel={() => setDetailScheduleId(null)}
        footer={null}
        width={520}
      >
        <Divider orientation="left" plain>보고서 생성</Divider>
        <Form form={reportForm} layout="vertical">
          <Form.Item name="title" label="보고서 제목" rules={[{ required: true, message: "제목을 입력해주세요." }]}>
            <Input placeholder="예: 2026년 9월 역삼동 도배 작업 보고" />
          </Form.Item>
          <Form.Item name="client_name" label="고객명">
            <Input />
          </Form.Item>
          <Form.Item name="client_contact" label="고객 연락처">
            <Input />
          </Form.Item>
          <Form.Item name="greeting_message" label="인사말">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button
            type="primary"
            loading={createReportMutation.isPending}
            onClick={handleCreateReport}
            disabled={!detailSchedule?.site}
          >
            PDF 보고서 생성
          </Button>
          {!detailSchedule?.site && (
            <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
              현장이 연결된 일정만 보고서를 생성할 수 있습니다.
            </Typography.Text>
          )}
        </Form>

        <Divider orientation="left" plain>생성된 보고서</Divider>
        <List
          loading={reportsLoading}
          dataSource={reportRes?.data ?? []}
          locale={{ emptyText: <Empty description="아직 생성된 보고서가 없습니다." /> }}
          renderItem={(r) => (
            <List.Item
              actions={[
                <Button
                  key="download"
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={() => downloadReport(r.id, r.title)}
                >
                  다운로드
                </Button>,
                <Popconfirm
                  key="delete"
                  title="이 보고서를 삭제하시겠습니까?"
                  onConfirm={() => deleteReportMutation.mutate(r.id)}
                  okText="삭제"
                  cancelText="취소"
                >
                  <Button icon={<DeleteOutlined />} size="small" danger />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={r.title}
                description={`${r.client_name ?? "고객명 미입력"} · ${dayjs(r.created_at).format("YYYY-MM-DD HH:mm")}`}
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}
