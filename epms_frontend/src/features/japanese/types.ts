// src/features/japanese/types.ts

export type EvaluationStatus = 'PENDING' | 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'RESUBMITTED' | 'ACCEPTED';
export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export type MaterialType = 'READING' | 'LISTENING' | 'VOCABULARY' | 'GRAMMAR' | 'EXERCISE' | 'VIDEO' | 'OTHER';
export type PracticeStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVIEWED';
export type EligibilityStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'MEETS_REQUIREMENT' | 'PENDING_VERIFICATION' | 'EXEMPT';

export interface JapaneseEvalRating {
  id?: string;
  criterion: string;
  criterion_name?: string;
  criterion_weight?: number | string;
  score: number | string;
  comments: string;
}

export interface JapaneseEvalCriterion {
  id: string;
  cycle: string;
  cycle_name?: string;
  name: string;
  description: string;
  weight: number | string;
  order: number;
}

export interface JapaneseEvaluation {
  id: string;
  intern: string;
  intern_name?: string;
  intern_code?: string;
  intern_email?: string;
  cycle: string;
  cycle_name?: string;
  evaluator?: string;
  evaluator_username?: string;
  status: EvaluationStatus;
  status_display?: string;
  overall_language_score?: number | string | null;
  strengths: string;
  areas_for_improvement: string;
  instructor_remarks: string;
  developmental_feedback: string;
  is_developmental_feedback_visible: boolean;
  jlpt_status_summary: string;
  submitted_at?: string | null;
  return_reason?: string;
  returned_at?: string | null;
  returned_by?: string | null;
  ratings?: JapaneseEvalRating[];
  created_at?: string;
  updated_at?: string;
}

export interface JapaneseMaterial {
  id: string;
  topic: string;
  title: string;
  material_type: MaterialType;
  external_url?: string;
  file?: string | null;
  estimated_minutes?: number;
  order: number;
}

export interface JapaneseTopic {
  id: string;
  plan: string;
  title: string;
  order: number;
  materials?: JapaneseMaterial[];
}

export interface JapaneseLearningPlan {
  id: string;
  intern: string;
  intern_name?: string;
  intern_code?: string;
  cycle: string;
  cycle_name?: string;
  instructor?: string;
  instructor_name?: string;
  title: string;
  description: string;
  target_jlpt_level: JLPTLevel;
  target_date?: string | null;
  is_active: boolean;
  topics?: JapaneseTopic[];
  created_at?: string;
}

export interface JapanesePracticeResult {
  id: string;
  intern: string;
  intern_name?: string;
  intern_code?: string;
  topic: string;
  topic_title?: string;
  material?: string | null;
  material_title?: string;
  status: PracticeStatus;
  score?: number | string | null;
  max_score: number | string;
  notes?: string;
  file_evidence?: string | null;
  external_url?: string;
  instructor_remarks?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  submitted_at?: string | null;
  created_at?: string;
}

export interface JLPTAttempt {
  id: string;
  intern: string;
  intern_id?: string;
  intern_name?: string;
  intern_code?: string;
  intern_email?: string;
  batch_name?: string;
  batch_code?: string;
  sub_batch_name?: string;
  sub_batch_code?: string;
  target_level?: JLPTLevel;
  level: JLPTLevel;
  exam_date: string;
  score?: number | null;
  passed?: boolean | null;
  certificate_file?: string | null;
  verified: boolean;
  verified_by?: string | null;
  verified_by_username?: string;
  verified_at?: string | null;
  notes?: string;
  created_at?: string;
}

export interface JLPTEligibilityRecord {
  id: string;
  intern: string;
  intern_id?: string;
  intern_name?: string;
  intern_code?: string;
  intern_email?: string;
  cycle: string;
  cycle_name?: string;
  required_level: JLPTLevel;
  eligibility_status: EligibilityStatus;
  eligibility_status_display?: string;
  notes?: string;
  linked_attempt?: string | null;
  batch_name?: string;
  batch_code?: string;
  sub_batch_name?: string;
  sub_batch_code?: string;
  current_level?: JLPTLevel | null;
  all_attempts?: Array<{
    id: string;
    level: JLPTLevel;
    exam_date: string;
    passed: boolean | null;
    score: number | null;
    verified: boolean;
    verified_by?: string | null;
    notes?: string;
  }>;
  updated_at?: string;
}

