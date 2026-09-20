// ═══════════════════════════════════════════════════════════════
// 📄 src/types/api.ts
//   백엔드 API 응답 타입 정의 모음
//   v10.1.1 백엔드 API 5개 + v9.0 Schedule 확장 반영
//   ★ v11: 현장 사진 카테고리 (PhotoCategory, SiteFile, PhotoListResponse)
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
 * 알림 설정 (notification_settings 테이블)
 * GET/PUT /api/notification-settings
 */
export interface NotificationSetting {
  id: number;
  user_id: number;
  schedule_reminder: boolean;
  team_activity: boolean;
  quote_update: boolean;
  report_view: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 현장 (sites 테이블)
 * GET/POST/PUT/DELETE /api/sites
 */
export interface Site {
  id: number;
  team_id: number | null;
  address: string;
  apt_name: string | null;
  dong: string | null;
  ho: string | null;
  area_m2: string | null;
  memo: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
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

// ═══════════════════════════════════════════════════════════════
// ★ v11 추가 — 현장 사진 구조화 (시공 전·중·후 카테고리)
// ═══════════════════════════════════════════════════════════════

/**
 * 사진 카테고리 — 시공 단계 4분류
 *  before: 시공 전 (착수 증빙)
 *  during: 시공 중 (진행 경과)
 *  after:  시공 후 (완료 증빙)
 *  other:  기타 (도면, 영수증 등)
 */
export type PhotoCategory = 'before' | 'during' | 'after' | 'other';

/**
 * 현장 사진/파일 (site_files 테이블)
 * GET /api/schedules/{id}/photos 응답의 각 사진 객체
 */
export interface SiteFile {
  id: number;
  site_id: number;
  original_name: string; // 업로드 원본 파일명 (예: "IMG_001.jpg")
  stored_name: string; // 서버 저장명 (해시)
  mime_type: string; // "image/jpeg" 등
  file_size: number; // bytes
  file_path: string; // "site-photos/abc123.jpg" 형태
  file_type: 'photo' | 'document' | null;
  uploaded_by: number | null;
  // ★ v11 신규
  photo_category: PhotoCategory;
  description: string | null;
  sort_order: number;
  // ★ v11.1 — 시공 후 사진이 가리키는 시공 전 사진의 id (시공 전 사진은 null)
  paired_with_id: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * 사진 목록 응답 (카테고리별 그룹핑)
 * GET /api/schedules/{id}/photos
 *
 * 빈 카테고리도 항상 [] 로 반환되어 모바일 코드가 안전하게 .map() 가능
 */
export interface PhotoListResponse {
  before: SiteFile[];
  during: SiteFile[];
  after: SiteFile[];
  other: SiteFile[];
  counts: {
    before: number;
    during: number;
    after: number;
    other: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// ★ v11.8 추가 — 팀
// ═══════════════════════════════════════════════════════════════
export interface Team {
  id: number;
  name: string;
  invite_code: string;
  created_by: number | null;
}

// ═══════════════════════════════════════════════════════════════
// ★ v12~v13 추가 — 견적서
// ═══════════════════════════════════════════════════════════════
export interface QuoteLine {
  id?: number;
  name: string;
  spec: string | null;
  quantity: string | number;
  unit: string;
  unit_price: string | number;
  amount?: string | number;
}

export interface Quote {
  id: number;
  user_id: number;
  team_id: number | null;
  site_id: number | null;
  work_type_id: number | null;
  client_name: string | null;
  client_contact: string | null;
  address: string | null;
  desired_date: string | null;
  memo: string | null;
  subtotal_amount: string;
  discount_amount: string;
  total_amount: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  approved_schedule_id: number | null;
  created_at: string;
  lines?: QuoteLine[];
  site?: Site | null;
}

export interface UserMaterial {
  id: number;
  name: string;
  unit: string;
  default_unit_price: string | null;
  usage_count: number;
}

// ═══════════════════════════════════════════════════════════════
// ★ v12~v13 추가 — 자동 보고서
// ═══════════════════════════════════════════════════════════════
export interface SiteReport {
  id: number;
  schedule_id: number;
  title: string;
  client_name: string | null;
  client_contact: string | null;
  greeting_message: string | null;
  share_token: string;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// ★ v14 추가 — 모바일 명함
// ═══════════════════════════════════════════════════════════════
export interface BusinessCard {
  id: number;
  user_id: number;
  share_code: string;
  display_name: string | null;
  contact_phone: string | null;
  job_title: string | null;
  years_experience: number | null;
  service_area: string | null;
  specialty: string | null;
  tagline: string | null;
  is_public: boolean;
  view_count: number;
  monthly_view_count: number;
  last_viewed_at: string | null;
}

// ═══════════════════════════════════════════════════════════════
// ★ v17 추가 — 세무 자료
// ═══════════════════════════════════════════════════════════════
export interface TaxMonthRow {
  year_month: string;
  month: number;
  total_work_units: number;
  total_income: number;
  total_expenses: number;
  estimated_tax: number;
  net_income: number;
  work_days: number;
}

export interface TaxSummary {
  year: number;
  months: TaxMonthRow[];
  totals: Omit<TaxMonthRow, 'year_month' | 'month'>;
}
