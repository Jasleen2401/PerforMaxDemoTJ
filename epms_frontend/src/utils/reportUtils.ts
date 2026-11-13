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

export const calculateCompletionRate = (completed?: number, total?: number): number | null => {
  if (total == null || total <= 0) return null;
  return Math.round(((completed || 0) / total) * 100);
};

export const formatScore = (score?: number | string | null, digits = 1): string => {
  if (score == null || score === '' || isNaN(Number(score))) return 'N/A';
  return Number(score).toFixed(digits);
};

export const formatPercent = (value?: number | string | null, digits = 0): string => {
  if (value == null || value === '' || isNaN(Number(value))) return 'N/A';
  return `${Number(value).toFixed(digits)}%`;
};

export const transformPieData = (data?: AppraisalStatusReportDTO): PieDatum[] => {
  if (!data) return [];
  const list: PieDatum[] = [];
  if (data.completed != null && data.completed > 0) list.push({ name: 'Completed', value: data.completed });
  if (data.inProgress != null && data.inProgress > 0) list.push({ name: 'In Progress', value: data.inProgress });
  if (data.pending != null && data.pending > 0) list.push({ name: 'Pending', value: data.pending });
  return list;
};

export const transformGoalData = (data?: GoalCompletionReportDTO): GoalDatum[] => {
  if (!data || (!data.total && !data.completed && !data.inProgress && !data.notStarted && !data.offTrack)) return [];
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

export const MOCK_EMPLOYEE_NAMES = new Set([
  'arjun patel',
  'sneha gupta',
  'vikram malhotra',
  'priya sharma',
  'neha kulkarni',
  'rohan verma',
  'karan mehra',
  'siddharth jain',
  'aman joshi',
]);

export const isMockEmployee = (name?: string): boolean => {
  if (!name) return false;
  return MOCK_EMPLOYEE_NAMES.has(name.trim().toLowerCase());
};

export const isMockDistribution = (mean?: number | null, sampleSize?: number | null): boolean => {
  if (mean === 83.6 && sampleSize === 24) return true;
  return false;
};

export const isMockTrend = (points?: Array<{ period?: string }>): boolean => {
  if (!points || points.length === 0) return false;
  return points.some((p) => p.period && p.period.includes('2026'));
};

export const isMockDepartmentList = (depts?: Array<{ departmentName?: string; avgScore?: number }>): boolean => {
  if (!depts || depts.length === 0) return false;
  const hasFakeDept = depts.some((d) => d.departmentName === 'Operations' || d.departmentName === 'Marketing & Sales');
  const hasStaticScore = depts.some((d) => d.departmentName === 'Engineering' && d.avgScore === 89.2);
  return hasFakeDept && hasStaticScore;
};

export const getTopRows = (rows?: PerformanceRankingReportDTO[], pageSize = 5) => {
  if (!rows || rows.length === 0) return [];
  const realRows = rows.filter((r) => !isMockEmployee(r.employeeName));
  return [...realRows]
    .sort((a, b) => Number(b.currentScore || 0) - Number(a.currentScore || 0))
    .slice(0, pageSize);
};

export const getUnderRows = (rows?: PerformanceRankingReportDTO[], pageSize = 5) => {
  if (!rows || rows.length === 0) return [];
  const realRows = rows.filter((r) => !isMockEmployee(r.employeeName));
  // Filter for actual underperformers: scores below 75 or marked as not high performers
  const underCandidates = realRows.filter(r => {
    const score = Number(r.currentScore || 0);
    return (r.isHighPerformer === false || !r.isHighPerformer) && score < 75;
  });
  if (underCandidates.length === 0) return [];
  return [...underCandidates]
    .sort((a, b) => Number(a.currentScore || 0) - Number(b.currentScore || 0))
    .slice(0, pageSize);
};
