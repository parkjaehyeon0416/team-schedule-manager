import { useState } from "react";
import { Typography, Card, Table, Button, Select, Row, Col, Statistic, Alert } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FileTextOutlined, DownloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { getTaxSummary, downloadTaxSummaryPdf } from "../api/taxSummary";
import type { TaxMonthRow } from "../api/taxSummary";
import { formatCurrency } from "../utils/format";

const columns: ColumnsType<TaxMonthRow> = [
  { title: "월", dataIndex: "month", render: (m) => `${m}월`, width: 60 },
  { title: "근무일수", dataIndex: "work_days", render: (v) => `${v}일` },
  { title: "총 공수", dataIndex: "total_work_units" },
  { title: "총 수입", dataIndex: "total_income", render: (v) => formatCurrency(v) },
  { title: "총 경비", dataIndex: "total_expenses", render: (v) => formatCurrency(v) },
  { title: "예상 원천징수액", dataIndex: "estimated_tax", render: (v) => formatCurrency(v) },
  { title: "실수령액", dataIndex: "net_income", render: (v) => formatCurrency(v) },
];

const currentYear = dayjs().year();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function TaxSummary() {
  const [year, setYear] = useState(currentYear);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tax-summary", year],
    queryFn: () => getTaxSummary(year),
  });

  const summary = data?.data;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadTaxSummaryPdf(year);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          수입·경비 정리 (세무사용)
        </Typography.Title>
        <div>
          <Select
            value={year}
            onChange={setYear}
            style={{ width: 120, marginRight: 8 }}
            options={YEAR_OPTIONS.map((y) => ({ value: y, label: `${y}년` }))}
          />
          <Button type="primary" icon={<DownloadOutlined />} loading={downloading} onClick={handleDownload}>
            PDF 다운로드
          </Button>
        </div>
      </div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="이 자료는 종합소득세 신고 참고용 간이 추정치입니다. 실제 신고는 세무 전문가와 상담 후 진행하세요."
      />

      {summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Card><Statistic title={`${year}년 총 수입`} value={formatCurrency(summary.totals.total_income)} /></Card></Col>
          <Col span={6}><Card><Statistic title="총 경비" value={formatCurrency(summary.totals.total_expenses)} /></Card></Col>
          <Col span={6}><Card><Statistic title="예상 원천징수액" value={formatCurrency(summary.totals.estimated_tax)} /></Card></Col>
          <Col span={6}><Card><Statistic title="실수령액" value={formatCurrency(summary.totals.net_income)} /></Card></Col>
        </Row>
      )}

      <Card>
        <Table
          rowKey="year_month"
          loading={isLoading}
          columns={columns}
          dataSource={summary?.months ?? []}
          pagination={false}
        />
      </Card>
    </div>
  );
}
