// ★ v18.40 — 운영자 비밀번호 설정 (문자로 받은 1회용 링크: /admin/set-password?token=...)
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { App, Button, Card, Form, Input, Result, Typography } from "antd";
import axiosInstance from "../api/axiosInstance";

export default function SetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [doneEmail, setDoneEmail] = useState<string | null>(null);

  const onFinish = async (v: { password: string; password_confirmation: string }) => {
    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/operator/set-password", { token, ...v });
      setDoneEmail(res.data.data.email);
    } catch (e: any) {
      const errors = e?.response?.data?.errors;
      message.error(errors ? (Object.values(errors)[0] as string[])[0] : e?.response?.data?.message ?? "설정하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5", padding: 16 }}>
      <Card style={{ width: 380, maxWidth: "100%" }}>
        {doneEmail ? (
          <Result
            status="success"
            title="비밀번호가 설정되었습니다"
            subTitle={`${doneEmail} 으로 로그인하세요.`}
            extra={<Button type="primary" onClick={() => navigate("/login")}>로그인하러 가기</Button>}
          />
        ) : !token ? (
          <Result status="warning" title="잘못된 링크입니다" subTitle="문자로 받은 링크를 다시 열어주세요." />
        ) : (
          <>
            <Typography.Title level={4} style={{ textAlign: "center", marginTop: 0 }}>WorkMate 운영자 비밀번호 설정</Typography.Title>
            <Typography.Paragraph type="secondary" style={{ textAlign: "center" }}>
              이 링크는 30분 동안 한 번만 쓸 수 있어요.
            </Typography.Paragraph>
            <Form layout="vertical" onFinish={onFinish}>
              <Form.Item name="password" label="새 비밀번호" rules={[{ required: true, message: "비밀번호를 입력하세요" }, { min: 8, message: "8자 이상" }]}>
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Form.Item
                name="password_confirmation"
                label="비밀번호 확인"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "한 번 더 입력하세요" },
                  ({ getFieldValue }) => ({
                    validator: (_, value) =>
                      !value || getFieldValue("password") === value ? Promise.resolve() : Promise.reject(new Error("비밀번호가 일치하지 않습니다")),
                  }),
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>비밀번호 설정</Button>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}