export interface JapaneseAssignedIntern {
  id: string;
  userId: string;
  fullName: string;
  employeeCode: string;
  email: string;
  department: string;
  managerName: string;
  designation: string;
  batchName?: string;
  batchCode?: string;
  subBatchName?: string;
  subBatchCode?: string;
  plan?: {
    id: string;
    title: string;
    targetLevel: JLPTLevel;
    targetDate: string | null;
    topicsCount: number;
  } | null;
  progress: {
    percentage: number;
    completed: number;
    total: number;
  };
  evaluation?: {
    id: string;
    status: EvaluationStatus;
    statusDisplay: string;
    overallScore: number | null;
    returnReason: string;
  } | null;
  jlpt: {
    requiredLevel: JLPTLevel;
    eligibilityStatus: EligibilityStatus;
    eligibilityStatusDisplay: string;
    attemptsCount: number;
    lastAttemptPassed: boolean | null;
  };
}

export interface JapaneseDashboardData {
  overview: {
    assignedBatches?: number;
    totalInterns: number;
    pendingEvaluations?: number;
    activePlans: number;
    totalExercises: number;
    submittedExercises: number;
    reviewedExercises: number;
    avgProgress: number;
  };
  evaluations_summary: {
    total: number;
    pending: number;
    draft: number;
    submitted: number;
    returned: number;
    accepted: number;
  };
  returned_evaluations: Array<{
    id: string;
    internId: string;
    internName: string;
    internCode: string;
    cycleName: string;
    status: EvaluationStatus;
    returnReason: string;
    returnedAt: string | null;
  }>;
  jlpt_summary: {
    meetsRequirement: number;
    pendingVerification: number;
    inProgress: number;
    notStarted: number;
    unverifiedAttempts: number;
  };
  pending_actions: Array<{
    type: 'RETURNED_EVALUATION' | 'PRACTICE_REVIEW' | 'JLPT_VERIFICATION';
    title: string;
    description: string;
    link: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    date: string | null;
  }>;
  upcoming_deadlines: Array<{
    id: string;
    title: string;
    internName: string;
    targetLevel: JLPTLevel;
    targetDate: string;
  }>;
  batches?: Array<{
    id: string;
    name: string;
    cohort: string;
    internsCount: number;
    creatorName: string;
    creatorRole: string;
    createdAt: string;
  }>;
  activeCycle: {
    id: string | null;
    name: string;
  };
}

export interface JapaneseBatchCreator {
  id: string | null;
  name: string;
  role: 'HR' | 'SUPER_ADMIN' | string;
  role_display: string;
  email: string;
}

export interface JapaneseSubBatch {
  id: string;
  name: string;
  code: string;
  cohort: string;
  status: string;
  interns_count: number;
  assigned_interns: JapaneseAssignedIntern[];
}

export interface JapaneseBatch {
  id: string;
  name: string;
  code: string;
  cohort: string;
  status: string;
  description: string;
  created_by?: string | null;
  creator: JapaneseBatchCreator;
  sub_batches_count: number;
  sub_batches: JapaneseSubBatch[];
  interns_count: number;
  instructors_list: Array<{
    id: string;
    username: string;
    fullName: string;
    email: string;
  }>;
  assigned_interns: JapaneseAssignedIntern[];
  created_at: string;
  updated_at: string;
}


// Request Payload Types
export interface CreateLearningPlanPayload {
  intern: string;
  cycle: string;
  title: string;
  description?: string;
  target_jlpt_level: JLPTLevel;
  target_date?: string;
  is_active?: boolean;
}

export interface CreateTopicPayload {
  plan: string;
  title: string;
  order?: number;
}

export interface CreateMaterialPayload {
  topic: string;
  title: string;
  material_type: MaterialType;
  external_url?: string;
  estimated_minutes?: number;
  order?: number;
}

export interface ReviewPracticePayload {
  score?: number;
  instructor_remarks: string;
}

export interface SaveEvaluationPayload {
  intern: string;
  cycle: string;
  status: EvaluationStatus;
  strengths?: string;
  areas_for_improvement?: string;
  instructor_remarks?: string;
  developmental_feedback?: string;
  is_developmental_feedback_visible?: boolean;
  jlpt_status_summary?: string;
  ratings_data?: Array<{
    criterion: string;
    score: number;
    comments?: string;
  }>;
}

export interface VerifyJLPTPayload {
  status?: 'VERIFIED' | 'REJECTED';
  verified?: boolean;
  passed?: boolean;
  score?: number;
  notes?: string;
}

export interface RecordJLPTPayload {
  intern: string;
  level: JLPTLevel;
  exam_date: string;
  score?: number;
  passed?: boolean;
  notes?: string;
}
