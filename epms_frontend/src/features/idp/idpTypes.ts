export const IdpStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type IdpStatus = (typeof IdpStatus)[keyof typeof IdpStatus];

export const DevelopmentGoalStatus = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;
export type DevelopmentGoalStatus = (typeof DevelopmentGoalStatus)[keyof typeof DevelopmentGoalStatus];

export const DevelopmentGoalCategory = {
  TECHNICAL_SKILL: "TECHNICAL_SKILL",
  SOFT_SKILL: "SOFT_SKILL",
  LEADERSHIP: "LEADERSHIP",
  COMMUNICATION: "COMMUNICATION",
  PRODUCTIVITY: "PRODUCTIVITY",
  CAREER_GROWTH: "CAREER_GROWTH",
  OTHER: "OTHER",
} as const;
export type DevelopmentGoalCategory = (typeof DevelopmentGoalCategory)[keyof typeof DevelopmentGoalCategory];

export interface IdpResponse {
  idpId: number;
  employeeId: number;
  employeeName: string;
  managerId: number;
  managerName: string;
  appraisalId?: number | null;
  title: string;
  summary?: string;
  startDate: string;
  endDate: string;
  scheduledFollowUpDates?: string[];
  status: IdpStatus;
  overallProgress: number;
  goalCount: number;
  completedGoalCount: number;
  createdBy?: number;
}

export interface IdpCreateRequest {
  employeeId: number | string;
  managerId?: number | string;
  appraisalId?: number;
  title: string;
  summary?: string;
  startDate: string;
  endDate: string;
  scheduledFollowUpDates?: string[];
}

export interface IdpUpdateRequest {
  managerId?: number;
  title?: string;
  summary?: string;
  endDate?: string;
  scheduledFollowUpDates?: string[];
}

export interface DevelopmentGoalResponse {
  goalId: number;
  idpId: number;
  title: string;
  description?: string;
  category: DevelopmentGoalCategory;
  successCriteria?: string;
  targetDate: string;
  status: DevelopmentGoalStatus;
  progressPercent: number;
  managerComment?: string;
  employeeComment?: string;
}

export interface DevelopmentGoalRequest {
  idpId: number;
  title: string;
  description?: string;
  category: DevelopmentGoalCategory;
  successCriteria?: string;
  targetDate: string;
}

export interface DevelopmentGoalUpdateRequest {
  title?: string;
  description?: string;
  category?: DevelopmentGoalCategory;
  successCriteria?: string;
  targetDate?: string;
  status?: DevelopmentGoalStatus;
  managerComment?: string;
  employeeComment?: string;
}

export interface DevelopmentProgressResponse {
  updateId: number;
  goalId: number;
  progressNote: string;
  progressPercent: number;
  updatedBy: number;
  updatedByName: string;
  createdAt: string;
}

export interface DevelopmentProgressRequest {
  goalId: number;
  progressNote: string;
  progressPercent: number;
}
