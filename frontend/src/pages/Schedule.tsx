import { Typography } from "antd";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import koLocale from "@fullcalendar/core/locales/ko";

export default function Schedule() {
  return (
    <div>
      <Typography.Title level={4}>스케줄 관리</Typography.Title>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={koLocale}
        events={[
          { title: "강남구 OO아파트", date: "2026-04-20", color: "#1E88E5" },
          { title: "서초구 XX빌라", date: "2026-04-22", color: "#43A047" },
        ]}
        dateClick={(info) => alert(`${info.dateStr} 클릭!`)}
        height="auto"
      />
    </div>
  );
}
