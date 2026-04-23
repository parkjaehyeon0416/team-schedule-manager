/**
 * 월별 수입 대시보드 페이지
 *
 * 기획서 v2.2의 3.7절 '공수·급여·세금 자동 계산 시스템' 결과 화면
 * monthly_summaries 테이블의 데이터를 시각화
 *
 * ★ 현재 상태: 뼈대 UI (가짜 데이터로 렌더링 확인용)
 * ★ 다음 단계: /api/summary/monthly?year=2026&month=04 API 연동
 */

import { useState } from "react";
import { Card, Row, Col, DatePicker, Statistic, Typography, Space } from "antd";
import {
  DollarOutlined,
  ShoppingOutlined,
  WalletOutlined,
  CalendarOutlined,
  HomeOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import dayjs, { Dayjs } from "dayjs";

const { Title } = Typography;

// ═══════════════════════════════════════════════════
// 가짜 데이터 (Mock Data)
// ═══════════════════════════════════════════════════
// 내일 API 연동 시 이 부분이 실제 데이터로 교체됨
// ═══════════════════════════════════════════════════
const MOCK_CURRENT_SUMMARY = {
  total_income: 3_600_000, // 총 수입 (원)
  total_expenses: 180_000, // 총 경비
  estimated_tax: 118_800, // 예상 세금 (3.3%)
  net_income: 3_301_200, // 실수령액
  work_days: 18, // 근무 일수
  site_count: 12, // 현장 수
  total_work_units: 20.5, // 총 공수
};

const MOCK_MONTHLY_TREND = [
  { month: "2025-11", income: 2_800_000, expenses: 150_000 },
  { month: "2025-12", income: 3_100_000, expenses: 200_000 },
  { month: "2026-01", income: 2_500_000, expenses: 120_000 },
  { month: "2026-02", income: 3_200_000, expenses: 180_000 },
  { month: "2026-03", income: 3_800_000, expenses: 220_000 },
  { month: "2026-04", income: 3_600_000, expenses: 180_000 },
];

// ═══════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════

/**
 * 숫자를 한국 원화 형식으로 포맷 (예: 3600000 → "₩3,600,000")
 */
const formatKRW = (value: number): string => {
  return `₩${value.toLocaleString("ko-KR")}`;
};

/**
 * 차트용 숫자 포맷 (천 단위, 예: 3600000 → "360만")
 */
const formatShortKRW = (value: number): string => {
  if (value >= 10_000) {
    return `${(value / 10_000).toFixed(0)}만`;
  }
  return value.toLocaleString("ko-KR");
};

// ═══════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════

export default function MonthlySummary() {
  // 선택된 월 (기본: 오늘 기준 이번 달)
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());

  // TODO: 실제로는 selectedMonth가 바뀔 때 API 호출
  // const { data } = useQuery(['summary', selectedMonth.format('YYYY-MM')], ...)
  const summary = MOCK_CURRENT_SUMMARY;
  const trend = MOCK_MONTHLY_TREND;

  return (
    <div style={{ padding: "24px" }}>
      {/* ═══ 페이지 헤더 ═══ */}
      <Space
        style={{
          marginBottom: 24,
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          <BarChartOutlined /> 월별 수입 현황
        </Title>

        <DatePicker
          picker="month"
          value={selectedMonth}
          onChange={(date) => date && setSelectedMonth(date)}
          format="YYYY년 MM월"
          allowClear={false}
          style={{ minWidth: 150 }}
        />
      </Space>

      {/* ═══ 핵심 지표 카드 6개 (2줄 x 3개) ═══ */}
      <Row gutter={[16, 16]}>
        {/* 💰 총 수입 */}
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable>
            <Statistic
              title={
                <>
                  <DollarOutlined /> 총 수입
                </>
              }
              value={summary.total_income}
              formatter={(val) => formatKRW(Number(val))}
              valueStyle={{ color: "#1890ff", fontSize: 28 }}
            />
          </Card>
        </Col>

        {/* 🧾 총 경비 */}
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable>
            <Statistic
              title={
                <>
                  <ShoppingOutlined /> 총 경비
                </>
              }
              value={summary.total_expenses}
              formatter={(val) => formatKRW(Number(val))}
              valueStyle={{ color: "#fa8c16", fontSize: 28 }}
            />
          </Card>
        </Col>

        {/* ✨ 실수령액 (가장 중요! 강조) */}
        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            style={{
              background: "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)",
              border: "none",
            }}
          >
            <Statistic
              title={
                <span style={{ color: "rgba(255,255,255,0.9)" }}>
                  <WalletOutlined /> 실수령액
                </span>
              }
              value={summary.net_income}
              formatter={(val) => formatKRW(Number(val))}
              valueStyle={{ color: "white", fontSize: 28, fontWeight: "bold" }}
            />
            <div
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              수입 - 경비 - 예상세금({formatKRW(summary.estimated_tax)})
            </div>
          </Card>
        </Col>

        {/* 🗓️ 근무 일수 */}
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable>
            <Statistic
              title={
                <>
                  <CalendarOutlined /> 근무 일수
                </>
              }
              value={summary.work_days}
              suffix="일"
              valueStyle={{ fontSize: 24 }}
            />
          </Card>
        </Col>

        {/* 🏠 현장 수 */}
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable>
            <Statistic
              title={
                <>
                  <HomeOutlined /> 현장 수
                </>
              }
              value={summary.site_count}
              suffix="개"
              valueStyle={{ fontSize: 24 }}
            />
          </Card>
        </Col>

        {/* ⚖️ 총 공수 */}
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable>
            <Statistic
              title={<>⚖️ 총 공수</>}
              value={summary.total_work_units}
              precision={1}
              suffix="공수"
              valueStyle={{ fontSize: 24 }}
            />
          </Card>
        </Col>
      </Row>

      {/* ═══ 월별 수입 추이 차트 ═══ */}
      <Card
        title={
          <>
            <BarChartOutlined /> 최근 6개월 수입·경비 추이
          </>
        }
        style={{ marginTop: 24 }}
      >
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={formatShortKRW} />
            <Tooltip
              formatter={(value: number) => formatKRW(value)}
              contentStyle={{ borderRadius: 8 }}
            />
            <Legend />
            <Bar
              dataKey="income"
              name="수입"
              fill="#1890ff"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="expenses"
              name="경비"
              fill="#fa8c16"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ═══ 개발 안내 (나중에 삭제) ═══ */}
      <Card
        style={{ marginTop: 16, background: "#fffbe6", borderColor: "#faad14" }}
      >
        <div style={{ color: "#d48806" }}>
          ⚠️ 이 페이지는 현재 <strong>뼈대 UI</strong>이며 가짜 데이터를 표시
          중입니다. 내일 <code>/api/summary/monthly</code> API 연동 후 실제
          데이터로 교체 예정입니다.
        </div>
      </Card>
    </div>
  );
}
