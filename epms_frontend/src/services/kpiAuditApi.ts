import { api } from './api';
import type { ApiResponse } from './ApiResponse';
import type { OrgKpiHistoryResponse, KpiAuditLogResponse } from '../features/kpi/kpiAuditTypes';

export const kpiAuditApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getOrgKpiHistory: builder.query<ApiResponse<OrgKpiHistoryResponse>, {
      cycleId: number; action?: string; page?: number; size?: number;
    }>({
      query: ({ cycleId, action, page = 0, size = 20 }) => {
        let url = `/kpi-audit/org?cycleId=${cycleId}&page=${page}&size=${size}`;
        if (action) url += `&action=${action}`;
        return url;
      },
      providesTags: ['AuditTrail'],
    }),

    getTeamKpiHistory: builder.query<ApiResponse<OrgKpiHistoryResponse>, {
      cycleId: number; action?: string; page?: number; size?: number;
    }>({
      query: ({ cycleId, action, page = 0, size = 20 }) => {
        let url = `/kpi-audit/team?cycleId=${cycleId}&page=${page}&size=${size}`;
        if (action) url += `&action=${action}`;
        return url;
      },
      providesTags: ['AuditTrail'],
    }),

    getIndividualKpiAudit: builder.query<ApiResponse<KpiAuditLogResponse[]>, {
      employeeId: number; cycleId: number;
    }>({
      query: ({ employeeId, cycleId }) =>
        `/kpi-audit/employee/${employeeId}?cycleId=${cycleId}`,
      providesTags: ['AuditTrail'],
    }),
  }),
});

export const {
  useGetOrgKpiHistoryQuery,
  useGetTeamKpiHistoryQuery,
  useGetIndividualKpiAuditQuery,
} = kpiAuditApi;
