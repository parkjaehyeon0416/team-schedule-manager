import axiosInstance from "./axiosInstance";
import type { ApiResponse, Team } from "../types";

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

export const getTeams = async () => {
  const res = await axiosInstance.get<ApiResponse<Team[]>>("/api/teams");
  return res.data;
};

export const createTeam = async (name: string) => {
  const res = await axiosInstance.post<ApiResponse<Team>>("/api/teams", { name });
  return res.data;
};

export const updateTeam = async (id: number, name: string) => {
  const res = await axiosInstance.put<ApiResponse<Team>>(`/api/teams/${id}`, { name });
  return res.data;
};

export const deleteTeam = async (id: number) => {
  const res = await axiosInstance.delete<ApiResponse<null>>(`/api/teams/${id}`);
  return res.data;
};

export const joinTeam = async (inviteCode: string) => {
  const res = await axiosInstance.post<ApiResponse<unknown>>("/api/teams/join", {
    invite_code: inviteCode,
  });
  return res.data;
};
