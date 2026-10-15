import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type { DepartmentRequest, DepartmentResponse } from "./orgTypes";
import type { EmployeeResponse } from "../employee/employeeTypes";

export const departmentApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getDepartments: builder.query<DepartmentResponse[], void>({
      query: () => "/departments",
      transformResponse: (res: ApiResponse<DepartmentResponse[]>) => res.data,
      providesTags: ["Department"],
    }),

    getDepartmentById: builder.query<DepartmentResponse, number | string>({
      query: (id) => `/org/departments/${id}`,
      transformResponse: (res: ApiResponse<DepartmentResponse>) => res.data,
      providesTags: (_result, _error, id) => [{ type: "Department", id }],
    }),

    getDepartmentMembers: builder.query<EmployeeResponse[], number | string>({
      query: (id) => `/departments/${id}/members`,
      transformResponse: (res: ApiResponse<EmployeeResponse[]>) => res.data,
      providesTags: ["Employee"],
    }),

    createDepartment: builder.mutation<DepartmentResponse, DepartmentRequest>({
      query: (body) => ({
        url: "/departments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Department"],
    }),

    updateDepartment: builder.mutation<
      DepartmentResponse,
      { id: number | string; body: DepartmentRequest }
    >({
      query: ({ id, body }) => ({
        url: `/departments/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Department", id },
        "Department",
      ],
    }),

    deleteDepartment: builder.mutation<void, number | string>({
      query: (id) => ({
        url: `/departments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Department"],
    }),

    getActiveDepartments: builder.query<DepartmentResponse[], void>({
      query: () => "/departments/active",
      transformResponse: (res: ApiResponse<DepartmentResponse[]>) => res.data,
      providesTags: ["Department"],
    }),

    getDepartmentHeadcount: builder.query<number, number | string>({
      query: (id) => `/departments/${id}/headcount`,
      transformResponse: (res: ApiResponse<number>) => res.data,
    }),
  }),
});

export const {
  useGetDepartmentsQuery,
  useGetActiveDepartmentsQuery,
  useGetDepartmentHeadcountQuery,
  useGetDepartmentByIdQuery,
  useGetDepartmentMembersQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
} = departmentApi;
