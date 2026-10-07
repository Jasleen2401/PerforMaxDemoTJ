export interface KpiAuditLogResponse {
  id: number;
  employeeId: number;
  employeeCode?: string;
  employeeName: string;
  departmentName?: string;
  goalSetId: number;
  itemId?: number;
  action: string;
  changeReason?: string;
  changeDetails?: string;
  changedBy: number;
  changedByName: string;
  createdAt: string;
}

export interface OrgKpiHistorySummary {
  totalEvents: number;
  phasesOpened: number;
  phasesClosed: number;
  kpisApproved: number;
  kpisReverted: number;
  midCycleEvents: number;
}

export interface OrgKpiHistoryResponse {
  summary: OrgKpiHistorySummary;
  logs: KpiAuditLogResponse[];
  page: number;
  size: number;
  totalElements: number;
}
