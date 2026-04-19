import { Form, Input, Button, Card, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form] = Form.useForm();

  const onFinish = (values: { email: string; password: string }) => {
    // ★ 임시 처리 — v6에서 실제 API 호출로 교체
    if (values.email === "admin@test.com" && values.password === "1234") {
      setAuth(
        {
          id: 1,
          name: "테스트관리자",
          email: values.email,
          role: "superadmin",
        },
        "temp-token",
      );
      message.success("로그인 성공!");
      navigate("/");
    } else {
      message.error("이메일 또는 비밀번호를 확인해주세요.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f0f2f5",
      }}
    >
      <Card style={{ width: 400 }}>
        <Typography.Title level={3} style={{ textAlign: "center" }}>
          📋 Team Schedule
        </Typography.Title>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="이메일"
            name="email"
            rules={[{ required: true }, { type: "email" }]}
          >
            <Input placeholder="admin@test.com" size="large" />
          </Form.Item>
          <Form.Item
            label="비밀번호"
            name="password"
            rules={[{ required: true }]}
          >
            <Input.Password placeholder="비밀번호 입력" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block>
            로그인
          </Button>
        </Form>
        <p
          style={{
            textAlign: "center",
            marginTop: 12,
            fontSize: 12,
            color: "#999",
          }}
        >
          테스트 계정: admin@test.com / 1234
        </p>
      </Card>
    </div>
  );
}
