import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award, Target, ClipboardList, FileText, UserCheck,
  Trophy, User, Bell, RefreshCw, Compass, ShieldCheck,
  ChevronDown, ExternalLink, X, Users, CheckCircle2
} from 'lucide-react';
import { toast } from 'react-toastify';
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
  useGetUnreadNotificationsCountQuery
} from '../features/dashboard/dashboardApi';
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

export interface EmployeeDashboardProps {
  onScopeSwitch?: () => void;
  scopeLabel?: string;
  onRefreshParent?: () => Promise<any> | void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  onScopeSwitch,
  scopeLabel,
  onRefreshParent,
}) => {
  const { user, isAdmin, isHR, isManager, isIntern } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [evidencePreselectedGoalId, setEvidencePreselectedGoalId] = useState<string>('');

  // Primary Queries
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
  } = useGetInternOverviewQuery();

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

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        refetchOverview(),
        refetchGoals(),
        refetchTasks(),
        refetchEvidence(),
        refetchSelfAppraisal(),
        refetchFeedback(),
        refetchUnreadNotifs(),
        onRefreshParent ? onRefreshParent() : Promise.resolve(),
      ]);
      toast.success("Dashboard data refreshed successfully!");
    } catch {
      toast.error("Failed to refresh some dashboard items.");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const displayName =
    user?.staffName ||
    (user as any)?.first_name ||
    (user as any)?.name ||
    (user as any)?.username ||
    (isManager ? 'Mentor' : isIntern ? 'Intern' : 'Team Member');

  const computedScopeLabel =
    scopeLabel ||
    (isAdmin
      ? 'Super Admin Scope'
      : isHR
      ? 'HR Partner Scope'
      : isManager
      ? 'Mentor Scope'
      : isIntern
      ? 'Cohort Member Scope'
      : 'Employee Scope');

  const tabs: Array<{ id: DashboardTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: <Award size={16} /> },
    { id: 'journey', label: 'My Journey', icon: <Compass size={16} /> },
    { id: 'goals', label: 'Goals & Milestones', icon: <Target size={16} />, badge: goals.length },
    { id: 'tasks', label: 'Tasks & Sprints', icon: <ClipboardList size={16} />, badge: tasks.filter((t: any) => !t.isCompleted && t.status !== 'COMPLETED').length },
    { id: 'evidence', label: 'Deliverables & Evidence', icon: <FileText size={16} />, badge: evidenceList.length },
    { id: 'evaluation', label: 'Self-Appraisal', icon: <UserCheck size={16} /> },
    { id: 'forms', label: 'HR Surveys', icon: <FileText size={16} /> },
    { id: 'results', label: 'Published Results', icon: <Trophy size={16} /> },
    { id: 'profile', label: 'My Placement', icon: <User size={16} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="text-amber-500" size={26} />
            Welcome back, {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {overviewData?.cycle?.name || 'Active Performance Evaluation'} • {overviewData?.cycle?.currentPhase || (isManager ? 'Managerial Review & Operations' : 'Active Milestone Sprint')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View My Journey Quick Action */}
          <button
            onClick={() => setActiveTab('journey')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
              activeTab === 'journey'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title="View your comprehensive internship journey roadmap"
          >
            <Compass size={14} />
            <span>View My Journey</span>
          </button>

          {/* Notification Button */}
          <button
            onClick={() => setIsNotifModalOpen(true)}
            className="relative p-2 rounded-xl bg-white border border-[#e4ddf5] text-[#625d78] hover:text-[#6d3fea] hover:bg-[#f3eeff] transition-colors shadow-2xs cursor-pointer"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadNotifs && unreadNotifs.unread_count > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {unreadNotifs.unread_count}
              </span>
            )}
          </button>

          {/* Refresh Data Button */}
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className={`p-2 rounded-xl bg-white border border-[#e4ddf5] text-[#625d78] hover:text-[#6d3fea] hover:bg-[#f3eeff] transition-all shadow-2xs cursor-pointer ${
              isRefreshing ? 'opacity-70 cursor-wait' : ''
            }`}
            title="Refresh dashboard data"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw size={18} className={`transition-transform ${isRefreshing ? "animate-spin text-[#6d3fea]" : ""}`} />
          </button>

          {/* Dynamic Interactive Scope Button */}
          <button
            type="button"
            onClick={() => setIsScopeModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#f3eeff] hover:bg-[#ebdfff] text-[#5526d9] font-bold text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-xl border border-[#c7b5f5] hover:border-[#a88ff0] shadow-2xs transition-all cursor-pointer group"
            title="Click to view workspace scope details & switch context"
          >
            <ShieldCheck size={13} className="text-[#6d3fea] group-hover:scale-110 transition-transform" />
            <span>{computedScopeLabel}</span>
            <ChevronDown size={12} className="opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-white/70 rounded-2xl border border-[#e4ddf5] select-none scrollbar-none shadow-xs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id !== 'evidence') setEvidencePreselectedGoalId('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#6d3fea] text-white shadow-xs'
                  : 'text-[#625d78] hover:bg-[#f3eeff] hover:text-[#17152e]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/25 text-white' : 'bg-[#ebe4ff] text-[#6d3fea]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <main className="transition-opacity duration-150">
        {activeTab === 'overview' && (
          <InternOverviewTab
            overviewData={overviewData}
            isLoading={isOverviewLoading}
            onNavigateToTab={(t) => setActiveTab(t as DashboardTab)}
            onRefresh={refetchOverview}
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
        notifications={[]}
        onRefetch={refetchUnreadNotifs}
      />

      {/* Scope Details & Context Switcher Modal */}
      {isScopeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Workspace Scope & Role</h3>
                  <p className="text-xs text-slate-500">Security permissions & operational context</p>
                </div>
              </div>
              <button
                onClick={() => setIsScopeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Current User:</span>
                <span className="font-semibold text-slate-800">{displayName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Active Scope:</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] uppercase">
                  {computedScopeLabel}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Performance Cycle:</span>
                <span className="font-medium text-slate-700">{overviewData?.cycle?.name || 'Active Performance Cycle'}</span>
              </div>
            </div>

            {/* Scope Quick Actions */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Available Scope Actions</p>
              
              {onScopeSwitch && (
                <button
                  type="button"
                  onClick={() => {
                    setIsScopeModalOpen(false);
                    onScopeSwitch();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-900 border border-indigo-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-indigo-600" />
                    <span>Switch to Team Management Scope</span>
                  </div>
                  <ChevronDown size={14} className="-rotate-90 text-indigo-500" />
                </button>
              )}

              {isManager && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsScopeModalOpen(false);
                      navigate('/manager/mentees');
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-blue-600" />
                      <span>Assigned Mentees (Direct Reports)</span>
                    </div>
                    <ExternalLink size={14} className="text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsScopeModalOpen(false);
                      navigate('/appraisal');
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardList size={16} className="text-emerald-600" />
                      <span>Conduct Team Performance Appraisals</span>
                    </div>
                    <ExternalLink size={14} className="text-slate-400" />
                  </button>
                </>
              )}

              {!isManager && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Cohort Member Scope Active</span>
                  </div>
                  <p className="text-[11px] text-emerald-700/90">
                    You are in the individual contributor workspace for milestone deliverables, task completion, and self-appraisals.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsScopeModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
