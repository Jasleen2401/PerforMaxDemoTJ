import type { EmployeeResponse, PagedResponse } from "../employee/employeeTypes";

export type AuditAction = "CREATE" | "INSERT" | "UPDATE" | "DELETE" | "ACCESS" | "RESTORE" | "EXPORT";
export type AuditStatus = "SUCCESS" | "FAILURE" | "WARNING";
export type ReportType = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" | "CUSTOM_RANGE";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SortDirection = "ASC" | "DESC";

export interface AuditLogDTO {
  auditId: number;
  tableName: string;
  recordId: number;
  action: AuditAction;
  changedByName: string;
  changedAt: string;
  ipAddress?: string;
  status: AuditStatus;
}

export interface FieldChangeDTO {
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
  dataType?: string;
}

export interface AuditLogDetailDTO extends AuditLogDTO {
  changedBy?: EmployeeResponse;
  userAgent?: string;
  fieldChanges?: Record<string, FieldChangeDTO>;
}

export interface AuditChangeDTO {
  sequenceNumber: number;
  action: AuditAction;
  changedAt: string;
  changedByName: string;
  changes?: Record<string, FieldChangeDTO>;
}

export interface AuditSummaryDTO {
  totalChanges: number;
  createdCount: number;
  updatedCount: number;
  deletedCount: number;
  accessedCount: number;
  changesByTable: Record<string, number>;
  changesByUser: Record<string, number>;
  oldestChange?: string;
  latestChange?: string;
}

export interface RiskIndicatorDTO {
  riskLevel: RiskLevel;
  description: string;
  affectedAuditIds?: number[];
  detectedAt?: string;
}

export interface AuditLogReportDTO {
  reportDate: string;
  dateRange: LocalDateRange;
  reportType: ReportType;
  summary: AuditSummaryDTO;
  details: AuditChangeDTO[];
  riskIndicators: RiskIndicatorDTO[];
  generatedBy?: string;
  generatedAt: string;
}

export interface UserActivityDTO {
  auditId: number;
  changedAt: string;
  action: string;
  tableName: string;
  recordId: number;
  summary: string;
  status: string;
}

export interface RiskMetricsDTO {
  failureRate?: number;
  bulkOperationCount?: number;
  unusualAccessPatterns?: number;
}

export interface AuditStatisticsDTO {
  totalAuditEntries: number;
  actionDistribution: Partial<Record<AuditAction, number>>;
  tableModificationCounts: Record<string, number>;
  userActivityCounts: Record<string, number>;
  averageChangesPerDay: number;
  riskMetrics?: RiskMetricsDTO;
}

export interface LocalDateRange {
  startDate: string;
  endDate: string;
}

export interface AuditLogFilters {
  tableName?: string;
  recordId?: number;
  changedBy?: number;
  action?: AuditAction;
  status?: AuditStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

export interface AuditExportParams {
  tableName?: string;
  changedBy?: number;
  fromDate: string;
  toDate: string;
}

export type AuditLogPage = PagedResponse<AuditLogDTO>;
