import { api } from "../../services/api";

export interface Section {
  categoryId?: number;
  categoryName?: string;
  id?: string;
  title?: string;
  description?: string;
  questions: FormField[];
  weightage?: number;
}

export interface FormField {
  questionId?: number;
  questionText?: string;
  id?: string;
  text?: string;
  type?: 'RATING' | 'TEXT' | 'NUMBER' | 'YESNO';
  questionType?: string;
  secondaryQuestionType?: string;
  required?: boolean;
  isRequired?: boolean;
  weightage?: number;
}

export type FeedbackRelationship = 'DIRECT_MANAGER' | 'PEER' | 'SUBORDINATE' | 'SELF';

export interface AppraisalForm {
  formId: number;
  formName: string;
  formType: string;
  cycleId?: number;
  cycleName?: string;
  targetRelationship?: FeedbackRelationship;
  id?: string;
  title?: string;
  description?: string;
  categories?: Section[];
  sections?: Section[];
  isAssigned?: boolean;
}

export interface AppraisalFormSet {
  id: number;
  name: string;
  cycleId: number;
  cycleName: string;
  selfAssessmentFormId: number;
  selfAssessmentFormName: string;
  managerEvaluationFormId: number;
  managerEvaluationFormName: string;
  isAssigned?: boolean;
}

export interface AppraisalCycle {
  cycleId: number;
  cycleName: string;
  startDate: string;
  endDate: string;
  evaluationPeriod: string;
  status: string;
  isActive: boolean;
  selfAssessmentDeadline?: string;
  managerEvaluationDeadline?: string;
  finalizationDeadline?: string;
  kpiWeight?: number;
  managerWeight?: number;
  selfWeight?: number;
  feedbackWeight?: number;
  financialYearId?: number;
  financialYearTitle?: string;
  isAssigned?: boolean;
}

export interface CycleRequest {
  cycleName: string;
  startDate: string;
  endDate: string;
  evaluationPeriod: string;
  status?: string;
  isActive?: boolean;
  kpiWeight?: number;
  managerWeight?: number;
  selfWeight?: number;
  feedbackWeight?: number;
  financialYearId?: number;
  selfAssessmentDeadline?: string;
  managerEvaluationDeadline?: string;
  finalizationDeadline?: string;
}

export interface ScoreBreakdownResponse {
  appraisalId: number;
  kpiRawScore: number;
  managerRawScore: number;
  selfRawScore: number;
  feedbackRawScore: number;
  kpiWeight: number;
  managerWeight: number;
  selfWeight: number;
  feedbackWeight: number;
  kpiWeightedScore: number;
  managerWeightedScore: number;
  selfWeightedScore: number;
  feedbackWeightedScore: number;
  finalTotalScore: number;
  finalGrade: string;
  performanceCategoryId?: number;
  performanceCategoryName?: string;
}

export interface AppraisalResponse {
  appraisalId: number;
  id?: number;
  employeeId?: number;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  managerId?: number;
  managerName?: string;
  cycleId?: number;
  cycleName?: string;
  formId?: number;
  formName?: string;
  formSetId?: number;
  formSetName?: string;
  status?: string;
  positionName?: string;
  assignedAt?: string;
  selfSubmittedAt?: string;
  managerSubmittedAt?: string;
  hrApprovedAt?: string;
  finalizedAt?: string;
  employeeSignedAt?: string;
  managerSignedAt?: string;
  lockedAt?: string;
  employeeSignComment?: string;
  managerSignComment?: string;
  employeeSignNote?: string;
  managerSignNote?: string;
  approvalComment?: string;
  isLocked?: boolean;
  finalScore?: number;
  finalGrade?: string;
}

// Phase 2 Workstream 2: HR Progress Dashboard & Behavioral Evaluation Types
export interface TechnicalProgressSummary {
  submitted: number;
  in_progress: number;
  not_started: number;
  unassigned_evaluators: number;
}

