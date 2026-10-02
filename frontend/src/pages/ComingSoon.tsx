// ★ v18.40 — 아직 만들지 않은 운영 메뉴 자리 (회원·문의·문자·결제·통계 관리 — 순서대로 붙일 예정)
import { Result } from "antd";

export default function ComingSoon({ title, description }: { title: string; description: string }) {
  return <Result status="info" title={`${title} — 준비 중`} subTitle={description} />;
}
