import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, ArrowLeft } from 'lucide-react';
import {
  useGetInternOverviewQuery,
  useGetInternGoalsQuery,
  useUpdateInternGoalProgressMutation,
  useAddInternGoalCommentMutation,
  useGetInternTasksQuery,
  useCompleteInternTaskMutation,
  useGetInternEvidenceQuery,
  useSubmitInternEvidenceMutation,
  useGetInternSelfAppraisalQuery,
  useSubmitInternSelfAppraisalMutation,
  useGetInternPublishedFeedbackQuery,
  useReplyToMentorFeedbackMutation,
  useGetUnreadNotificationsCountQuery,
  useGetInternJourneyQuery,
} from '../features/dashboard/dashboardApi';
import { useGetMyNotificationsQuery } from '../features/notification/notificationApi';
import { useAuth } from '../hooks/useAuth';
import InternOverviewTab from '../components/intern/InternOverviewTab';
import InternGoalsTab from '../components/intern/InternGoalsTab';
import InternTasksTab from '../components/intern/InternTasksTab';
import InternEvidenceTab from '../components/intern/InternEvidenceTab';
import InternEvaluationTab from '../components/intern/InternEvaluationTab';
import InternFormsTab from '../components/intern/InternFormsTab';
import InternResultsTab from '../components/intern/InternResultsTab';
import InternProfileTab from '../components/intern/InternProfileTab';
import { InternJourneyTab } from '../components/intern/InternJourneyTab';
import InternNotificationsModal from '../components/intern/InternNotificationsModal';