export interface BehavioralProgressSummary {
  submitted: number;
  in_progress: number;
  not_started: number;
  unassigned_evaluators: number;
}

export interface JapaneseProgressSummary {
  mode: 'MANDATORY' | 'OPTIONAL' | 'UNCONFIGURED';
  accepted: number;
  submitted_or_resubmitted: number;
  draft_or_pending: number;
  returned: number;
  not_started: number;
  no_evaluator_assigned: number;
  blocking_count: number;
}

export interface ProgressCohortSummary {
  total_participants: number;
  fully_ready_count: number;
  technical_summary: TechnicalProgressSummary;
  behavioral_summary: BehavioralProgressSummary;
  japanese_summary: JapaneseProgressSummary;
}

export interface ProgressParticipantItem {
  participant_id: string;
  employee_id: string;
  employee_code: string;
  full_name: string;
  department: string;
  employment_status: string;
  technical_evaluator_assigned: boolean;
  behavioral_evaluator_assigned: boolean;
  technical: {
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'UNCONFIGURED';
    total_competencies: number;
    scored_competencies: number;
    evaluator_id: string | null;
    evaluator_name: string | null;
    is_assigned: boolean;
    last_updated_at: string | null;
  };
  behavioral: {
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'UNCONFIGURED';
    total_competencies: number;
    scored_competencies: number;
    evaluator_id: string | null;
    evaluator_name: string | null;
    is_assigned: boolean;
    last_updated_at: string | null;
  };
  japanese: {
    mode: 'MANDATORY' | 'OPTIONAL' | 'UNCONFIGURED';
    status: string;
    status_display: string;
    is_blocking: boolean;
    overall_score: number | null;
    evaluator_name: string | null;
    batch_name: string | null;
    submitted_at: string | null;
  };
  operational_telemetry: {
    goals_count: number;
    completed_goals: number;
    avg_goal_progress: number;
    self_assessment_submitted: boolean;
  };
  publication_status: 'PUBLISHED' | 'BLOCKED' | 'READY_TO_PUBLISH' | 'DRAFT';
  is_ready_for_review: boolean;
  evaluation_incomplete: boolean;
  evaluation_incomplete_reasons: string[];
  has_configuration_blockers: boolean;
  configuration_blockers: string[];
  readiness_blockers: string[];
  scorecard?: {
    has_scores: boolean;
    technical_score: number | null;
    behavioral_score: number | null;
    final_score: number | null;
    is_complete: boolean;
  };
  appraisal?: {
    id: string | null;
    status: string;
    published_at: string | null;
  };
}

export interface HREvaluationProgressResponse {
  cycle_id: string;
  cycle_name: string;
  status: string;
  rating_scale_max: number;
  scoring_model: string;
  japanese_evaluation_mandatory: boolean | null;
  configuration_health: {
    is_valid: boolean;
    errors: string[];
    technical_competencies_count: number;
    technical_weight_total: number;
    behavioral_competencies_count: number;
    behavioral_weight_total: number;
    japanese_configured: boolean;
  };
  summary: ProgressCohortSummary;
  participants: ProgressParticipantItem[];
}

export interface BehavioralReviewDetail {
  id: string | null;
  score: number | null;
  hr_assessment: string;
  status: 'DRAFT' | 'SUBMITTED';
  updated_at: string | null;
}

export interface BehavioralCompetencyItem {
  competency_id: string;
  name: string;
  description: string;
  weight: number;
  benchmark_score: number;
  rubric_descriptors: Record<string, string>;
  review: BehavioralReviewDetail;
}

export interface BehavioralEvaluationSheetResponse {
  cycle_id: string;
  cycle_name: string;
  rating_scale_max: number;
  participant_id: string;
  employee_id: string;
  employee_code: string;
  full_name: string;
  department: string;
  competencies: BehavioralCompetencyItem[];
}

export interface SaveBehavioralReviewItem {
  competency_id: string;
  score: number | string | null;
  hr_assessment?: string;
}

