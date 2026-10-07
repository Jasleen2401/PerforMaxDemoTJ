export const PipStatus = {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    IN_PROGRESS: 'IN_PROGRESS',
    EXTENDED: 'EXTENDED',
    COMPLETED: 'COMPLETED',
    CLOSED: 'CLOSED',
} as const;
export type PipStatus = (typeof PipStatus)[keyof typeof PipStatus];

export const PipOutcome = {
    PASS: 'PASS',
    EXTEND: 'EXTEND',
    FAIL: 'FAIL',
} as const;
export type PipOutcome = (typeof PipOutcome)[keyof typeof PipOutcome];

export const PipSeverity = {
    STANDARD: 'STANDARD',
    URGENT: 'URGENT',
    CRITICAL: 'CRITICAL',
} as const;
export type PipSeverity = (typeof PipSeverity)[keyof typeof PipSeverity];

export const ObjectiveStatus = {
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
} as const;
export type ObjectiveStatus = (typeof ObjectiveStatus)[keyof typeof ObjectiveStatus];

export interface PipResponse {
    pipId: number;
    employeeId: number;
    managerId: number;
    startDate: string;
    endDate: string;
    status: PipStatus;
    finalOutcome: PipOutcome | null;
    severity?: PipSeverity;
    reason: string;
    managerPrivateNote?: string;
    employeePrivateNote?: string;
    scheduledReviewDates?: string[];
    overallProgress?: number;
}

export interface PipCreateRequest {
    employeeId: number;
    managerId?: number; // Optional — auto-resolved from ReportingLine by backend
    startDate: string;
    endDate: string;
    severity: PipSeverity;
    reason: string;
    scheduledReviewDates?: string[];
}

export interface PipExtendRequest {
    newEndDate: string;
    scheduledReviewDates?: string[];
}

export interface PipObjectiveResponse {
    objectiveId: number;
    pipId: number;
    title: string;
    description: string;
    successCriteria: string;
    targetDate: string;
    status: ObjectiveStatus;
    isAchieved: boolean;
    currentProgress?: number;
}

export interface PipObjectiveRequest {
    pipId: number;
    title: string;
    description: string;
    successCriteria: string;
    targetDate: string;
}

export interface PipProgressResponse {
    logId: number;
    objectiveId: number;
    progressNote: string;
    progressPercent: number;
    updatedBy: number;
}

export interface PipProgressRequest {
    objectiveId: number;
    progressNote: string;
    progressPercent: number;
}

export interface PipReviewResponse {
    reviewId: number;
    pipId: number;
    reviewDate: string;
    progressSummary: string;
    managerFeedback: string;
    nextAction: string;
    createdBy: number;
}

export interface PipReviewRequest {
    pipId: number;
    reviewDate: string;
    progressSummary: string;
    managerFeedback: string;
    nextAction: string;
}

export interface PipUpdateRequest {
    managerId?: number;
    reason?: string;
    managerPrivateNote?: string;
    employeePrivateNote?: string;
}

export interface PipObjectiveUpdateRequest {
    title?: string;
    description?: string;
    successCriteria?: string;
}

export interface PipFinalizeRequest {
    outcome: PipOutcome;
    comment: string;
}
