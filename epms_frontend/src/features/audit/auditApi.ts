import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type {
  AuditChangeDTO,
  AuditExportParams,
  AuditLogDetailDTO,
  AuditLogFilters,
  AuditLogPage,
  AuditStatisticsDTO,
  AuditSummaryDTO,
  ReportType,
  UserActivityDTO,
} from "./auditTypes";
import type { PagedResponse } from "../employee/employeeTypes";

const cleanParams = (params: object) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
  );

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    link.remove();
    window.URL.revokeObjectURL(url);
  }, 100);
};

export const auditApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query<AuditLogPage, AuditLogFilters>({
      query: (filters) => ({
        url: "/audit-logs",
        params: cleanParams(filters),
      }),
      transformResponse: (response: ApiResponse<AuditLogPage> | AuditLogPage) =>
        "data" in response ? response.data : response,
      providesTags: ["AuditTrail"],
    }),
    getAuditLogDetail: builder.query<AuditLogDetailDTO, number>({
      query: (auditId) => `/audit-logs/${auditId}`,
      transformResponse: (response: ApiResponse<AuditLogDetailDTO> | AuditLogDetailDTO) =>
        "data" in response ? response.data : response,
      providesTags: (_result, _error, id) => [{ type: "AuditTrail", id }],
    }),
    getEntityAuditHistory: builder.query<AuditChangeDTO[], { tableName: string; recordId: number }>({
      query: ({ tableName, recordId }) =>
        `/audit-logs/entity/${encodeURIComponent(tableName)}/${recordId}`,
      transformResponse: (response: ApiResponse<AuditChangeDTO[]> | AuditChangeDTO[]) =>
        Array.isArray(response) ? response : response.data,
      providesTags: ["AuditTrail"],
    }),
    getAuditSummary: builder.query<AuditSummaryDTO, { employeeId?: number; startDate?: string; endDate?: string }>({
      query: (params) => ({
        url: "/audit-logs/summary",
        params: cleanParams(params),
      }),
      transformResponse: (response: ApiResponse<AuditSummaryDTO> | AuditSummaryDTO) =>
        "data" in response ? response.data : response,
      providesTags: ["AuditTrail"],
    }),
    getAuditStatistics: builder.query<AuditStatisticsDTO, { fromDate: string; toDate: string }>({
      query: (params) => ({
        url: "/audit-logs/statistics",
        params,
      }),
      transformResponse: (response: ApiResponse<AuditStatisticsDTO> | AuditStatisticsDTO) =>
        "data" in response ? response.data : response,
      providesTags: ["AuditTrail"],
    }),
    getUserActivity: builder.query<PagedResponse<UserActivityDTO>, { userId: number; page?: number; size?: number }>({
      query: ({ userId, page = 0, size = 15 }) => ({
        url: `/audit-logs/user/${userId}/activity`,
        params: { page, size },
      }),
      transformResponse: (response: ApiResponse<PagedResponse<UserActivityDTO>> | PagedResponse<UserActivityDTO>) =>
        "data" in response ? response.data : response,
      providesTags: ["AuditTrail"],
    }),
    exportAuditCsv: builder.mutation<void, AuditExportParams>({
      queryFn: async (params, _api, _extra, fetchWithBQ) => {
        const result = await fetchWithBQ({
          url: "/audit-logs/export/csv",
          params: cleanParams(params),
          responseHandler: (response: Response) => response.blob(),
        });

        if (result.error) return { error: result.error };
        downloadBlob(result.data as Blob, `audit-log-${params.fromDate}-to-${params.toDate}.csv`);
        return { data: undefined };
      },
    }),
    exportAuditPdf: builder.mutation<void, AuditExportParams & { reportType: ReportType }>({
      queryFn: async ({ reportType, ...params }, _api, _extra, fetchWithBQ) => {
        const result = await fetchWithBQ({
          url: "/audit-logs/export/pdf",
          params: cleanParams({ reportType, ...params }),
          responseHandler: (response: Response) => response.blob(),
        });

        if (result.error) return { error: result.error };
        downloadBlob(result.data as Blob, `audit-report-${params.fromDate}-to-${params.toDate}.pdf`);
        return { data: undefined };
      },
    }),
  }),
});

export const {
  useGetAuditLogsQuery,
  useGetAuditLogDetailQuery,
  useGetEntityAuditHistoryQuery,
  useGetAuditSummaryQuery,
  useGetAuditStatisticsQuery,
  useGetUserActivityQuery,
  useExportAuditCsvMutation,
  useExportAuditPdfMutation,
} = auditApi;
