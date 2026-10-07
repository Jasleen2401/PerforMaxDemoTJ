import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";

export interface EmployeeDepartmentResponse {
  id: number;
  employeeId: number;
  employeeName: string;
  currentDepartmentId: number;
  currentDepartmentName: string;
  parentDepartmentId?: number;
  parentDepartmentName?: string;
  isCurrent: boolean;
  createdAt: string;
  createdBy: number;
}

export interface AssignDepartmentRequest {
  employeeId: number;
  currentDepartmentId: number;
  parentDepartmentId?: number;
}

export const employeeDepartmentApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getEmployeeDepartmentHistory: builder.query<EmployeeDepartmentResponse[], number>({
      query: (employeeId) => `/employee-departments/employee/${employeeId}`,
      transformResponse: (response: ApiResponse<EmployeeDepartmentResponse[]>) => response.data,
      providesTags: (_result, _error, id) => [{ type: "EmployeeDepartment", id }],
    }),

    assignDepartment: builder.mutation<EmployeeDepartmentResponse, AssignDepartmentRequest>({
      query: (body) => ({
        url: "/employee-departments/assign",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Employee", "EmployeeDepartment"],
    }),
  }),
});

export const {
  useGetEmployeeDepartmentHistoryQuery,
  useAssignDepartmentMutation,
} = employeeDepartmentApi;