export interface SaveBehavioralEvaluationPayload {
  participant_id: string;
  cycle_id?: string;
  status: 'DRAFT' | 'SUBMITTED';
  reviews: SaveBehavioralReviewItem[];
}

export interface SaveBehavioralEvaluationResponse {
  message: string;
  status: 'DRAFT' | 'SUBMITTED';
  saved_count: number;
  cycle_id: string;
  participant_id: string;
}

export interface PublishEvaluationPayload {
  strengths?: string[];
  areas_for_improvement?: string[];
  recommendations?: string;
  final_comments?: string;
}

export interface PublishEvaluationResponse {
  status: string;
  message: string;
  appraisal_id: string;
  overall_score: number;
  published_at: string;
  score_calculation: any;
}

export interface CompetencyScoreBreakdown {
  competency_id: string;
  competency_name: string;
  weight: number;
  raw_score: number | null;
  benchmark_score: number;
  normalized_percentage: number | null;
  status: string;
}

export interface EvaluationSummaryResponse {
  participant_id: string;
  employee_id: string;
  full_name: string;
  employee_code: string;
  cycle_id: string;
  cycle_name: string;
  score_calculation: {
    is_complete: boolean;
    verification_errors?: string[];
    rating_scale_max: number;
    final_score: number | null;
    cycle_weights: {
      technical_weight: number;
      behavioral_weight: number;
    };
    technical_section: {
      section_score: number | null;
      weight: number;
      weighted_contribution: number | null;
      total_competencies: number;
      scored_competencies: number;
      breakdown: CompetencyScoreBreakdown[];
    };
    behavioral_section: {
      section_score: number | null;
      weight: number;
      weighted_contribution: number | null;
      total_competencies: number;
      scored_competencies: number;
      breakdown: CompetencyScoreBreakdown[];
    };
    operational_telemetry?: {
      goals?: {
        total_goals: number;
        completed_goals: number;
        average_completion_percentage: number;
      };
      self_assessment?: {
        submitted: boolean;
        status: string;
      };
      japanese?: {
        mandatory: boolean;
        accepted: boolean;
        status: string;
      };
    };
  };
}

const transformResponse = (response: any) => response?.data ?? response;

