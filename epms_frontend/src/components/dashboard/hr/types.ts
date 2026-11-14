// ----------------------------------------------------
// HR DASHBOARD SHARED DATA TYPES
// ----------------------------------------------------

export interface Intern {
  id: string;
  name: string;
  email: string;
  code?: string;
  cohort: string;
  batch: string;
  subBatch: string;
  section: string;
  subSection: string;
  mentor: string;
  evaluator: string;
  score: number | null;
  classification: 'Achieved' | 'Progressing' | 'Focus Required' | null;
  status: 'ACTIVE' | 'DEACTIVATED';
  published: boolean;
  joiningDate: string;
}

export interface Mentor {
  id: string;
  name: string;
  email: string;
  department: string;
  specialization: string;
  menteeCount: number;
  maxCapacity: number;
}

export interface Cohort {
  id: string;
  name: string;
  period: string;
  cycleName: string;
  count: number;
}

export interface EvaluationCycle {
  id: string;
  name: string;
  quarter: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'PUBLISHED' | 'DRAFT';
}

export interface Goal {
  id: string;
  internName: string;
  title: string;
  category: string;
  section: string;
  dueDate: string;
  progress: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface Evidence {
  id: string;
  internName: string;
  title: string;
  goalTitle: string;
  link: string;
  fileAttachment?: string | null;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'NEEDS_CHANGES';
  note?: string;
  createdAt?: string;
}

export interface HrInternTask {
  id: string;
  title: string;
  description?: string;
  internName: string;
  internEmail?: string;
  goalTitle?: string | null;
  dueDate: string;
  priority: string;
  status: string;
  isSelfCreated?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HrDashboardTelemetry {
  totalEmployeesUnderReview?: number;
  appraisalCompletionRate?: number;
  pendingSelfAssessments?: number;
  pendingManagerReviews?: number;
  openPips?: number;
  promotionCandidates?: number;
  departmentPerformance?: Array<{
    departmentName: string;
    averageScore: number;
    employeeCount: number;
  }>;
  topPerformers?: Array<{
    employeeName: string;
    department: string;
    score: number;
  }>;
  alerts?: Array<{
    title: string;
    message: string;
    type: string;
    timestamp: string;
  }>;
  currentCyclePhase?: string;
  cyclePhaseProgress?: number;
  daysUntilCycleEnd?: number;
}

export interface AppraisalProgressDataPoint {
  period: string;
  evaluatedCount: number;
  totalEligible: number;
  completionRate: number;
  publishedCount: number;
  publishedRate: number;
}

export type SectionFetchStatus = 'idle' | 'loading' | 'success' | 'error' | 'unavailable';

export interface SectionStatusMap {
  employees: SectionFetchStatus;
  appraisals: SectionFetchStatus;
  cycles: SectionFetchStatus;
  goals: SectionFetchStatus;
  evidence: SectionFetchStatus;
  tasks: SectionFetchStatus;
  telemetry: SectionFetchStatus;
}

export interface SectionErrorMap {
  employees?: string | null;
  appraisals?: string | null;
  cycles?: string | null;
  goals?: string | null;
  evidence?: string | null;
  tasks?: string | null;
  telemetry?: string | null;
}
