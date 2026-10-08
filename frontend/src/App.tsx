// ★ v18.40~41 — WorkMate 운영자 전용 웹 관리자 (http://서버/admin, DESIGN-CANVAS ADMIN_*)
//   웹 로그인은 운영자 계정만 가능(서버 정책). 팀장용 화면은 모바일 앱으로 일원화.
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./components/Layout/AdminLayout";
import { ToastProvider } from "./components/ui";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NoticeList from "./pages/NoticeList";
import NoticeEdit from "./pages/NoticeEdit";
import EventList from "./pages/EventList";
import EventEdit from "./pages/EventEdit";
import Operators from "./pages/Operators";
import Members from "./pages/Members";
import ComingSoon from "./pages/ComingSoon";
import InquiryList from "./pages/InquiryList";
import InquiryDetail from "./pages/InquiryDetail";
import SmsSend from "./pages/SmsSend";
import SmsTemplates from "./pages/SmsTemplates";
import SmsTemplateEdit from "./pages/SmsTemplateEdit";
import Stats from "./pages/Stats";
import SetPassword from "./pages/SetPassword";
import { useAuthStore } from "./store/authStore";

export default function App() {
  const { isLoggedIn } = useAuthStore();
  return (
    <ToastProvider>
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={isLoggedIn ? <Navigate to="/" /> : <Login />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/" element={isLoggedIn ? <AdminLayout /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="notices" element={<NoticeList />} />
            <Route path="notices/new" element={<NoticeEdit />} />
            <Route path="notices/:id" element={<NoticeEdit />} />
            <Route path="events" element={<EventList />} />
            <Route path="events/new" element={<EventEdit />} />
            <Route path="events/:id" element={<EventEdit />} />
            <Route path="members" element={<Members />} />
            <Route path="operators" element={<Operators />} />
            {/* ★ v18.43 운영 메뉴 */}
            <Route path="inquiries" element={<InquiryList />} />
            <Route path="inquiries/:id" element={<InquiryDetail />} />
            <Route path="sms" element={<SmsSend />} />
            <Route path="sms-templates" element={<SmsTemplates />} />
            <Route path="sms-templates/new" element={<SmsTemplateEdit />} />
            <Route path="sms-templates/:id" element={<SmsTemplateEdit />} />
            <Route path="stats" element={<Stats />} />
            <Route path="payments" element={<ComingSoon menu="payments" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
