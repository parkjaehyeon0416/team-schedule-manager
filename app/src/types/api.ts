// ═══════════════════════════════════════════════════════════════
// 📄 src/types/api.ts
//   백엔드 API 응답 타입 정의 모음
//   v10.1.1 백엔드 API 5개 + v9.0 Schedule 확장 반영
// ═══════════════════════════════════════════════════════════════

/**
 * 모든 API가 공통으로 반환하는 응답 형태
 * Laravel의 ApiResponse::success() / error() 규약
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error_code: string | null;
}

/**
 * 공정 (work_types 테이블)
 * GET /api/work-types
 */
export interface WorkType {
  id: number;
  name: string; // "도배", "타일" 등
  code: string; // "wallpaper", "tile" 등
  color: string; // "#FF5722" 등 공정별 색상
  icon: string; // "brush" 등 아이콘 이름
  team_id: number | null;
  sort_order: number;
}

/**
 * 내 단가 설정 (user_wage_settings 테이블)
 * GET/POST/DELETE /api/wage-settings
 */
export interface WageSetting {
  id: number;
  user_id: number;
  work_type_id: number;
  default_wage: string; // decimal:2 → "280000.00"
  default_work_units: string; // decimal:1 → "1.0"
  memo: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  work_type?: WorkType; // with() Eager Load 시 포함
}

/**
 * 월별 집계 (monthly_summaries 테이블)
 * GET /api/monthly-summary?year=&month=
 */
export interface MonthlySummary {
  id: number;
  user_id: number;
  year_month: string; // "2026-04"
  total_work_units: string;
  total_income: string;
  total_expenses: string;
  net_income: string;
  work_days: number;
  site_count: number;
  estimated_tax: string;
  last_calculated_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 팀원 (team members)
 * GET /api/team/members
 */
export interface TeamMember {
  id: number;
  name: string;
  role_id: number;
}

/**
 * 현장 (sites 테이블)
 */
export interface Site {
  id: number;
  apt_name: string;
  dong: string;
  ho: string;
}

/**
 * 일정 (schedules 테이블, v9.0 필드 반영)
 */
export interface Schedule {
  id: number;
  team_id: number;
  site_id: number | null;
  date: string; // "2026-04-15"
  work_type: string | null; // 기존 ENUM (도배/타일/필름)
  work_type_id: number | null; // ★ v9.0 외래키
  daily_wage: string | null; // ★ v9.0
  work_units: string; // ★ v9.0
  expenses: string; // ★ v9.0
  expenses_memo: string | null; // ★ v9.0
  district: string | null;
  area_m2: string | null;
  memo: string | null;
  status: string;
  users?: TeamMember[];
  site?: Site | null;
  work_type_relation?: WorkType; // workType() 관계 로드 시
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
