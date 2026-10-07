import { DASHBOARD_COLORS } from '../styles/dashboardStyles';
import type {
  AppraisalStatusReportDTO,
  GoalCompletionReportDTO,
  PerformanceRankingReportDTO,
} from '../types/report';

export interface PieDatum {
  name: string;
  value: number;
}

export interface GoalDatum {
  name: string;
  value: number;
  color: string;
}

export const isValidId = (value: number | '' | undefined | null): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export const calculateCompletionRate = (completed?: number, total?: number): number => {
  if (!total || total <= 0) return 0;
  return Math.round(((completed || 0) / total) * 100);
};

export const formatScore = (score?: number | string | null, digits = 1): string =>
  Number(score || 0).toFixed(digits);

export const formatPercent = (value?: number | string | null, digits = 0): string =>
  `${Number(value || 0).toFixed(digits)}%`;

export const transformPieData = (data?: AppraisalStatusReportDTO): PieDatum[] => {
  if (!data) return [];
  return [
    { name: 'Completed', value: data.completed || 0 },
    { name: 'In Progress', value: data.inProgress || 0 },
    { name: 'Pending', value: data.pending || 0 },
  ];
};

export const transformGoalData = (data?: GoalCompletionReportDTO): GoalDatum[] => {
  if (!data) return [];
  return [
    { name: 'Completed', value: data.completed || 0, color: DASHBOARD_COLORS.success },
    { name: 'In Progress', value: data.inProgress || 0, color: DASHBOARD_COLORS.primary },
    { name: 'Not Started', value: data.notStarted || 0, color: DASHBOARD_COLORS.subtle },
    { name: 'Off Track', value: data.offTrack || 0, color: DASHBOARD_COLORS.danger },
  ];
};

export const getScoreTone = (score: number) => {
  if (score >= 80) {
    return { background: DASHBOARD_COLORS.successSoft, color: DASHBOARD_COLORS.success };
  }
  if (score >= 65) {
    return { background: DASHBOARD_COLORS.warningSoft, color: DASHBOARD_COLORS.warning };
  }
  return { background: DASHBOARD_COLORS.dangerSoft, color: DASHBOARD_COLORS.danger };
};

export const getTopRows = (rows?: PerformanceRankingReportDTO[], pageSize = 5) =>
  (rows || []).slice(0, pageSize);

export const getUnderRows = (rows?: PerformanceRankingReportDTO[], pageSize = 5) =>
  [...(rows || [])]
    .sort((left, right) => Number(left.currentScore || 0) - Number(right.currentScore || 0))
    .slice(0, pageSize);
