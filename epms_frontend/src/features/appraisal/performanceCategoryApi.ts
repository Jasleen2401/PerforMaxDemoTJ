import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type { PerformanceCategory } from "../../types/appraisal";

export const performanceCategoryApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPerformanceCategories: builder.query<ApiResponse<PerformanceCategory[]>, void>({
      query: () => "/performance-categories",
      providesTags: ["PerformanceCategory"],
    }),
    getPerformanceCategoryById: builder.query<ApiResponse<PerformanceCategory>, number>({
      query: (id) => `/performance-categories/${id}`,
      providesTags: ["PerformanceCategory"],
    }),
    createPerformanceCategory: builder.mutation<ApiResponse<PerformanceCategory>, PerformanceCategory>({
      query: (category) => ({
        url: "/performance-categories",
        method: "POST",
        body: category,
      }),
      invalidatesTags: ["PerformanceCategory"],
    }),
    updatePerformanceCategory: builder.mutation<ApiResponse<PerformanceCategory>, { id: number; category: PerformanceCategory }>({
      query: ({ id, category }) => ({
        url: `/performance-categories/${id}`,
        method: "PUT",
        body: category,
      }),
      invalidatesTags: ["PerformanceCategory"],
    }),
    deletePerformanceCategory: builder.mutation<ApiResponse<void>, number>({
      query: (id) => ({
        url: `/performance-categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PerformanceCategory"],
    }),
  }),
});

export const {
  useGetPerformanceCategoriesQuery,
  useGetPerformanceCategoryByIdQuery,
  useCreatePerformanceCategoryMutation,
  useUpdatePerformanceCategoryMutation,
  useDeletePerformanceCategoryMutation,
} = performanceCategoryApi;
