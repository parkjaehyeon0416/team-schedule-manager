import axiosInstance from "./axiosInstance";
import type { ApiResponse } from "../types";

export type TeamMember = {
  id: number;
  name: string;
  role_id: number;
};

export const getTeamMembers = async () => {
  const res = await axiosInstance.get<ApiResponse<TeamMember[]>>(
    "/api/team/members",
  );
  return res.data;
};
