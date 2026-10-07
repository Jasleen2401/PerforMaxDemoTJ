import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type { JobLevelRequest, JobLevelResponse } from "./orgTypes";

export const jobLevelApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getJobLevels: builder.query<JobLevelResponse[], void>({
      query: () => "/job-levels",
      transformResponse: (res: ApiResponse<JobLevelResponse[]>) => res.data,
      providesTags: ["JobLevel"],
    }),

    getJobLevelById: builder.query<JobLevelResponse, number>({
      query: (id) => `/job-levels/${id}`,
      transformResponse: (res: ApiResponse<JobLevelResponse>) => res.data,
      providesTags: (_result, _error, id) => [{ type: "JobLevel", id }],
    }),

    createJobLevel: builder.mutation<JobLevelResponse, JobLevelRequest>({
      query: (body) => ({
        url: "/job-levels",
        method: "POST",
        body,
      }),
      invalidatesTags: ["JobLevel"],
    }),

    updateJobLevel: builder.mutation<
      JobLevelResponse,
      { id: number; body: JobLevelRequest }
    >({
      query: ({ id, body }) => ({
        url: `/job-levels/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "JobLevel", id },
        "JobLevel",
      ],
    }),

    deleteJobLevel: builder.mutation<void, number>({
      query: (id) => ({
        url: `/job-levels/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["JobLevel"],
    }),
  }),
});

export const {
  useGetJobLevelsQuery,
  useGetJobLevelByIdQuery,
  useCreateJobLevelMutation,
  useUpdateJobLevelMutation,
  useDeleteJobLevelMutation,
} = jobLevelApi;
