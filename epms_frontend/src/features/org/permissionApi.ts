import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type { 
  PermissionRequest, 
  PermissionResponse, 
  AssignPermissionRequest, 
  RoleLevelPermissionResponse,
  PermissionMatrixResponse,
  UpdatePermissionMatrixRequest
} from "./orgTypes";

export const permissionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPermissions: builder.query<PermissionResponse[], void>({
      query: () => "/permissions",
      transformResponse: (response: ApiResponse<PermissionResponse[]>) => response.data,
      providesTags: ["Permission"],
    }),

    createPermission: builder.mutation<PermissionResponse, PermissionRequest>({
      query: (body) => ({
        url: "/permissions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Permission"],
    }),

    updatePermission: builder.mutation<PermissionResponse, { id: number; body: PermissionRequest }>({
      query: ({ id, body }) => ({
        url: `/permissions/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Permission"],
    }),

    deletePermission: builder.mutation<void, number>({
      query: (id) => ({
        url: `/permissions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Permission"],
    }),

    getAssignedPermissions: builder.query<RoleLevelPermissionResponse[], { roleId: number; levelId: number }>({
      query: ({ roleId, levelId }) => `/permissions/assign/${roleId}/${levelId}`,
      transformResponse: (response: ApiResponse<RoleLevelPermissionResponse[]>) => response.data,
      providesTags: ["RoleLevelPermission"],
    }),

    assignPermission: builder.mutation<void, AssignPermissionRequest>({
      query: (body) => ({
        url: "/permissions/assign",
        method: "POST",
        body,
      }),
      invalidatesTags: ["RoleLevelPermission"],
    }),

    togglePermission: builder.mutation<void, AssignPermissionRequest>({
      query: (body) => ({
        url: "/permissions/assign/toggle",
        method: "POST",
        body,
      }),
      invalidatesTags: ["RoleLevelPermission"],
    }),

    removeAssignedPermission: builder.mutation<void, number>({
      query: (assignmentId) => ({
        url: `/permissions/assign/${assignmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["RoleLevelPermission"],
    }),

    getPermissionMatrix: builder.query<PermissionMatrixResponse, void>({
      query: () => "/permissions/matrix",
      transformResponse: (response: ApiResponse<PermissionMatrixResponse>) => response.data,
      providesTags: ["Permission", "RoleLevelPermission"],
    }),

    updatePermissionMatrix: builder.mutation<void, UpdatePermissionMatrixRequest>({
      query: (body) => ({
        url: "/permissions/matrix",
        method: "POST",
        body,
      }),
      invalidatesTags: ["RoleLevelPermission"],
    }),
  }),
});

export const {
  useGetPermissionsQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  useGetAssignedPermissionsQuery,
  useAssignPermissionMutation,
  useTogglePermissionMutation,
  useRemoveAssignedPermissionMutation,
  useGetPermissionMatrixQuery,
  useUpdatePermissionMatrixMutation,
} = permissionApi;
