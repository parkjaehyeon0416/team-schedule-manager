import { useMemo, useState } from "react";
import { Typography, Button, Modal, Form, Input, InputNumber, Select, DatePicker, message } from "antd";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import koLocale from "@fullcalendar/core/locales/ko";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { getSchedules, createSchedule } from "../api/schedule";
import type { ScheduleInput } from "../api/schedule";
import { getTeamMembers } from "../api/team";

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
    </div>
  );
}
