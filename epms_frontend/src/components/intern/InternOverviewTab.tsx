import React from 'react';
import {
  Compass,
  Calendar,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  User,
  Layers,
  ChevronRight,
  Sparkles,
  RotateCcw,
  BookOpen,
  Check,
  Lock,
  ExternalLink,
  Milestone,
  Info
} from 'lucide-react';
import type {
  InternOverviewData,
  InternJourneyData,
  CompetencyItem,
  InternDeadlineItem
} from '../../features/dashboard/dashboardTypes';

export interface InternOverviewTabProps {
  overviewData?: InternOverviewData;
  journeyData?: InternJourneyData;
  isLoading: boolean;
  onNavigateToTab: (tab: string) => void;
  onRefresh: () => void;
  // Legacy optional props to prevent any parent breakage
  goals?: any[];
  tasks?: any[];
  myNotifications?: any[];
  onUpdateProgress?: (goalId: string, progress: number, comment?: string) => Promise<any>;
  onCompleteTask?: (payload: any) => Promise<any>;
  onOpenEvidenceModal?: (goalId: string) => void;
}

const WORKFLOW_STEPS = [
  { key: 'NOT_STARTED', label: 'Not Started', step: 1 },
  { key: 'IN_PROGRESS', label: 'In Progress', step: 2 },
  { key: 'SUBMITTED', label: 'Submitted', step: 3 },
  { key: 'UNDER_REVIEW', label: 'Under Review', step: 4 },
  { key: 'PUBLISHED', label: 'Published', step: 5 },
];

