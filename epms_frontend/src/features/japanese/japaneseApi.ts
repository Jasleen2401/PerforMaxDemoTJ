// src/features/japanese/japaneseApi.ts
import { api } from "../../services/api";
import type {
  JapaneseDashboardData,
  JapaneseAssignedIntern,
  JapaneseBatch,
  JapaneseLearningPlan,
  JapaneseTopic,
  JapaneseMaterial,
  JapanesePracticeResult,
  JLPTAttempt,
  JLPTEligibilityRecord,
  JapaneseEvaluation,
  JapaneseEvalCriterion,
  JapaneseFeedback,
  JapaneseFeedbackComment,
  CreateLearningPlanPayload,
  CreateTopicPayload,
  CreateMaterialPayload,
  ReviewPracticePayload,
  SaveEvaluationPayload,
  VerifyJLPTPayload,
  RecordJLPTPayload,
} from "./types";

export const japaneseApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getJapaneseBatches: builder.query<
      JapaneseBatch[],
      { creator_role?: string; q?: string; status?: string; sub?: string } | void
    >({
      query: (params) => ({
        url: "japanese/batches/",
        params: params || {},
      }),
      transformResponse: (response: any) => {
        if (response && Array.isArray(response.results)) {
          return response.results;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      },
      providesTags: ["JapaneseBatch", "JapaneseInterns"],
    }),

    getJapaneseBatchById: builder.query<JapaneseBatch, string>({
      query: (id) => `japanese/batches/${id}/`,
      providesTags: ["JapaneseBatch"],
    }),

    getJapaneseDashboard: builder.query<JapaneseDashboardData, { cycle?: string } | void>({
      query: (params) => ({
        url: "japanese/dashboard/",
        params: params || {},
      }),
      providesTags: ["JapaneseDashboard"],
    }),

    getJapaneseInterns: builder.query<
      JapaneseAssignedIntern[],
      { q?: string; batch?: string; jlpt_level?: string; status?: string; cycle?: string } | void
    >({
      query: (params) => ({
        url: "japanese/assigned-interns/",
        params: params || {},
      }),
      providesTags: ["JapaneseInterns"],
    }),

    getJapaneseLearningPlans: builder.query<JapaneseLearningPlan[], { intern?: string; cycle?: string } | void>({
      query: (params) => ({
        url: "japanese/learning-plans/",
        params: params || {},
      }),
      providesTags: ["JapanesePlan"],
    }),

    createJapaneseLearningPlan: builder.mutation<JapaneseLearningPlan, CreateLearningPlanPayload>({
      query: (body) => ({
        url: "japanese/learning-plans/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["JapanesePlan", "JapaneseInterns", "JapaneseDashboard"],
    }),

    updateJapaneseLearningPlan: builder.mutation<
      JapaneseLearningPlan,
      { id: string; data: Partial<CreateLearningPlanPayload> }
    >({
      query: ({ id, data }) => ({
        url: `japanese/learning-plans/${id}/`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["JapanesePlan", "JapaneseInterns", "JapaneseDashboard"],
    }),

    deleteJapaneseLearningPlan: builder.mutation<void, string>({
      query: (id) => ({
        url: `japanese/learning-plans/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["JapanesePlan", "JapaneseInterns", "JapaneseDashboard"],
    }),

    getJapaneseTopics: builder.query<JapaneseTopic[], { plan?: string } | void>({
      query: (params) => ({
        url: "japanese/topics/",
        params: params || {},
      }),
      providesTags: ["JapanesePlan"],
    }),

    createJapaneseTopic: builder.mutation<JapaneseTopic, CreateTopicPayload>({
      query: (body) => ({
        url: "japanese/topics/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["JapanesePlan", "JapaneseDashboard"],
    }),

    createJapaneseMaterial: builder.mutation<JapaneseMaterial, CreateMaterialPayload>({
      query: (body) => ({
        url: "japanese/materials/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["JapanesePlan", "JapaneseDashboard"],
    }),

    getJapanesePracticeResults: builder.query<JapanesePracticeResult[], { intern?: string } | void>({
      query: (params) => ({
        url: "japanese/practice-results/",
        params: params || {},
      }),
      providesTags: ["JapanesePractice"],
    }),

    reviewJapanesePracticeResult: builder.mutation<
      JapanesePracticeResult,
      { id: string; data: ReviewPracticePayload }
    >({
      query: ({ id, data }) => ({
        url: `japanese/practice-results/${id}/review/`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["JapanesePractice", "JapaneseInterns", "JapaneseDashboard"],
    }),

    getJLPTAttempts: builder.query<
      JLPTAttempt[],
      {
        intern?: string;
        level?: string;
        batch?: string;
        sub_batch?: string;
        status?: string;
        verified?: string;
        q?: string;
        page_size?: number;
      } | void
    >({
      query: (params) => ({
        url: "japanese/jlpt-attempts/",
        params: { page_size: 100, ...(params || {}) },
      }),
      transformResponse: (response: any) => {
        if (response && Array.isArray(response.results)) {
          return response.results;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      },
      providesTags: ["JLPT"],
    }),

    createJLPTAttempt: builder.mutation<JLPTAttempt, RecordJLPTPayload>({
      query: (body) => ({
        url: "japanese/jlpt-attempts/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["JLPT", "JapaneseInterns", "JapaneseDashboard"],
    }),

    verifyJLPTAttempt: builder.mutation<JLPTAttempt, { id: string; data: VerifyJLPTPayload }>({
      query: ({ id, data }) => ({
        url: `japanese/jlpt-attempts/${id}/verify/`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["JLPT", "JapaneseInterns", "JapaneseDashboard"],
    }),

    getJLPTEligibility: builder.query<
      JLPTEligibilityRecord[],
      {
        cycle?: string;
        level?: string;
        batch?: string;
        sub_batch?: string;
        status?: string;
        q?: string;
        page_size?: number;
      } | void
    >({
      query: (params) => ({
        url: "japanese/jlpt-eligibility/",
        params: { page_size: 100, ...(params || {}) },
      }),
      transformResponse: (response: any) => {
        if (response && Array.isArray(response.results)) {
          return response.results;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      },
      providesTags: ["JLPT"],
    }),

    getJapaneseEvaluations: builder.query<
      JapaneseEvaluation[],
      {
        intern?: string;
        cycle?: string;
        status?: string;
        batch?: string;
        sub_batch?: string;
        q?: string;
        page_size?: number;
      } | void
    >({
      query: (params) => ({
        url: "japanese/evaluations/",
        params: { page_size: 100, ...(params || {}) },
      }),
      transformResponse: (response: any) => {
        if (response && Array.isArray(response.results)) {
          return response.results;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      },
      providesTags: ["JapaneseEvaluation"],
    }),

    getJapaneseEvaluationById: builder.query<JapaneseEvaluation, string>({
      query: (id) => `japanese/evaluations/${id}/`,
      providesTags: ["JapaneseEvaluation"],
    }),

    createJapaneseEvaluation: builder.mutation<JapaneseEvaluation, SaveEvaluationPayload>({
      query: (body) => ({
        url: "japanese/evaluations/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["JapaneseEvaluation", "JapaneseInterns", "JapaneseDashboard"],
    }),

    updateJapaneseEvaluation: builder.mutation<
      JapaneseEvaluation,
      { id: string; data: Partial<SaveEvaluationPayload> }
    >({
      query: ({ id, data }) => ({
        url: `japanese/evaluations/${id}/`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["JapaneseEvaluation", "JapaneseInterns", "JapaneseDashboard"],
    }),

    submitJapaneseEvaluation: builder.mutation<JapaneseEvaluation, string>({
      query: (id) => ({
        url: `japanese/evaluations/${id}/submit/`,
        method: "POST",
      }),
      invalidatesTags: ["JapaneseEvaluation", "JapaneseInterns", "JapaneseDashboard"],
    }),

    getJapaneseEvalCriteria: builder.query<JapaneseEvalCriterion[], { cycle?: string } | void>({
      query: (params) => ({
        url: "japanese/eval-criteria/",
        params: { page_size: 100, ...(params || {}) },
      }),
      transformResponse: (response: any) => {
        if (response && Array.isArray(response.results)) {
          return response.results;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      },
      providesTags: ["JapaneseEvaluation"],
    }),

    // Continuous Developmental Feedback Endpoints
    getJapaneseFeedbacks: builder.query<
      JapaneseFeedback[],
      {
        recipient?: string;
        status?: string;
        visibility?: string;
        feedback_type?: string;
        batch?: string;
        sub_batch?: string;
        q?: string;
        page_size?: number;
      } | void
    >({
      query: (params) => ({
        url: "feedback/",
        params: { page_size: 100, ...(params || {}) },
      }),
      transformResponse: (response: any) => {
        if (response && Array.isArray(response.results)) {
          return response.results;
        }
        if (Array.isArray(response)) {
          return response;
        }
        return [];
      },
      providesTags: ["ContinuousFeedback" as any],
    }),

    createJapaneseFeedback: builder.mutation<
      JapaneseFeedback,
      {
        recipient: string;
        feedback_type: string;
        message: string;
        visibility: "PUBLIC" | "PRIVATE" | "MANAGER_ONLY";
        status: "DRAFT" | "PUBLISHED";
      }
    >({
      query: (body) => ({
        url: "feedback/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ContinuousFeedback" as any],
    }),

    updateJapaneseFeedback: builder.mutation<
      JapaneseFeedback,
      {
        id: string;
        data: Partial<{
          feedback_type: string;
          message: string;
          visibility: "PUBLIC" | "PRIVATE" | "MANAGER_ONLY";
          status: "DRAFT" | "PUBLISHED";
        }>;
      }
    >({
      query: ({ id, data }) => ({
        url: `feedback/${id}/`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["ContinuousFeedback" as any],
    }),

    publishJapaneseFeedback: builder.mutation<any, string>({
      query: (id) => ({
        url: `feedback/${id}/publish/`,
        method: "POST",
      }),
      invalidatesTags: ["ContinuousFeedback" as any],
    }),

    addFeedbackComment: builder.mutation<
      JapaneseFeedbackComment,
      { feedbackId: string; comment: string }
    >({
      query: ({ feedbackId, comment }) => ({
        url: `feedback/${feedbackId}/comments/`,
        method: "POST",
        body: { comment },
      }),
      invalidatesTags: ["ContinuousFeedback" as any],
    }),
  }),
});

export const {
  useGetJapaneseBatchesQuery,
  useGetJapaneseBatchByIdQuery,
  useGetJapaneseDashboardQuery,
  useGetJapaneseInternsQuery,
  useGetJapaneseLearningPlansQuery,
  useCreateJapaneseLearningPlanMutation,
  useUpdateJapaneseLearningPlanMutation,
  useDeleteJapaneseLearningPlanMutation,
  useGetJapaneseTopicsQuery,
  useCreateJapaneseTopicMutation,
  useCreateJapaneseMaterialMutation,
  useGetJapanesePracticeResultsQuery,
  useReviewJapanesePracticeResultMutation,
  useGetJLPTAttemptsQuery,
  useCreateJLPTAttemptMutation,
  useVerifyJLPTAttemptMutation,
  useGetJLPTEligibilityQuery,
  useGetJapaneseEvaluationsQuery,
  useGetJapaneseEvaluationByIdQuery,
  useCreateJapaneseEvaluationMutation,
  useUpdateJapaneseEvaluationMutation,
  useSubmitJapaneseEvaluationMutation,
  useGetJapaneseEvalCriteriaQuery,
  useGetJapaneseFeedbacksQuery,
  useCreateJapaneseFeedbackMutation,
  useUpdateJapaneseFeedbackMutation,
  usePublishJapaneseFeedbackMutation,
  useAddFeedbackCommentMutation,
} = japaneseApi;