type DashboardTab = 'overview' | 'journey' | 'goals' | 'tasks' | 'evidence' | 'evaluation' | 'forms' | 'results' | 'profile';

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [evidencePreselectedGoalId, setEvidencePreselectedGoalId] = useState<string>('');

  const validTabs: DashboardTab[] = ['overview', 'journey', 'goals', 'tasks', 'evidence', 'evaluation', 'forms', 'results', 'profile'];
  const tabParam = searchParams.get('tab') as DashboardTab | null;
  const activeTab: DashboardTab = (tabParam && validTabs.includes(tabParam)) ? tabParam : 'overview';

  const setActiveTab = (newTab: DashboardTab) => {
    if (newTab === 'overview') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: newTab }, { replace: true });
    }
  };

  // Primary Queries
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
  } = useGetInternOverviewQuery();

  const {
    data: journeyData,
    isLoading: isJourneyLoading,
    refetch: refetchJourney,
  } = useGetInternJourneyQuery();

  const {
    data: goals = [],
    isLoading: isGoalsLoading,
    refetch: refetchGoals,
  } = useGetInternGoalsQuery();

  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    refetch: refetchTasks,
  } = useGetInternTasksQuery();

  const {
    data: evidenceList = [],
    isLoading: isEvidenceLoading,
    refetch: refetchEvidence,
  } = useGetInternEvidenceQuery();

  const {
    data: selfAppraisal,
    isLoading: isAppraisalLoading,
    refetch: refetchSelfAppraisal,
  } = useGetInternSelfAppraisalQuery();

  const {
    data: publishedFeedback,
    isLoading: isFeedbackLoading,
    refetch: refetchFeedback,
  } = useGetInternPublishedFeedbackQuery();

  const {
    data: unreadNotifs,
    refetch: refetchUnreadNotifs,
  } = useGetUnreadNotificationsCountQuery();

  const {
    data: myNotifications = [],
    refetch: refetchMyNotifications,
  } = useGetMyNotificationsQuery();

  // Primary Mutations
  const [updateGoalProgress] = useUpdateInternGoalProgressMutation();
  const [addGoalComment] = useAddInternGoalCommentMutation();
  const [completeTask] = useCompleteInternTaskMutation();
  const [submitEvidence] = useSubmitInternEvidenceMutation();
  const [submitSelfAppraisal] = useSubmitInternSelfAppraisalMutation();
  const [replyToFeedback] = useReplyToMentorFeedbackMutation();

  const handleOpenEvidenceForGoal = (goalId: string) => {
    setEvidencePreselectedGoalId(goalId);
    setActiveTab('evidence');
  };

  const handleRefreshAll = () => {
    refetchOverview();
    refetchJourney();
    refetchGoals();
    refetchTasks();
    refetchEvidence();
    refetchSelfAppraisal();
    refetchFeedback();
    refetchUnreadNotifs();
    refetchMyNotifications();
  };

  const internName = overviewData?.profile?.name || user?.staffName || (user as any)?.username || (user as any)?.profile?.full_name || 'Intern';
  const designation = overviewData?.profile?.designation || (user as any)?.profile?.designation || 'Software Engineering Intern';
  const department = overviewData?.profile?.department || 'Engineering';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header / Welcome Area */}
      <div className="pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="text-purple-600" size={26} />
            Welcome back, {internName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            <span className="font-medium text-slate-700">{designation}</span> • {department} • {overviewData?.cycle?.name || 'Active Performance Evaluation'}
          </p>
        </div>
      </div>

      {/* Back to Overview button when on a sub-view */}
      {activeTab !== 'overview' && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3.5 py-1.5 rounded-xl border border-purple-200 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard Overview</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="transition-opacity duration-150">
        {activeTab === 'overview' && (
          <InternOverviewTab
            overviewData={overviewData}
            journeyData={journeyData}
            goals={goals}
            tasks={tasks}
            myNotifications={myNotifications}
            isLoading={isOverviewLoading || isJourneyLoading}
            onNavigateToTab={(t) => setActiveTab(t as DashboardTab)}
            onRefresh={handleRefreshAll}
            onUpdateProgress={async (goalId, progress, comment) => {
              return updateGoalProgress({ id: goalId, progress, comment }).unwrap();
            }}
            onCompleteTask={async (payload) => {
              return completeTask(payload).unwrap();
            }}
            onOpenEvidenceModal={handleOpenEvidenceForGoal}
          />
        )}

        {activeTab === 'journey' && (
          <InternJourneyTab
            onNavigateTab={(t) => setActiveTab(t as DashboardTab)}
          />
        )}

        {activeTab === 'goals' && (
          <InternGoalsTab
            goals={goals}
            isLoading={isGoalsLoading}
            onUpdateProgress={async (goalId, progress, comment) => {
              return updateGoalProgress({ id: goalId, progress, comment }).unwrap();
            }}
            onAddComment={async (goalId, comment, parentId) => {
              return addGoalComment({ id: goalId, comment, parentId }).unwrap();
            }}
            onOpenEvidenceModal={handleOpenEvidenceForGoal}
            onRefetch={refetchGoals}
          />
        )}

        {activeTab === 'tasks' && (
          <InternTasksTab
            tasks={tasks}
            isLoading={isTasksLoading}
            onCompleteTask={async (payload) => {
              return completeTask(payload).unwrap();
            }}
            onRefetch={refetchTasks}
          />
        )}

        {activeTab === 'evidence' && (
          <InternEvidenceTab
            evidenceList={evidenceList}
            goals={goals}
            isLoading={isEvidenceLoading}
            onSubmitEvidence={async (fd) => {
              return submitEvidence(fd).unwrap();
            }}
            preselectedGoalId={evidencePreselectedGoalId}
            onRefetch={refetchEvidence}
            onCloseDirectModal={() => setEvidencePreselectedGoalId('')}
          />
        )}

        {activeTab === 'evaluation' && (
          <InternEvaluationTab
            selfAppraisal={selfAppraisal}
            isLoading={isAppraisalLoading}
            onSubmitSelfAppraisal={async (payload) => {
              return submitSelfAppraisal(payload).unwrap();
            }}
            onRefetch={refetchSelfAppraisal}
          />
        )}

        {activeTab === 'forms' && <InternFormsTab />}

        {activeTab === 'results' && (
          <InternResultsTab
            feedbackData={publishedFeedback}
            isLoading={isFeedbackLoading}
            onReplyToFeedback={async (replyText) => {
              return replyToFeedback({ replyText }).unwrap();
            }}
            onRefetch={refetchFeedback}
          />
        )}

        {activeTab === 'profile' && (
          <InternProfileTab
            user={user}
            mentor={overviewData?.mentor}
            cycleName={overviewData?.cycle?.name}
          />
        )}
      </main>

      {/* Notifications Modal */}
      <InternNotificationsModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        notifications={myNotifications}
        onRefetch={refetchUnreadNotifs}
      />
    </div>
  );
};

export default EmployeeDashboard;
