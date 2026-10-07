import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";

export interface FinancialYear {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: "NOT_USED" | "CURRENT" | "HISTORICAL";
}

export interface FinancialYearRequest {
  title: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export const financialYearApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getFinancialYears: builder.query<FinancialYear[], void>({
      query: () => "/financial-years",
      transformResponse: (response: ApiResponse<FinancialYear[]>) => response.data,
      providesTags: ["FinancialYear"],
    }),
    getCurrentFinancialYear: builder.query<FinancialYear, void>({
      query: () => "/financial-years/current",
      transformResponse: (response: ApiResponse<FinancialYear>) => response.data,
      providesTags: ["FinancialYear"],
    }),
    createFinancialYear: builder.mutation<FinancialYear, FinancialYearRequest>({
      query: (body) => ({
        url: "/financial-years",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<FinancialYear>) => response.data,
      invalidatesTags: ["FinancialYear"],
    }),
    setCurrentFinancialYear: builder.mutation<FinancialYear, number>({
      query: (id) => ({
        url: `/financial-years/${id}/set-current`,
        method: "PATCH",
      }),
      transformResponse: (response: ApiResponse<FinancialYear>) => response.data,
      invalidatesTags: ["FinancialYear"],
    }),
    deactivateFinancialYear: builder.mutation<FinancialYear, number>({
      query: (id) => ({
        url: `/financial-years/${id}/deactivate`,
        method: "PATCH",
      }),
      transformResponse: (response: ApiResponse<FinancialYear>) => response.data,
      invalidatesTags: ["FinancialYear"],
    }),
    deleteFinancialYear: builder.mutation<void, number>({
      query: (id) => ({
        url: `/financial-years/${id}`,
        method: "DELETE",
      }),
      transformResponse: (response: ApiResponse<void>) => response.data,
      invalidatesTags: ["FinancialYear"],
    }),
    rolloverFinancialYear: builder.mutation<FinancialYear, void>({
      query: () => ({
        url: "/financial-years/rollover",
        method: "POST",
      }),
      transformResponse: (response: ApiResponse<FinancialYear>) => response.data,
      invalidatesTags: ["FinancialYear"],
    }),
  }),
});

export const {
  useGetFinancialYearsQuery,
  useGetCurrentFinancialYearQuery,
  useCreateFinancialYearMutation,
  useSetCurrentFinancialYearMutation,
  useDeactivateFinancialYearMutation,
  useDeleteFinancialYearMutation,
  useRolloverFinancialYearMutation,
} = financialYearApi;
