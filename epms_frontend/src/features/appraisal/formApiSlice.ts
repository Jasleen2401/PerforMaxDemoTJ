import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type { FormTemplate } from "../../types/form";

export const formApiSlice = api.injectEndpoints({
  endpoints: (builder) => ({
    getForms: builder.query<FormTemplate[], void>({
      query: () => "/forms",
      transformResponse: (response: ApiResponse<FormTemplate[]>) => response.data,
      providesTags: ["Form"],
    }),

    getFormById: builder.query<FormTemplate, string>({
      query: (id) => `/forms/${id}`,
      transformResponse: (response: ApiResponse<FormTemplate>) => response.data,
      providesTags: (_result, _error, id) => [{ type: "Form", id }],
    }),

    createForm: builder.mutation<FormTemplate, Partial<FormTemplate>>({
      query: (body) => ({
        url: "/forms",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<FormTemplate>) => response.data,
      invalidatesTags: ["Form"],
    }),

    updateForm: builder.mutation<FormTemplate, { id: string; body: Partial<FormTemplate> }>({
      query: ({ id, body }) => ({
        url: `/forms/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiResponse<FormTemplate>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: "Form", id }, "Form"],
    }),

    deleteForm: builder.mutation<void, string>({
      query: (id) => ({
        url: `/forms/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Form"],
    }),
  }),
});

export const {
  useGetFormsQuery,
  useGetFormByIdQuery,
  useLazyGetFormByIdQuery,
  useCreateFormMutation,
  useUpdateFormMutation,
  useDeleteFormMutation,
} = formApiSlice;
