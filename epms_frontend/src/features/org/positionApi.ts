import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type { PositionRequest, PositionResponse } from "./orgTypes";

export const positionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPositions: builder.query<PositionResponse[], void>({
      query: () => "/positions",
      transformResponse: (res: ApiResponse<PositionResponse[]>) => res.data,
      providesTags: ["Position"],
    }),

    getPositionById: builder.query<PositionResponse, number>({
      query: (id) => `/positions/${id}`,
      transformResponse: (res: ApiResponse<PositionResponse>) => res.data,
      providesTags: (_result, _error, id) => [{ type: "Position", id }],
    }),

    createPosition: builder.mutation<PositionResponse, PositionRequest>({
      query: (body) => ({
        url: "/positions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Position"],
    }),

    updatePosition: builder.mutation<
      PositionResponse,
      { id: number; body: PositionRequest }
    >({
      query: ({ id, body }) => ({
        url: `/positions/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Position", id },
        "Position",
      ],
    }),

    deletePosition: builder.mutation<void, number>({
      query: (id) => ({
        url: `/positions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Position"],
    }),

  }),
});

export const {
  useGetPositionsQuery,
  useGetPositionByIdQuery,
  useCreatePositionMutation,
  useUpdatePositionMutation,
  useDeletePositionMutation,
} = positionApi;
