import dayjs from "dayjs";

// 날짜 포맷 변환
// 사용 예: formatDate('2026-04-19') → '2026-04-19'
export const formatDate = (date: string): string => {
  return dayjs(date).format("YYYY-MM-DD");
};

// 날짜+시간 포맷 변환
// 사용 예: formatDateTime('2026-04-19T09:00:00') → '2026-04-19 09:00'
export const formatDateTime = (datetime: string): string => {
  return dayjs(datetime).format("YYYY-MM-DD HH:mm");
};

// 시간만 표시
// 사용 예: formatTime('2026-04-19 09:00:00') → '09:00'
export const formatTime = (datetime: string): string => {
  return dayjs(datetime).format("HH:mm");
};

// 월 표시
// 사용 예: formatMonth('2026-04-19') → '2026년 4월'
export const formatMonth = (date: string): string => {
  return dayjs(date).format("YYYY년 M월");
};

// 금액 표시 (천 단위 콤마 + 원)
// 사용 예: formatCurrency(1234567) → '1,234,567원'
export const formatCurrency = (amount: number | string): string => {
  return `${Number(amount).toLocaleString("ko-KR")}원`;
};
