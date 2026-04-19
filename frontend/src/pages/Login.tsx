// ★ v6 변경: 임시 로그인 → 실제 API 연동

import { Form, Input, Button, Card, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { login } from "../api/auth"; // ★ API 함수 import
import { useState } from "react";

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      // ★ 실제 API 호출
      const result = await login(values.email, values.password);

      if (result.success) {
        // 로그인 성공: Zustand store에 사용자 정보 + 토큰 저장
        setAuth(result.data.user, result.data.token);
        message.success("로그인 성공!");
        navigate("/");
      }
    } catch (error: any) {
      // 오류 코드 정의서에 맞게 오류 처리
      const errCode = error.response?.data?.error_code;
      if (errCode === "ERR_AUTH_001") {
        message.error("이메일 또는 비밀번호를 확인해주세요.");
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
