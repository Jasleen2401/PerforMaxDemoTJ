import { api } from "./api";
import type { ApiResponse } from "./ApiResponse";
import type {
  DevelopmentGoalRequest,
  DevelopmentGoalResponse,
  DevelopmentGoalStatus,
  DevelopmentGoalUpdateRequest,
  DevelopmentProgressRequest,
  DevelopmentProgressResponse,
  IdpCreateRequest,
  IdpResponse,
  IdpUpdateRequest,
} from "../features/idp/idpTypes";

export const idpApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getIdps: builder.query<ApiResponse<IdpResponse[]>, void>({
      query: () => "/idp",
      providesTags: (result) =>
        result?.data
          ? [...result.data.map(({ idpId }) => ({ type: "IDP" as const, id: idpId })), { type: "IDP", id: "LIST" }]
          : [{ type: "IDP", id: "LIST" }],
    }),
    getIdpById: builder.query<ApiResponse<IdpResponse>, number>({
      query: (id) => `/idp/${id}`,
      providesTags: (_result, _error, id) => [{ type: "IDP", id }],
    }),
    getIdpsByEmployee: builder.query<ApiResponse<IdpResponse[]>, number>({
      query: (employeeId) => `/idp/employee/${employeeId}`,
      providesTags: [{ type: "IDP", id: "LIST" }],
    }),
    getIdpsByInvolvedUser: builder.query<ApiResponse<IdpResponse[]>, number>({
      query: (userId) => `/idp/involved/${userId}`,
      providesTags: [{ type: "IDP", id: "LIST" }],
    }),
    createIdp: builder.mutation<ApiResponse<IdpResponse>, IdpCreateRequest>({
      query: (body) => ({ url: "/idp", method: "POST", body }),
      invalidatesTags: [{ type: "IDP", id: "LIST" }],
    }),
    updateIdp: builder.mutation<ApiResponse<IdpResponse>, { id: number; body: IdpUpdateRequest }>({
      query: ({ id, body }) => ({ url: `/idp/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "IDP", id }, { type: "IDP", id: "LIST" }],
    }),
    activateIdp: builder.mutation<ApiResponse<IdpResponse>, number>({
      query: (id) => ({ url: `/idp/${id}/activate`, method: "PUT" }),
      invalidatesTags: (_result, _error, id) => [{ type: "IDP", id }, { type: "IDP", id: "LIST" }],
    }),
    completeIdp: builder.mutation<ApiResponse<IdpResponse>, number>({
      query: (id) => ({ url: `/idp/${id}/complete`, method: "PUT" }),
      invalidatesTags: (_result, _error, id) => [{ type: "IDP", id }, { type: "IDP", id: "LIST" }],
    }),
    cancelIdp: builder.mutation<ApiResponse<IdpResponse>, number>({
      query: (id) => ({ url: `/idp/${id}/cancel`, method: "PUT" }),
      invalidatesTags: (_result, _error, id) => [{ type: "IDP", id }, { type: "IDP", id: "LIST" }],
    }),
    deleteIdp: builder.mutation<ApiResponse<void>, number>({
      query: (id) => ({ url: `/idp/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "IDP", id: "LIST" }],
    }),
    getGoalsByIdp: builder.query<ApiResponse<DevelopmentGoalResponse[]>, number>({
      query: (idpId) => `/idp/goals/${idpId}`,
      providesTags: (result) =>
        result?.data
          ? [...result.data.map(({ goalId }) => ({ type: "IdpGoal" as const, id: goalId })), { type: "IdpGoal", id: "LIST" }]
          : [{ type: "IdpGoal", id: "LIST" }],
    }),
    createGoal: builder.mutation<ApiResponse<DevelopmentGoalResponse>, DevelopmentGoalRequest>({
      query: (body) => ({ url: "/idp/goals", method: "POST", body }),
      invalidatesTags: [{ type: "IdpGoal", id: "LIST" }, { type: "IDP", id: "LIST" }],
    }),
    updateGoal: builder.mutation<ApiResponse<DevelopmentGoalResponse>, { id: number; body: DevelopmentGoalUpdateRequest }>({
      query: ({ id, body }) => ({ url: `/idp/goals/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "IdpGoal", id }, { type: "IdpGoal", id: "LIST" }, { type: "IDP", id: "LIST" }],
    }),
    updateGoalStatus: builder.mutation<ApiResponse<DevelopmentGoalResponse>, { id: number; status: DevelopmentGoalStatus }>({
      query: ({ id, status }) => ({ url: `/idp/goals/${id}/status`, method: "PUT", params: { status } }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "IdpGoal", id }, { type: "IdpGoal", id: "LIST" }, { type: "IDP", id: "LIST" }],
    }),
    deleteGoal: builder.mutation<ApiResponse<void>, number>({
      query: (id) => ({ url: `/idp/goals/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "IdpGoal", id: "LIST" }, { type: "IDP", id: "LIST" }],
    }),
    getIdpProgressByGoal: builder.query<ApiResponse<DevelopmentProgressResponse[]>, number>({
      query: (goalId) => `/idp/progress/${goalId}`,
      providesTags: (result) =>
        result?.data
          ? [...result.data.map(({ updateId }) => ({ type: "IdpProgress" as const, id: updateId })), { type: "IdpProgress", id: "LIST" }]
          : [{ type: "IdpProgress", id: "LIST" }],
    }),
    addIdpProgress: builder.mutation<ApiResponse<DevelopmentProgressResponse>, DevelopmentProgressRequest>({
      query: (body) => ({ url: "/idp/progress", method: "POST", body }),
      invalidatesTags: (_result, _error, { goalId }) => [
        { type: "IdpProgress", id: "LIST" },
        { type: "IdpGoal", id: goalId },
        { type: "IdpGoal", id: "LIST" },
        { type: "IDP", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetIdpsQuery,
  useGetIdpByIdQuery,
  useGetIdpsByEmployeeQuery,
  useGetIdpsByInvolvedUserQuery,
  useCreateIdpMutation,
  useUpdateIdpMutation,
  useActivateIdpMutation,
  useCompleteIdpMutation,
  useCancelIdpMutation,
  useDeleteIdpMutation,
  useGetGoalsByIdpQuery,
  useCreateGoalMutation,
  useUpdateGoalMutation,
  useUpdateGoalStatusMutation,
  useDeleteGoalMutation,
  useGetIdpProgressByGoalQuery,
  useAddIdpProgressMutation,
} = idpApi;