export const appraisalApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Appraisal Cycles
    getCycles: builder.query<AppraisalCycle[], void>({
      query: () => '/appraisal-cycles',
      transformResponse,
      providesTags: ['Cycle'],
    }),
    createCycle: builder.mutation<AppraisalCycle, CycleRequest>({
      query: (body) => ({
        url: '/appraisal-cycles',
        method: 'POST',
        body,
      }),
      transformResponse,
      invalidatesTags: ['Cycle'],
    }),
    updateCycle: builder.mutation<AppraisalCycle, { id: string; body: CycleRequest }>({
      query: ({ id, body }) => ({
        url: `/appraisal-cycles/${id}`,
        method: 'PUT',
        body,
      }),
      transformResponse,
      invalidatesTags: ['Cycle'],
    }),

    getAppraisalForm: builder.query<AppraisalForm, string>({
      query: (id) => `/appraisal-forms/${id}`,
      transformResponse,
      providesTags: (_result, _error, id) => [{ type: 'Form', id }],
    }),

    // Appraisal Forms
    getAppraisalForms: builder.query<AppraisalForm[], void>({
      query: () => '/appraisal-forms',
      transformResponse,
      providesTags: (result) =>
        result
          ? [...result.map(({ formId }) => ({ type: 'Form' as const, id: formId })), { type: 'Form', id: 'LIST' }]
          : [{ type: 'Form', id: 'LIST' }],
    }),

    getAppraisalFormSets: builder.query<AppraisalFormSet[], number | void>({
      query: (cycleId) => cycleId ? `/appraisal-form-sets/cycle/${cycleId}` : '/appraisal-form-sets',
      transformResponse,
      providesTags: ['Form'],
    }),

    syncFormSets: builder.mutation<string, void>({
      query: () => ({
        url: '/appraisal-form-sets/sync',
        method: 'POST',
      }),
      invalidatesTags: ['Form'],
    }),

    createFormSet: builder.mutation<any, { name: string; cycleId: number }>({
      query: (body) => ({
        url: '/appraisal-form-sets',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Form'],
    }),
    updateFormSet: builder.mutation<any, { id: number; body: { name: string; cycleId: number } }>({
      query: ({ id, body }) => ({
        url: `/appraisal-form-sets/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Form'],
    }),
    deleteFormSet: builder.mutation<any, number>({
      query: (id) => ({
        url: `/appraisal-form-sets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Form'],
    }),

    createAppraisalForm: builder.mutation<number, any>({
      query: (body) => ({
        url: '/appraisal-forms',
        method: 'POST',
        body,
      }),
      transformResponse,
      invalidatesTags: [{ type: 'Form', id: 'LIST' }],
    }),
    updateAppraisalForm: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `/appraisal-forms/${id}`,
        method: 'PUT',
        body,
      }),
      transformResponse,
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Form', id }, { type: 'Form', id: 'LIST' }],
    }),
    deleteAppraisalForm: builder.mutation<any, number>({
      query: (id) => ({
        url: `/appraisal-forms/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Form' as const, id: 'LIST' }],
    }),

    getFeedbackFormsByCycle: builder.query<AppraisalForm[], number>({
      query: (cycleId) => `/appraisal-forms/feedback-forms?cycleId=${cycleId}`,
      transformResponse,
      providesTags: [{ type: 'Form' as const, id: 'LIST' }],
    }),

    // Categories
    getCategories: builder.query<any[], string>({
      query: (formId) => `/categories?formId=${formId}`,
      transformResponse,
      providesTags: ['Appraisal'],
    }),

    // Appraisals
    getAppraisals: builder.query<any[], void>({
      query: () => '/appraisals/my-assessments',
      transformResponse,
      providesTags: ['Appraisal'],
    }),
    getAppraisalsByCycle: builder.query<any[], number>({
      query: (cycleId) => `/appraisals/cycle/${cycleId}`,
      transformResponse,
      providesTags: ['Appraisal'],
    }),
    getTeamEvaluations: builder.query<any[], void>({
      query: () => '/appraisals/team-evaluations',
      transformResponse,
      providesTags: ['Appraisal'],
    }),

    getAppraisalByEmployeeAndCycle: builder.query<AppraisalResponse, { employeeId: number; cycleId: number }>({
      query: ({ employeeId, cycleId }) => `/appraisals/employee/${employeeId}/cycle/${cycleId}`,
      transformResponse,
      providesTags: ['Appraisal'],
    }),
    createAppraisal: builder.mutation<any, any>({
      query: (body) => ({
        url: '/appraisals',
        method: 'POST',
        body,
      }),
      transformResponse,
      invalidatesTags: ['Appraisal'],
    }),
    getEmployeeAssessment: builder.query<any, string>({
      query: (appraisalId) => `/appraisals/${appraisalId}`,
      transformResponse,
      providesTags: ['Appraisal'],
    }),
    submitAppraisalSelf: builder.mutation<any, { id: string; comment?: string }>({
      query: ({ id, comment }) => ({
        url: `/appraisals/${id}/employee-sign-off`,
        method: 'POST',
        params: { comment },
      }),
      invalidatesTags: ['Appraisal'],
    }),
    submitAppraisalManager: builder.mutation<any, { id: string; comment?: string }>({
      query: ({ id, comment }) => ({
        url: `/appraisals/${id}/manager-sign-off`,
        method: 'POST',
        params: { comment },
      }),
      invalidatesTags: ['Appraisal'],
    }),

    // Self Assessments
    getSelfAssessmentForm: builder.query<any, string>({
      query: (appraisalId) => `/self-assessments/form/${appraisalId}`,
      transformResponse,
      providesTags: ['Appraisal'],
    }),
    saveSelfAssessmentAnswers: builder.mutation<any, { id: string; answers: any[] }>({
      query: ({ id, answers }) => ({
        url: `/self-assessments/${id}/answers`,
        method: 'POST',
        body: answers,
      }),
      invalidatesTags: ['Appraisal'],
    }),
    submitSelfAssessment: builder.mutation<any, string>({
      query: (id) => ({
        url: `/self-assessments/${id}/submit`,
        method: 'POST',
      }),
      invalidatesTags: ['Appraisal'],
    }),

    // Manager Evaluations
    getManagerEvaluationForm: builder.query<any, string>({
      query: (appraisalId) => `/manager-evaluations/form/${appraisalId}`,
      transformResponse,
      providesTags: ['Appraisal'],
    }),
    saveManagerEvaluationAnswers: builder.mutation<any, { id: string; answers: any[] }>({
      query: ({ id, answers }) => ({
        url: `/manager-evaluations/${id}/answers`,
        method: 'POST',
        body: answers,
      }),
      invalidatesTags: ['Appraisal', 'Manager', 'Profile', 'Employee', 'Score', 'FinalScore', 'Cycle'],
    }),
    submitManagerEvaluation: builder.mutation<any, string | { id: string; publish?: boolean }>({
      query: (arg) => {
        const id = typeof arg === 'string' ? arg : arg.id;
        const publish = typeof arg === 'object' && arg.publish !== undefined ? arg.publish : true;
        return {
          url: `/manager-evaluations/${id}/submit`,
          method: 'POST',
          body: { publish },
        };
      },
      invalidatesTags: ['Appraisal', 'Manager', 'Profile', 'Employee', 'Score', 'FinalScore', 'Cycle'],
    }),
    publishAppraisal: builder.mutation<any, { appraisalId: string; publish?: boolean; score?: number; classification?: string }>({
      query: ({ appraisalId, ...body }) => ({
        url: `/appraisals/${appraisalId}/publish`,
        method: 'POST',
        body: { publish: true, ...body },
      }),
      invalidatesTags: ['Appraisal', 'Manager', 'Profile', 'Employee', 'Score', 'FinalScore', 'Cycle'],
    }),

    saveDraft: builder.mutation<any, { selfAssessmentId: string; overallReflection: string }>({
      query: ({ selfAssessmentId, overallReflection }) => ({
        url: `/self-assessments/${selfAssessmentId}/draft`,
        method: 'POST',
        params: { overallReflection },
      }),
      invalidatesTags: ['Appraisal'],
    }),

    saveManagerDraft: builder.mutation<any, { evaluationId: string; finalComment: string }>({
      query: ({ evaluationId, finalComment }) => ({
        url: `/manager-evaluations/${evaluationId}/draft`,
        method: 'POST',
        params: { finalComment },
      }),
      invalidatesTags: ['Appraisal', 'Manager', 'Profile', 'Employee', 'Score', 'FinalScore', 'Cycle'],
    }),

    getDiagnosticHealth: builder.query<any, void>({
      query: () => '/public-diagnostics/health',
      transformResponse,
    }),

    addCategory: builder.mutation<number, { formId: number; categoryName: string }>({
      query: ({ formId, categoryName }) => ({
        url: `/appraisal-forms/${formId}/categories`,
        method: 'POST',
        body: { categoryName },
      }),
      transformResponse,
      invalidatesTags: (_result, _error, { formId }) => [{ type: 'Form', id: formId }],
    }),

    addQuestion: builder.mutation<number, { categoryId: number; questionText: string; questionType: string; secondaryQuestionType?: string | null; isRequired: boolean }>({
      query: ({ categoryId, ...body }) => ({
        url: `/appraisal-forms/categories/${categoryId}/questions`,
        method: 'POST',
        body: { ...body, categoryId },
      }),
      transformResponse,
      invalidatesTags: ['Form'], // Invalidate all forms since we don't have formId here
    }),

    assignBulk: builder.mutation<any, { cycleId: number; employeeIds: number[]; departmentIds?: number[]; formId?: number; formSetId?: number }>({
      query: (body) => ({
        url: '/appraisals/assign/bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Appraisal'],
    }),

    getActiveCycle: builder.query<AppraisalCycle, void>({
      query: () => '/appraisal-cycles/active',
      transformResponse,
      providesTags: ['Cycle'],
    }),

    activateCycle: builder.mutation<AppraisalCycle, number>({
      query: (id) => ({
        url: `/appraisal-cycles/${id}/activate`,
        method: 'PUT',
      }),
      transformResponse,
      // Invalidate GoalSet so all cached goal queries flush immediately when a new cycle is activated
      invalidatesTags: ['Cycle', 'GoalSet'],
    }),

    closeCycle: builder.mutation<AppraisalCycle, number>({
      query: (id) => ({
        url: `/appraisal-cycles/${id}/close`,
        method: 'PUT',
      }),
      transformResponse,
      // Invalidate GoalSet so stale goal data from the closed cycle is evicted from cache
      invalidatesTags: ['Cycle', 'GoalSet', 'AuditTrail'],
    }),

    deleteCycle: builder.mutation<any, number>({
      query: (id) => ({
        url: `/appraisal-cycles/${id}`,
        method: 'DELETE',
      }),
      // Invalidate GoalSet so any goal-set queries tied to the deleted cycle are flushed
      invalidatesTags: ['Cycle', 'GoalSet'],
    }),

    sendCycleReminders: builder.mutation<void, number>({
      query: (id) => ({
        url: `/appraisal-cycles/${id}/reminders`,
        method: 'POST',
      }),
    }),

    uploadEmployeeSignature: builder.mutation<void, { id: string, file: File }>({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/appraisals/${id}/employee-signature`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Appraisal']
    }),

    uploadManagerSignature: builder.mutation<void, { id: string, file: File }>({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/appraisals/${id}/manager-signature`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Appraisal']
    }),
    calculateScore: builder.mutation<any, string>({
      query: (id) => ({
        url: `/appraisals/${id}/calculate`,
        method: 'POST',
      }),
      invalidatesTags: ['Appraisal'],
    }),
    approveAppraisal: builder.mutation<any, { id: string; comment?: string }>({
      query: ({ id, comment }) => ({
        url: `/appraisals/${id}/approve`,
        method: 'POST',
        params: { comment },
      }),
      invalidatesTags: ['Appraisal'],
    }),
    finalizeAppraisal: builder.mutation<any, string>({
      query: (id) => ({
        url: `/appraisals/${id}/finalize`,
        method: 'POST',
      }),
      invalidatesTags: ['Appraisal'],
    }),
    getScoreBreakdown: builder.query<ScoreBreakdownResponse, string>({
      query: (id) => `/appraisals/${id}/score-breakdown`,
      transformResponse,
      providesTags: ['Appraisal'],
    }),

    // Phase 2 Workstream 2: HR Progress Dashboard & Behavioral Evaluation
    getHREvaluationProgress: builder.query<HREvaluationProgressResponse, { cycle_id: string }>({
      query: ({ cycle_id }) => ({
        url: `performance/cycles/${cycle_id}/evaluation-progress/`,
      }),
      transformResponse,
      providesTags: (_res, _err, arg) => [
        { type: 'Cycle', id: arg.cycle_id },
        { type: 'Appraisal', id: 'PROGRESS' },
      ],
    }),

    getHRBehavioralEvaluationSheet: builder.query<
      BehavioralEvaluationSheetResponse,
      { participant_id?: string; employee_id?: string; cycle_id?: string }
    >({
      query: (params) => ({
        url: 'performance/evaluations/behavioral/',
        params,
      }),
      transformResponse,
      providesTags: (_res, _err, arg) => [
        { type: 'Appraisal', id: arg.participant_id || arg.employee_id || 'BEHAV_SHEET' },
      ],
    }),

    saveHRBehavioralEvaluation: builder.mutation<
      SaveBehavioralEvaluationResponse,
      SaveBehavioralEvaluationPayload
    >({
      query: (body) => ({
        url: 'performance/evaluations/behavioral/',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Appraisal', id: arg.participant_id },
        { type: 'Appraisal', id: 'PROGRESS' },
        { type: 'Cycle', id: arg.cycle_id || 'ACTIVE' },
      ],
    }),

    // Phase 2 Workstream 3: Final Scoring, Calibration & Publication
    getEvaluationSummary: builder.query<
      EvaluationSummaryResponse,
      { cycleId?: string; participantId?: string; employeeId?: string }
    >({
      query: ({ cycleId, participantId, employeeId }) => ({
        url: 'performance/evaluations/summary/',
        params: {
          cycle_id: cycleId,
          participant_id: participantId,
          employee_id: employeeId,
        },
      }),
      transformResponse,
      providesTags: (_res, _err, arg) => [
        { type: 'Appraisal', id: arg.participantId || arg.employeeId || 'SUMMARY' },
      ],
    }),

    publishParticipantEvaluation: builder.mutation<
      PublishEvaluationResponse,
      { cycleId: string; participantId: string; data?: PublishEvaluationPayload }
    >({
      query: ({ cycleId, participantId, data }) => ({
        url: `performance/cycles/${cycleId}/participants/${participantId}/publish/`,
        method: 'POST',
        body: data || {},
      }),
      transformResponse,
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Appraisal', id: 'PROGRESS' },
        { type: 'Cycle', id: arg.cycleId },
        { type: 'Appraisal', id: arg.participantId },
        'Score',
        'FinalScore',
      ],
    }),
  }),
});

export const {
  useGetCyclesQuery,
  useGetActiveCycleQuery,
  useCreateCycleMutation,
  useUpdateCycleMutation,
  useActivateCycleMutation,
  useCloseCycleMutation,
  useDeleteCycleMutation,
  useSendCycleRemindersMutation,
  useGetAppraisalFormQuery,
  useLazyGetAppraisalFormQuery,
  useGetAppraisalFormsQuery,
  useGetAppraisalFormSetsQuery,
  useSyncFormSetsMutation,
  useCreateFormSetMutation,
  useUpdateFormSetMutation,
  useDeleteFormSetMutation,
  useCreateAppraisalFormMutation,
  useUpdateAppraisalFormMutation,
  useGetCategoriesQuery,
  useGetAppraisalsQuery,
  useGetTeamEvaluationsQuery,
  useGetAppraisalsByCycleQuery,
  useGetAppraisalByEmployeeAndCycleQuery,
  useCreateAppraisalMutation,
  useGetEmployeeAssessmentQuery,
  useSubmitAppraisalSelfMutation,
  useSubmitAppraisalManagerMutation,
  useGetSelfAssessmentFormQuery,
  useSaveSelfAssessmentAnswersMutation,
  useSubmitSelfAssessmentMutation,
  useGetManagerEvaluationFormQuery,
  useSaveManagerEvaluationAnswersMutation,
  useSubmitManagerEvaluationMutation,
  usePublishAppraisalMutation,
  useSaveDraftMutation,
  useSaveManagerDraftMutation,
  useLazyGetEmployeeAssessmentQuery,
  useGetDiagnosticHealthQuery,
  useAddCategoryMutation,
  useAddQuestionMutation,
  useDeleteAppraisalFormMutation,
  useAssignBulkMutation,
  useUploadEmployeeSignatureMutation,
  useUploadManagerSignatureMutation,
  useCalculateScoreMutation,
  useApproveAppraisalMutation,
  useFinalizeAppraisalMutation,
  useGetScoreBreakdownQuery,
  useGetFeedbackFormsByCycleQuery,
  useGetHREvaluationProgressQuery,
  useGetHRBehavioralEvaluationSheetQuery,
  useSaveHRBehavioralEvaluationMutation,
  useGetEvaluationSummaryQuery,
  usePublishParticipantEvaluationMutation,
} = appraisalApi;
