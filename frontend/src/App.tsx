// ★ v18.40 — WorkMate 운영자 전용 웹 관리자 (http://서버/admin)
//   웹 로그인은 운영자 계정만 가능(서버 정책). 팀장용 화면은 모바일 앱으로 일원화하고 웹에서 제거함.
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { App as AntApp } from "antd";
import AdminLayout from "./components/Layout/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Notices from "./pages/Notices";
import ComingSoon from "./pages/ComingSoon";
import SetPassword from "./pages/SetPassword";
import { useAuthStore } from "./store/authStore";

export default function App() {
  const { isLoggedIn } = useAuthStore();
  return (
    <AntApp>
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/" element={isLoggedIn ? <AdminLayout /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="members" element={<ComingSoon title="회원 관리" description="회원 목록 조회·검색, 계정 정지/해제, 탈퇴 처리" />} />
            <Route path="notices" element={<Notices fixedType="notice" />} />
            <Route path="events" element={<Notices fixedType="event" />} />
            <Route path="inquiries" element={<ComingSoon title="고객 문의 관리" description="앱 '문의하기'로 들어온 문의 확인과 답변" />} />
            <Route path="sms" element={<ComingSoon title="문자 발송 관리" description="문자(SOLAPI) 발송 내역과 잔액, 단체 문자 발송" />} />
            <Route path="payments" element={<ComingSoon title="결제 관리" description="유료 요금제 결제·환불 내역" />} />
            <Route path="stats" element={<ComingSoon title="통계 관리" description="가입·활동·매출 추이 그래프" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AntApp>
  );
}
