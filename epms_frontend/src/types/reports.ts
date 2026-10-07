export type {
  AppraisalStatusReportDTO as AppraisalStatusReport,
  IdpTrackingReportDTO as IdpTrackingReport,
  KpiAchievementReportDTO as KpiAchievementReport,
  PerformanceRankingReportDTO as PerformanceRankingReport,
  PipTrackingReportDTO as PipTrackingReport,
} from './report';

export interface FilterState {
  selectedCycle: number | '';
  selectedDept: number | '';
}

export interface DownloadParams {
  endpoint: string;
  params?: Record<string, unknown>;
  fileName: string;
}
