export interface User {
  id: number;
  name: string;
  email: string;
  role: "superadmin" | "manager" | "member";
  team_id: number | null;
}
export interface Team {
  id: number;
  name: string;
  invite_code: string;
  created_by: number;
}
export interface Schedule {
  id: number;
  site_id: number;
  team_id: number;
  date: string;
  status: "pending" | "in_progress" | "done";
}
export interface Site {
  id: number;
  address: string;
  apt_name: string;
  dong: string;
  ho: string;
  area_m2: number | null;
}
export interface Attendance {
  id: number;
  user_id: number;
  date: string;
  check_in: string | null;
  check_out: string | null;
}
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error_code?: string;
}