export const InternOverviewTab: React.FC<InternOverviewTabProps> = ({
  overviewData,
  journeyData,
  isLoading,
  onNavigateToTab,
}) => {
  const activeCohort = overviewData?.activeCohort || journeyData?.intern?.department ? `${overviewData?.activeCohort || 'MIRAI Cohort 2026'}` : 'MIRAI Cohort 2026';
  const currentQuarter = overviewData?.currentQuarter || {
    code: 'Q2',
    name: 'Q2 — Internship Begins',
    purpose: 'Sprint Deliverables, Mentor Alignment & Core System Architecture',
    status: 'IN_PROGRESS'
  };
  const currentReviewStage = overviewData?.currentReviewStage || 'Self-Review in Progress';
  const workflowStatus = overviewData?.workflowStatus || 'IN_PROGRESS';
  const overallProgress = overviewData?.overallReviewProgress ?? 25;
  const reviewerComments = overviewData?.reviewerComments || '';
  const upcomingDeadlines = overviewData?.upcomingReviewDeadlines || [];
  const jlpt = overviewData?.jlptEligibility;
  const mentor = overviewData?.mentor;
  const requiredCompetencies = overviewData?.requiredCompetencies || [];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl border border-slate-200" />
          ))}
        </div>
        <div className="h-44 bg-slate-100 rounded-2xl border border-slate-200" />
        <div className="h-80 bg-slate-100 rounded-2xl border border-slate-200" />
      </div>
    );
  }

  const isReturned = workflowStatus === 'RETURNED';

  const getStepStatus = (stepKey: string) => {
    if (workflowStatus === 'PUBLISHED') return 'COMPLETED';
    if (workflowStatus === 'RETURNED') {
      if (stepKey === 'NOT_STARTED') return 'COMPLETED';
      if (stepKey === 'IN_PROGRESS') return 'ACTIVE_RETURNED';
      return 'PENDING';
    }
    const order = ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'PUBLISHED'];
    const currentIndex = order.indexOf(workflowStatus);
    const stepIndex = order.indexOf(stepKey);
    if (stepIndex < currentIndex) return 'COMPLETED';
    if (stepIndex === currentIndex) return 'ACTIVE';
    return 'PENDING';
  };

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      {/* ========================================================================= */}
      {/* 1. TOP OVERVIEW CARDS (Active Cohort, Quarter, Stage, Progress)            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Cohort */}
        <div className="bg-white rounded-2xl border border-purple-100 p-5 shadow-xs hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Cohort
            </span>
            <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Compass size={16} />
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate" title={activeCohort}>
            {activeCohort}
          </h3>
          <p className="text-xs text-slate-500 mt-1 truncate">
            {mentor?.name ? `Mentor: ${mentor.name}` : 'Software Engineering Track'}
          </p>
        </div>

        {/* Card 2: Current Quarter */}
        <div
          onClick={() => onNavigateToTab('quarters')}
          className="bg-white rounded-2xl border border-purple-100 p-5 shadow-xs hover:border-purple-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-purple-700 transition-colors">
              Current Quarter
            </span>
            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar size={16} />
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
            {currentQuarter.name}
          </h3>
          <p className="text-xs text-indigo-600 font-semibold mt-1 flex items-center gap-1">
            <span>Explore Mirai Journey</span>
            <ChevronRight size={12} />
          </p>
        </div>

        {/* Card 3: Current Review Stage */}
        <div
          onClick={() => onNavigateToTab('self-review')}
          className="bg-white rounded-2xl border border-purple-100 p-5 shadow-xs hover:border-purple-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-purple-700 transition-colors">
              Review Stage
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award size={16} />
            </span>
          </div>
          <h3 className={`text-base sm:text-lg font-bold truncate ${isReturned ? 'text-rose-600' : 'text-slate-900'}`}>
            {currentReviewStage}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {workflowStatus === 'SUBMITTED' ? 'Awaiting mentor review' :
             workflowStatus === 'RETURNED' ? 'Revision required' :
             workflowStatus === 'PUBLISHED' ? 'Appraisal completed' :
             'Action required by intern'}
          </p>
        </div>

        {/* Card 4: Overall Review Progress */}
        <div className="bg-white rounded-2xl border border-purple-100 p-5 shadow-xs hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Review Progress
            </span>
            <span className="text-base font-black text-purple-700">
              {overallProgress}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden my-2">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                overallProgress === 100 ? 'bg-emerald-500' : isReturned ? 'bg-amber-500' : 'bg-purple-600'
              }`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 truncate">
            Status: <strong className="text-slate-800">{workflowStatus.replace('_', ' ')}</strong>
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. RETURNED REVIEW ALERT (If review has been returned with comments)      */}
      {/* ========================================================================= */}
      {isReturned && (
        <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border-2 border-amber-300 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <RotateCcw size={20} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-900 font-bold text-xs uppercase px-2.5 py-0.5 rounded-full border border-amber-300">
                    Review Returned for Revision
                  </span>
                  <span className="text-xs text-slate-500">
                    Your reviewer requested modifications
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  Reviewer Comments & Feedback:
                </h4>
                <p className="text-xs sm:text-sm text-slate-800 bg-white/80 p-3.5 rounded-xl border border-amber-200 font-medium leading-relaxed italic">
                  "{reviewerComments || 'Please provide additional supporting evidence links and expand your technical achievements reflection before final submission.'}"
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateToTab('self-review')}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>Make Corrections & Resubmit</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. WORKFLOW STATUS & VISUAL PROGRESS TIMELINE                             */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Quarterly Review Workflow
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-600 font-medium">
                {currentQuarter.name}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              Review Status Tracking & Reviewer Handoff
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500">Current Status:</span>
            <span
              className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                workflowStatus === 'PUBLISHED'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : workflowStatus === 'UNDER_REVIEW'
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : workflowStatus === 'SUBMITTED'
                  ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                  : workflowStatus === 'RETURNED'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-purple-100 text-purple-800 border-purple-300'
              }`}
            >
              {workflowStatus.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* 5-Step Horizontal Workflow Tracker */}
        <div className="relative pt-2 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 relative z-10">
            {WORKFLOW_STEPS.map((s, idx) => {
              const st = getStepStatus(s.key);
              const isCompleted = st === 'COMPLETED';
              const isActive = st === 'ACTIVE';
              const isReturnedStep = st === 'ACTIVE_RETURNED';

              return (
                <div
                  key={s.key}
                  className={`p-3.5 rounded-xl border text-center transition-all ${
                    isActive
                      ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/20 shadow-xs'
                      : isReturnedStep
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-slate-50/70 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-center mb-1.5">
                    {isCompleted ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                        <Check size={14} />
                      </div>
                    ) : isActive ? (
                      <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold animate-pulse">
                        {idx + 1}
                      </div>
                    ) : isReturnedStep ? (
                      <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">
                        !
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <h5 className="text-xs font-bold text-slate-800">
                    {s.label}
                  </h5>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {isCompleted ? 'Finished' : isActive ? 'Current Stage' : isReturnedStep ? 'Returned' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Context Guidance Footer */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Info size={16} className="text-purple-600 shrink-0" />
            <span>
              {workflowStatus === 'SUBMITTED' || workflowStatus === 'UNDER_REVIEW'
                ? 'Your self-review is locked while your assigned mentor conducts calibration.'
                : workflowStatus === 'RETURNED'
                ? 'Your reviewer has returned your self-assessment. Review comments above and resubmit.'
                : workflowStatus === 'PUBLISHED'
                ? 'Your performance evaluation is finalized and published. View your report in Feedback.'
                : 'Self-review must be completed and submitted before moving to your mentor.'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {workflowStatus === 'PUBLISHED' ? (
              <button
                onClick={() => onNavigateToTab('feedback')}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
              >
                <span>View Final Feedback</span>
                <ChevronRight size={13} />
              </button>
            ) : (
              <button
                onClick={() => onNavigateToTab('self-review')}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
              >
                <span>Open Self-Review Workspace</span>
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN SPLIT: Competencies & Review (Left) vs Deadlines & JLPT (Right)   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: Required Competencies (lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Required Review Competencies</h3>
                  <p className="text-xs text-slate-500">Core dimensions rated in this quarter's evaluation</p>
                </div>
              </div>

              <button
                onClick={() => onNavigateToTab('quarters')}
                className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
              >
                <span>View All Details</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {requiredCompetencies.map((comp) => (
                <div
                  key={comp.id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-purple-200 transition-all space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full">
                        Weight: {comp.weight}%
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {comp.subCompetencies.length} Sub-competencies
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      {comp.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {comp.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 font-medium">Scale: 1.0 – 5.0</span>
                    <button
                      onClick={() => onNavigateToTab('self-review')}
                      className="text-purple-700 font-bold hover:underline cursor-pointer"
                    >
                      Rate in Review →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Upcoming Deadlines & JLPT Eligibility */}
        <div className="space-y-6">
          {/* Upcoming Review Deadlines */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Upcoming Review Deadlines</h4>
                <p className="text-[11px] text-slate-500">Key submission dates & cutoffs</p>
              </div>
            </div>

            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-2.5">
                {upcomingDeadlines.map((dl) => (
                  <div
                    key={dl.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <h5 className="font-bold text-slate-800 truncate" title={dl.title}>
                        {dl.title}
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Due: {new Date(dl.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        dl.status === 'OVERDUE'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : dl.status === 'DUE_TODAY'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}
                    >
                      {dl.daysLeft < 0 ? `${Math.abs(dl.daysLeft)}d overdue` : dl.daysLeft === 0 ? 'Due Today' : `${dl.daysLeft}d left`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                No immediate deadlines pending.
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* JLPT / Examination Eligibility Section (Separate from Score)              */}
          {/* ========================================================================= */}
          {jlpt?.enabled && (
            <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/60 rounded-2xl border border-indigo-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-indigo-950">
                      Examination Eligibility
                    </h4>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                      JLPT & Cohort Gate
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    jlpt.status === 'Cleared'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                  }`}
                >
                  {jlpt.status || 'Eligible'}
                </span>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-indigo-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Exam Level:</span>
                  <span className="font-bold text-slate-900">{jlpt.level || 'JLPT N5'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Cleared Score:</span>
                  <span className="font-bold text-emerald-700">{jlpt.score || '118/180 (Passed)'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Verification:</span>
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    {jlpt.verificationStatus || 'VERIFIED'}
                  </span>
                </div>
              </div>

              {jlpt.requirements && jlpt.requirements.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-indigo-900 block">
                    Cohort Gate Requirements:
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-600">
                    {jlpt.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Check size={12} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[10px] text-indigo-700/80 pt-1 border-t border-indigo-100 italic">
                * Note: Examination eligibility is tracked independently from your performance competency score.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InternOverviewTab;
