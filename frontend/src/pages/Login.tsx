import { Form, Input, Button, Card, Typography, App } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { login } from "../api/auth";
import { useState } from "react";

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // v9: message를 App.useApp() 훅에서 가져오기
  // (AntApp wrapper 적용으로 전환)
  const { message } = App.useApp();

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const result = await login(values.email, values.password);

      if (result.success) {
        setAuth(result.data.user, result.data.token);
        message.success("로그인 성공!");
        navigate("/");
      }
    } catch (error: any) {
      const errCode = error.response?.data?.error_code;

      if (errCode === "ERR_AUTH_001") {
        message.error("이메일 또는 비밀번호를 확인해주세요.");
      } else if (errCode === "ERR_AUTH_007") {
        message.error(
          "이 계정은 모바일 앱 전용입니다. 모바일 앱에서 로그인해주세요.",
        );
      } else {
        message.error("로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
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
            <Input placeholder="이메일 입력" size="large" />
          </Form.Item>
          <Form.Item
            label="비밀번호"
            name="password"
            rules={[{ required: true }]}
          >
            <Input.Password placeholder="비밀번호 입력" size="large" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
          >
            로그인
          </Button>
        </Form>
      </Card>
    </div>
  );
}
