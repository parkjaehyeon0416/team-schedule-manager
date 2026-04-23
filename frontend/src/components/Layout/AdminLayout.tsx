import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Button, Avatar, Typography, Space } from "antd";
import {
  CalendarOutlined,
  HomeOutlined,
  ShopOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../../store/authStore";

const { Sider, Header, Content } = Layout;

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const menuItems = [
    { key: "/", icon: <HomeOutlined />, label: "대시보드" },
    { key: "/schedule", icon: <CalendarOutlined />, label: "스케줄 관리" },
    { key: "/sites", icon: <ShopOutlined />, label: "현장 목록" },
    { key: "/teams", icon: <TeamOutlined />, label: "팀/팀원 관리" },
    { key: "/attendance", icon: <ClockCircleOutlined />, label: "근태 현황" },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220} theme="dark">
        <div
          style={{ padding: "20px 16px", color: "white", fontWeight: "bold" }}
        >
          📋 Team Schedule
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
          <Typography.Text strong>Team Schedule Manager 관리자</Typography.Text>
          <Space>
            <Avatar>{user?.name?.[0]}</Avatar>
            <Typography.Text>{user?.name}</Typography.Text>
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>
              로그아웃
            </Button>
          </Space>
        </Header>
        <Content
          style={{
            margin: "24px",
            background: "white",
            padding: "24px",
            borderRadius: 8,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
