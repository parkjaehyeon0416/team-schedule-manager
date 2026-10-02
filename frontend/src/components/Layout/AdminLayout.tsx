// ★ v18.40 — 운영자 전용 관리 화면 레이아웃 (메뉴 그룹: 현황 / 회원 / 콘텐츠 / 고객지원 / 매출)
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Button, Avatar, Typography, Space, Tag } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  NotificationOutlined,
  GiftOutlined,
  CustomerServiceOutlined,
  MessageOutlined,
  CreditCardOutlined,
  LineChartOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../../store/authStore";

const { Sider, Header, Content } = Layout;

// soon: 아직 준비 중인 메뉴 — 이름 옆에 표시
const label = (text: string, soon = false) =>
  soon ? <Space size={6}>{text}<Tag style={{ fontSize: 10, lineHeight: "16px", marginInlineEnd: 0 }}>준비 중</Tag></Space> : text;

const menuItems: MenuProps["items"] = [
  { key: "/", icon: <DashboardOutlined />, label: label("대시보드") },
  { key: "/stats", icon: <LineChartOutlined />, label: label("통계 관리", true) },
  { type: "divider" },
  { key: "/members", icon: <UserOutlined />, label: label("회원 관리", true) },
  { type: "divider" },
  { key: "/notices", icon: <NotificationOutlined />, label: label("공지 관리") },
  { key: "/events", icon: <GiftOutlined />, label: label("이벤트 관리") },
  { type: "divider" },
  { key: "/inquiries", icon: <CustomerServiceOutlined />, label: label("고객 문의 관리", true) },
  { key: "/sms", icon: <MessageOutlined />, label: label("문자 발송 관리", true) },
  { type: "divider" },
  { key: "/payments", icon: <CreditCardOutlined />, label: label("결제 관리", true) },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={230} theme="dark">
        <div style={{ padding: "20px 16px", color: "white", fontWeight: 800, fontSize: 17 }}>
          Work<span style={{ color: "#4DA3FF" }}>Mate</span> 운영
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "white",
            padding: "0 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography.Text strong>WorkMate 관리자</Typography.Text>
          <Space>
            <Avatar>{user?.name?.[0]}</Avatar>
            <Typography.Text>{user?.name}</Typography.Text>
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>
              로그아웃
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: "24px", background: "white", padding: "24px", borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
