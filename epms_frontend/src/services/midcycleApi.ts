import { api } from './api';
import type { ApiResponse } from './ApiResponse';
import type {
  MidcycleChangeRequest,
  MidcycleSummaryResponse,
} from '../features/kpi/midcycleTypes';

export const midcycleApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMidcycleSummary: builder.query<ApiResponse<MidcycleSummaryResponse>, { employeeId: number; cycleId: number }>({
      query: ({ employeeId, cycleId }) => `/kpi/midcycle/${employeeId}/${cycleId}`,
      providesTags: (_result, _error, { employeeId, cycleId }) => [
        { type: 'GoalSet', id: `midcycle-${employeeId}-${cycleId}` },
      ],
    }),
    triggerMidcycleChange: builder.mutation<ApiResponse<void>, MidcycleChangeRequest>({
      query: (body) => ({
        url: '/kpi/midcycle/change',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { employeeId, cycleId }) => [
        'GoalSet',
        { type: 'GoalSet', id: `midcycle-${employeeId}-${cycleId}` },
      ],
    }),
    finalizeCompositeScore: builder.mutation<ApiResponse<void>, { employeeId: number; cycleId: number }>({
      query: ({ employeeId, cycleId }) => ({
        url: `/kpi/midcycle/${employeeId}/${cycleId}/finalize`,
        method: 'POST',
      }),
      invalidatesTags: ['GoalSet'],
    }),
    calculateCompositeScore: builder.mutation<ApiResponse<void>, { employeeId: number; cycleId: number }>({
      query: ({ employeeId, cycleId }) => ({
        url: `/kpi/midcycle/${employeeId}/${cycleId}/calculate`,
        method: 'POST',
      }),
      invalidatesTags: ['GoalSet'],
    }),
  }),
});

export const {
  useGetMidcycleSummaryQuery,
  useTriggerMidcycleChangeMutation,
  useFinalizeCompositeScoreMutation,
  useCalculateCompositeScoreMutation,
} = midcycleApi;
