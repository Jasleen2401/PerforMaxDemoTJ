export type AppraisalStatus =
  | 'ASSIGNED'
  | 'PENDING_ASSESSMENT'
  | 'PENDING_EVALUATION'
  | 'PENDING_SIGN_OFF'
  | 'COMPLETED'
  | 'ARCHIVED';

export interface AssessmentResponse {
  questionId: string;
  rating?: number;
  comment?: string;
  score?: number;
}

export interface SelfAssessment {
  responses: AssessmentResponse[];
  submittedAt?: string;
  isSubmitted: boolean;
}

export interface ManagerEvaluation {
  responses: AssessmentResponse[];
  submittedAt?: string;
  isSubmitted: boolean;
  overallComments?: string;
}

export interface SignOff {
  employeeSigned: boolean;
  employeeSignedAt?: string;
  managerSigned: boolean;
  managerSignedAt?: string;
}

export interface Appraisal {
  id: string;
  employeeId: string;
  cycleId: string;
  formId: string;
  status: AppraisalStatus;
  selfAssessment: SelfAssessment;
  managerEvaluation: ManagerEvaluation;
  signOff: SignOff;
  finalScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAssessmentPayload {
  responses: AssessmentResponse[];
}

export type PerformanceGrade =
  | 'OUTSTANDING'
  | 'EXCEEDS_EXPECTATIONS'
  | 'MEETS_EXPECTATIONS'
  | 'NEEDS_IMPROVEMENT'
  | 'UNSATISFACTORY';

export interface PerformanceCategory {
  id?: number;
  name: string;
  minScore: number;
  maxScore: number;
  ratingValue: number;
  grade: PerformanceGrade;
  description: string;
}
