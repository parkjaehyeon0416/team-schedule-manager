import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { App as AntApp } from "antd";
import AdminLayout from "./components/Layout/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import Sites from "./pages/Sites";
import SiteDetail from "./pages/SiteDetail";
import Teams from "./pages/Teams";
import Attendance from "./pages/Attendance";
import BusinessCard from "./pages/BusinessCard";
import TaxSummary from "./pages/TaxSummary";
import Quotes from "./pages/Quotes";
import Notices from "./pages/Notices";
import { useAuthStore } from "./store/authStore";

export default function App() {
  const { isLoggedIn, user } = useAuthStore();
  const isOperator = user?.user_type === "operator";
  return (
    <AntApp>
      {/* ★ v18.40 — 서버의 /admin 주소에서 열림 */}
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={isLoggedIn ? <AdminLayout /> : <Navigate to="/login" />}
          >
            <Route index element={isOperator ? <Navigate to="/notices" /> : <Dashboard />} />
            <Route path="notices" element={<Notices />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="sites" element={<Sites />} />
            <Route path="sites/:id" element={<SiteDetail />} />
            <Route path="teams" element={<Teams />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="business-card" element={<BusinessCard />} />
            <Route path="tax-summary" element={<TaxSummary />} />
            <Route path="quotes" element={<Quotes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AntApp>
  );
}
