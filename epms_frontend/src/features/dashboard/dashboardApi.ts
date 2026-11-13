import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type { 
  HrDashboardResponse, 
  AdminDashboardResponse,
  EmployeeDashboardResponse,
  ManagerDashboardResponse,
  InternScorecardResponse,
  InternOverviewData,
  InternGoalItem,
  InternTaskItem,
  InternEvidenceItem,
  InternSelfAppraisalData,
  InternPublishedFeedbackData,
  InternAppraisalItem,
  InternFormItem,
  InternFormDetail,
  InternJourneyData
} from "./dashboardTypes";


export const dashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getHrDashboard: builder.query<HrDashboardResponse, void>({
      query: () => "/dashboard/hr",
      transformResponse: (res: ApiResponse<HrDashboardResponse>) => res.data,
    }),
    getAdminDashboard: builder.query<AdminDashboardResponse, void>({
      query: () => "/dashboard/admin",
      transformResponse: (res: ApiResponse<AdminDashboardResponse>) => res.data,
    }),
    getEmployeeDashboard: builder.query<EmployeeDashboardResponse, void>({
      query: () => "/dashboard/employee",
      transformResponse: (res: ApiResponse<EmployeeDashboardResponse>) => res.data,
      providesTags: ["Profile", "GoalSet", "Appraisal"],
    }),
    getManagerDashboard: builder.query<ManagerDashboardResponse, void>({
      query: () => "/dashboard/manager",
      transformResponse: (res: ApiResponse<ManagerDashboardResponse>) => res.data,
    }),

    // Comprehensive Intern Module Endpoints
    getInternOverview: builder.query<InternOverviewData, void>({
      query: () => "/intern/overview/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Profile", "GoalSet", "Appraisal"],
    }),
    getInternJourney: builder.query<InternJourneyData, string | void>({
      query: (employeeId) =>
        employeeId
          ? `/intern/journey/?employee_id=${encodeURIComponent(employeeId)}`
          : "/intern/journey/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Profile", "GoalSet", "Appraisal"],
    }),
    getInternScorecard: builder.query<InternScorecardResponse, void>({
      query: () => "/intern/scorecard/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["GoalSet", "Appraisal"],
    }),
    getInternGoals: builder.query<InternGoalItem[], void>({
      query: () => "/intern/my-goals/",
      transformResponse: (res: any) => {
        if (Array.isArray(res)) return res;
        if (res?.data && Array.isArray(res.data)) return res.data;
        if (res?.results && Array.isArray(res.results)) return res.results;
        return res?.data ?? res ?? [];
      },
      providesTags: ["GoalSet", "Profile"],
    }),
    updateInternGoalProgress: builder.mutation<any, { id: string; progress: number; comment?: string }>({
      query: ({ id, ...body }) => ({
        url: `/intern/my-goals/${id}/progress/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet", "Appraisal", "Profile"],
    }),
    addInternGoalComment: builder.mutation<any, { id: string; comment: string; parentId?: string }>({
      query: ({ id, ...body }) => ({
        url: `/intern/my-goals/${id}/comments/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet"],
    }),
    getInternTasks: builder.query<InternTaskItem[], void>({
      query: () => "/intern/tasks/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["GoalSet", "Profile"],
    }),
    createInternTask: builder.mutation<any, { title: string; description?: string; goalId?: string; dueDate?: string; priority?: string; status?: string }>({
      query: (body) => ({
        url: "/intern/tasks/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet", "Profile"],
    }),
    updateInternTask: builder.mutation<any, { id: string; title?: string; description?: string; dueDate?: string; priority?: string; status?: string }>({
      query: ({ id, ...body }) => ({
        url: `/intern/tasks/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["GoalSet", "Profile"],
    }),
    deleteInternTask: builder.mutation<any, string>({
      query: (id) => ({
        url: `/intern/tasks/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["GoalSet", "Profile"],
    }),
    getHrInternTasks: builder.query<InternTaskItem[], { employee_id?: string; status?: string; priority?: string } | void>({
      query: (params) => ({
        url: "/hr/intern-tasks/",
        params: params || {},
      }),
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["GoalSet"],
    }),
    createGoal: builder.mutation<any, { employee: string; title: string; description?: string; category?: string; priority?: string; start_date?: string; due_date: string; target_value?: number; weightage?: number }>({
      query: (body) => ({
        url: "/api/goals/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet", "Profile", "Appraisal"],
    }),
    reviewEvidence: builder.mutation<any, { id: string; review_status: string; review_notes?: string }>({
      query: ({ id, ...body }) => ({
        url: `/api/evidence/${id}/review/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet", "Appraisal"],
    }),
    completeInternTask: builder.mutation<any, { id: string; isCompleted: boolean; completedAt?: string; hoursSpent?: number; completionNotes?: string; artifactUrl?: string }>({
      query: ({ id, ...body }) => ({
        url: `/intern/tasks/${id}/complete/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet", "Profile"],
    }),
    getInternEvidence: builder.query<InternEvidenceItem[], void>({
      query: () => "/intern/evidence/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["GoalSet"],
    }),
    submitInternEvidence: builder.mutation<any, FormData | { goalId?: string; title: string; description?: string; externalUrl?: string }>({
      query: (body) => ({
        url: "/intern/evidence/submit/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet"],
    }),
    getInternSelfAppraisal: builder.query<InternSelfAppraisalData, void>({
      query: () => "/intern/self-appraisal/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),
    submitInternSelfAppraisal: builder.mutation<any, { selfRating?: number; achievements?: string; challenges?: string; skillsAcquired?: string; mentorshipNeeds?: string; reflectionSummary?: string; isDraft?: boolean }>({
      query: (body) => ({
        url: "/intern/self-appraisal/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Appraisal", "Profile"],
    }),
    getInternPublishedFeedback: builder.query<InternPublishedFeedbackData, void>({
      query: () => "/intern/published-feedback/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),
    replyToMentorFeedback: builder.mutation<any, { replyText: string }>({
      query: (body) => ({
        url: "/intern/published-feedback/reply/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Appraisal"],
    }),
    getInternAppraisals: builder.query<InternAppraisalItem[], void>({
      query: () => "/intern/my-appraisals/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),

    // HR Flexible Scoring Parameters & Weightages
    getScoringParameters: builder.query<any, string | void>({
      query: (cycleId) => cycleId ? `/performance/cycles/${cycleId}/scoring-parameters/` : "/performance/cycles/scoring-parameters/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),
    updateScoringParameters: builder.mutation<any, { cycleId?: string; componentWeights?: any; evaluationParameters?: any[]; deleteParameterIds?: string[]; recalculate?: boolean }>({
      query: ({ cycleId, ...body }) => ({
        url: cycleId ? `/performance/cycles/${cycleId}/scoring-parameters/` : "/performance/cycles/scoring-parameters/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Appraisal", "Profile", "GoalSet"],
    }),

    // HR-Published Forms for Interns
    getInternForms: builder.query<InternFormItem[], void>({
      query: () => "/intern/forms/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),
    getInternFormDetail: builder.query<InternFormDetail, string>({
      query: (formId) => `/intern/forms/${formId}/`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),
    submitInternForm: builder.mutation<any, { formId: string; is_submitted: boolean; answers: Record<string, any> }>({
      query: ({ formId, ...body }) => ({
        url: `/intern/forms/${formId}/submit/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Appraisal", "Profile"],
    }),

    // MIRAI Certification Endpoints
    submitMiraiCertification: builder.mutation<any, { jlptLevel: string; quarterCode?: string; name?: string; score?: string; examDate?: string; clearanceDate?: string; certificateUrl?: string; status?: string }>({
      query: (body) => ({
        url: "/intern/journey/certifications/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Profile", "GoalSet", "Appraisal"],
    }),
    verifyMiraiCertification: builder.mutation<any, { id: string; is_verified: boolean; notes?: string }>({
      query: ({ id, ...body }) => ({
        url: `/intern/journey/certifications/${id}/verify/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Profile", "GoalSet", "Appraisal"],
    }),
    updateInternJourney: builder.mutation<any, { employeeId: string; [key: string]: any }>({
      query: ({ employeeId, ...body }) => ({
        url: `/intern/journey/${employeeId}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Profile", "GoalSet", "Appraisal"],
    }),

    // Notification Endpoints
    getUnreadNotificationsCount: builder.query<{ unread_count: number }, void>({
      query: () => "/notifications/unread-count/",
      transformResponse: (res: any) => res?.data ?? res,
    }),
    markNotificationRead: builder.mutation<any, string>({
      query: (id) => ({
        url: `/notifications/${id}/mark_read/`,
        method: "POST",
      }),
    }),
    markAllNotificationsRead: builder.mutation<any, void>({
      query: () => ({
        url: "/notifications/read-all/",
        method: "POST",
      }),
    }),
  }),
});

export const { 
  useGetHrDashboardQuery, 
  useGetAdminDashboardQuery,
  useGetEmployeeDashboardQuery,
  useGetManagerDashboardQuery,
  useGetInternOverviewQuery,
  useGetInternJourneyQuery,
  useGetInternScorecardQuery,
  useGetInternGoalsQuery,
  useUpdateInternGoalProgressMutation,
  useAddInternGoalCommentMutation,
  useGetInternTasksQuery,
  useCreateInternTaskMutation,
  useUpdateInternTaskMutation,
  useDeleteInternTaskMutation,
  useGetHrInternTasksQuery,
  useCreateGoalMutation,
  useReviewEvidenceMutation,
  useCompleteInternTaskMutation,
  useGetInternEvidenceQuery,
  useSubmitInternEvidenceMutation,
  useGetInternSelfAppraisalQuery,
  useSubmitInternSelfAppraisalMutation,
  useGetInternPublishedFeedbackQuery,
  useReplyToMentorFeedbackMutation,
  useGetInternAppraisalsQuery,
  useGetScoringParametersQuery,
  useUpdateScoringParametersMutation,
  useGetInternFormsQuery,
  useGetInternFormDetailQuery,
  useSubmitInternFormMutation,
  useSubmitMiraiCertificationMutation,
  useVerifyMiraiCertificationMutation,
  useUpdateInternJourneyMutation,
  useGetUnreadNotificationsCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = dashboardApi;
