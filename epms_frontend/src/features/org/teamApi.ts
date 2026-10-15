import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type { TeamRequest, TeamResponse, TeamAssignmentRequest, TeamMemberResponse } from "./orgTypes";

export const teamApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTeams: builder.query<TeamResponse[], void>({
      query: () => "/teams",
      transformResponse: (res: ApiResponse<TeamResponse[]>) => res.data,
      providesTags: ["Teams"],
    }),
    createTeam: builder.mutation<number, TeamRequest>({
      query: (body) => ({
        url: "/teams",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Teams"],
    }),
    assignEmployee: builder.mutation<void, TeamAssignmentRequest>({
      query: (body) => ({
        url: "/teams/assign",
        method: "POST",
        body,
      }),
      invalidatesTags: ["TeamMembers"],
    }),
    getTeamMembers: builder.query<TeamMemberResponse[], number | string>({
      query: (teamId) => `/teams/${teamId}/members`,
      transformResponse: (res: ApiResponse<TeamMemberResponse[]>) => res.data,
      providesTags: ["TeamMembers"],
    }),
    getEmployeeTeams: builder.query<TeamResponse[], number | string>({
      query: (employeeId) => `/teams/employee/${employeeId}`,
      transformResponse: (res: ApiResponse<TeamResponse[]>) => res.data,
      providesTags: ["EmployeeTeams"],
    }),
    updateTeam: builder.mutation<void, { id: number | string; body: TeamRequest }>({
      query: ({ id, body }) => ({
        url: `/teams/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Teams"],
    }),
    deleteTeam: builder.mutation<void, number | string>({
      query: (id) => ({
        url: `/teams/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Teams"],
    }),
    removeTeamMember: builder.mutation<void, { teamId: number | string; employeeId: number | string }>({
      query: ({ teamId, employeeId }) => ({
        url: `/teams/${teamId}/members/${employeeId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["TeamMembers"],
    }),
  }),
});

export const {
  useGetTeamsQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
  useRemoveTeamMemberMutation,
  useAssignEmployeeMutation,
  useGetTeamMembersQuery,
  useGetEmployeeTeamsQuery,
} = teamApi;
