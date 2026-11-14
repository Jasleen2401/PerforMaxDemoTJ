import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Award,
  ArrowLeft,
  RotateCcw
} from 'lucide-react';
import {
  useGetInternOverviewQuery,
  useGetInternJourneyQuery,
  useGetInternSelfAppraisalQuery,
  useSubmitInternSelfAppraisalMutation,
  useGetInternPublishedFeedbackQuery,
  useReplyToMentorFeedbackMutation,
  useGetUnreadNotificationsCountQuery,
} from '../features/dashboard/dashboardApi';
import { useGetMyNotificationsQuery } from '../features/notification/notificationApi';
import { useAuth } from '../hooks/useAuth';

import InternOverviewTab from '../components/intern/InternOverviewTab';
import InternQuartersTab from '../components/intern/InternQuartersTab';
import InternEvaluationTab from '../components/intern/InternEvaluationTab';
import { InternJourneyTab } from '../components/intern/InternJourneyTab';
import InternResultsTab from '../components/intern/InternResultsTab';
import InternProfileTab from '../components/intern/InternProfileTab';
import InternNotificationsModal from '../components/intern/InternNotificationsModal';

export type DashboardTab = 'overview' | 'quarters' | 'self-review' | 'journey' | 'feedback' | 'profile';

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  const rawTabParam = searchParams.get('tab');
  // Backwards compatibility mappings for any legacy URLs or bookmarks
  const tabParam = (
    rawTabParam === 'evaluation' ? 'self-review' :
    rawTabParam === 'results' ? 'feedback' :
    rawTabParam
  ) as DashboardTab | null;

  const validTabs: DashboardTab[] = ['overview', 'quarters', 'self-review', 'journey', 'feedback', 'profile'];
  const activeTab: DashboardTab = (tabParam && validTabs.includes(tabParam)) ? tabParam : 'overview';

  const setActiveTab = (newTab: DashboardTab) => {
    if (newTab === 'overview') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: newTab }, { replace: true });
    }
  };

  // Primary Queries for Intern Dashboard
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

  // Mutations
  const [submitSelfAppraisal] = useSubmitInternSelfAppraisalMutation();
  const [replyToFeedback] = useReplyToMentorFeedbackMutation();

  const handleRefreshAll = () => {
    refetchOverview();
    refetchJourney();
    refetchSelfAppraisal();
    refetchFeedback();
    refetchUnreadNotifs();
    refetchMyNotifications();
  };

  const internName = overviewData?.profile?.name || user?.staffName || (user as any)?.username || (user as any)?.profile?.full_name || 'Intern';
  const designation = overviewData?.profile?.designation || (user as any)?.profile?.designation || 'Software Engineering Intern';
  const department = overviewData?.profile?.department || 'Engineering';
  const cohortName = overviewData?.activeCohort || 'MIRAI Cohort 2026';
  const workflowStatus = overviewData?.workflowStatus || 'IN_PROGRESS';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header / Welcome Area */}
      <div className="pb-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              {cohortName}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              {overviewData?.currentQuarter?.name || 'Q2 Quarter'}
            </span>
            {workflowStatus === 'RETURNED' && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                <RotateCcw size={11} /> Revision Needed
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="text-purple-600" size={26} />
            Welcome back, {internName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            <span className="font-medium text-slate-700">{designation}</span> • {department} • {overviewData?.cycle?.name || 'Active Performance Evaluation'}
          </p>
        </div>

        {/* Quick Review Status Tag */}
        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
          <div className="text-left md:text-right bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Review Stage</span>
            <span className="text-xs font-bold text-slate-800">
              {overviewData?.currentReviewStage || 'Self-Review Open'}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-view Back Button */}
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

      {/* Main Content Sections */}
      <main className="transition-opacity duration-150">
        {activeTab === 'overview' && (
          <InternOverviewTab
            overviewData={overviewData}
            journeyData={journeyData}
            isLoading={isOverviewLoading || isJourneyLoading}
            onNavigateToTab={(t) => setActiveTab(t as DashboardTab)}
            onRefresh={handleRefreshAll}
          />
        )}

        {activeTab === 'quarters' && (
          <InternQuartersTab
            journeyData={journeyData}
            overviewData={overviewData}
            feedbackData={publishedFeedback}
            isLoading={isOverviewLoading || isJourneyLoading}
            onNavigateToTab={(t) => setActiveTab(t as DashboardTab)}
            onRefresh={handleRefreshAll}
          />
        )}

        {activeTab === 'self-review' && (
          <InternEvaluationTab
            selfAppraisal={selfAppraisal}
            isLoading={isAppraisalLoading}
            onSubmitSelfAppraisal={async (payload) => {
              return submitSelfAppraisal(payload).unwrap();
            }}
            onRefetch={refetchSelfAppraisal}
            onNavigateToTab={(t) => setActiveTab(t as DashboardTab)}
          />
        )}

        {activeTab === 'journey' && (
          <InternJourneyTab
            onNavigateTab={(t) => setActiveTab(t as DashboardTab)}
          />
        )}

        {activeTab === 'feedback' && (
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
