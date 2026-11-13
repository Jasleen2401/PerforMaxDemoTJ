// src/pages/instructor/JapaneseInstructorDashboard.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  BookOpen,
  Award,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Calendar,
  Languages,
  RefreshCw,
  ShieldAlert,
  Layers,
  MessageSquare,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  useGetJapaneseDashboardQuery,
  useGetJapaneseInternsQuery,
} from "../../features/japanese/japaneseApi";
import { ConductJapaneseEvaluationModal } from "../../components/instructor/ConductJapaneseEvaluationModal";
import { CreateLearningPlanModal } from "../../components/instructor/CreateLearningPlanModal";
import { RecordJLPTAttemptModal } from "../../components/instructor/RecordJLPTAttemptModal";
import type { JapaneseEvaluation } from "../../features/japanese/types";

export const JapaneseInstructorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: dashboardData, isLoading, error, refetch } = useGetJapaneseDashboardQuery();
  const { data: internsList = [] } = useGetJapaneseInternsQuery();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEval, setSelectedEval] = useState<JapaneseEvaluation | null>(null);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isJlptModalOpen, setIsJlptModalOpen] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Dashboard data refreshed.");
    } catch {
      toast.error("Failed to refresh dashboard.");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleOpenEvaluation = (evalId: string) => {
    navigate(`/japanese/evaluations?evaluationId=${evalId}`);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center animate-pulse space-y-3">
        <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto" />
        <p className="text-sm font-semibold text-gray-500">Loading Japanese Instructor Workspace...</p>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl max-w-xl mx-auto my-12">
        <AlertTriangle className="text-rose-600 mx-auto mb-3" size={32} />
        <h3 className="text-base font-bold text-rose-900">Failed to load Japanese dashboard</h3>
        <p className="text-xs text-rose-700 mt-1 mb-4">
          Unable to retrieve instructor metrics. Please verify network or authentication.
        </p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { overview, evaluations_summary, returned_evaluations, jlpt_summary, pending_actions, upcoming_deadlines, activeCycle } = dashboardData;

  const internsDropdown = internsList.map((i) => ({
    id: i.id,
    fullName: i.fullName,
    employeeCode: i.employeeCode,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Title & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-linear-to-r from-blue-900 via-indigo-900 to-purple-900 p-7 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 opacity-10 pointer-events-none select-none">
          <Languages size={240} />
        </div>
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-purple-200 text-[11px] font-bold tracking-wider uppercase backdrop-blur-xs">
              Japanese Language Program
            </span>
            <span className="text-xs text-purple-200/80">• {activeCycle.name}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Sensei Command Center
          </h1>
          <p className="text-xs text-purple-200 max-w-xl leading-relaxed">
            Curriculum management, daily practice evaluation, JLPT eligibility tracking, and performance appraisal evaluations.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setIsPlanModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-blue-900 hover:bg-blue-50 text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <BookOpen size={14} />
            New Learning Plan
          </button>
        </div>
      </div>

      {/* Urgent Action Banner: Returned Evaluations */}
      {returned_evaluations && returned_evaluations.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldAlert size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-950">
                  Action Required: Evaluation Returned by HR ({returned_evaluations.length})
                </h3>
                <p className="text-xs text-rose-700">
                  HR requested revisions on the following evaluation before final appraisal calibration.
                </p>
              </div>
            </div>
            <Link
              to="/japanese/evaluations?status=RETURNED"
              className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1"
            >
              View All Returned <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {returned_evaluations.map((ev) => (
              <div
                key={ev.id}
                className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-gray-900 text-sm">{ev.internName}</div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 uppercase">
                      {ev.internCode}
                    </span>
                  </div>
                  <div className="mt-1.5 p-2.5 rounded-xl bg-rose-50/70 border border-rose-100 text-xs text-rose-900">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-rose-600 block mb-0.5">
                      HR Feedback:
                    </span>
                    {ev.returnReason || "Please review and revise competencies."}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    onClick={() => handleOpenEvaluation(ev.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <FileCheck size={14} />
                    Revise & Resubmit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Assigned Batches
            </span>
            <div className="text-2xl font-black text-gray-900">
              {overview.assignedBatches ?? dashboardData.batches?.length ?? 2}
            </div>
            <Link
              to="/japanese/batches"
              className="text-[11px] font-semibold text-purple-600 hover:underline inline-flex items-center gap-1"
            >
              View Batches <ArrowRight size={11} />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Layers size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Interns
            </span>
            <div className="text-2xl font-black text-gray-900">{overview.totalInterns}</div>
            <Link
              to="/japanese/batches"
              className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Assigned Interns <ArrowRight size={11} />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Pending Evaluations
            </span>
            <div className="text-2xl font-black text-gray-900">
              {overview.pendingEvaluations ?? (evaluations_summary.pending + evaluations_summary.draft + evaluations_summary.returned)}
            </div>
            <Link
              to="/japanese/evaluations"
              className="text-[11px] font-semibold text-rose-600 hover:underline inline-flex items-center gap-1"
            >
              {evaluations_summary.returned} returned by HR <ArrowRight size={11} />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <ClipboardCheck size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Learning Progress
            </span>
            <div className="text-2xl font-black text-gray-900">
              {overview.avgProgress}%
            </div>
            <div className="text-[11px] text-gray-500">
              {overview.reviewedExercises} of {overview.totalExercises} reviewed
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp size={22} />
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Queue & JLPT Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Urgent Action Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Tasks & Submissions Feed */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Action Queue & Notifications</h2>
                <p className="text-xs text-gray-500">Submissions, verifications, and evaluation items requiring action</p>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {pending_actions.length} Pending
              </span>
            </div>

            {pending_actions.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
                All pending actions are completed!
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pending_actions.map((act, idx) => (
                  <div key={idx} className="py-3.5 flex items-start justify-between gap-3 group">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          act.severity === "HIGH"
                            ? "bg-rose-100 text-rose-700"
                            : act.severity === "MEDIUM"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {act.type === "RETURNED_EVALUATION" ? (
                          <AlertTriangle size={16} />
                        ) : act.type === "JLPT_VERIFICATION" ? (
                          <Award size={16} />
                        ) : (
                          <FileCheck size={16} />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-xs group-hover:text-blue-600 transition-colors">
                          {act.title}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{act.description}</p>
                      </div>
                    </div>
                    <Link
                      to={act.link}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 shrink-0"
                    >
                      Handle
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <button
              onClick={() => navigate("/japanese/batches")}
              className="p-4 rounded-2xl bg-white border border-gray-200/80 hover:border-purple-300 hover:shadow-xs text-left transition-all cursor-pointer"
            >
              <Layers className="text-purple-600 mb-2" size={20} />
              <div className="font-bold text-gray-900 text-xs">Training Batches</div>
              <p className="text-[11px] text-gray-500 mt-0.5">Assigned intern cohorts</p>
            </button>

            <button
              onClick={() => navigate("/japanese/evaluations")}
              className="p-4 rounded-2xl bg-white border border-gray-200/80 hover:border-blue-300 hover:shadow-xs text-left transition-all cursor-pointer"
            >
              <ClipboardCheck className="text-blue-600 mb-2" size={20} />
              <div className="font-bold text-gray-900 text-xs">Evaluations</div>
              <p className="text-[11px] text-gray-500 mt-0.5">Language competency scores</p>
            </button>

            <button
              onClick={() => navigate("/japanese/jlpt")}
              className="p-4 rounded-2xl bg-white border border-gray-200/80 hover:border-indigo-300 hover:shadow-xs text-left transition-all cursor-pointer"
            >
              <Award className="text-indigo-600 mb-2" size={20} />
              <div className="font-bold text-gray-900 text-xs">JLPT Tracking</div>
              <p className="text-[11px] text-gray-500 mt-0.5">Official exam verifications</p>
            </button>

            <button
              onClick={() => navigate("/japanese/feedback")}
              className="p-4 rounded-2xl bg-white border border-gray-200/80 hover:border-emerald-300 hover:shadow-xs text-left transition-all cursor-pointer"
            >
              <MessageSquare className="text-emerald-600 mb-2" size={20} />
              <div className="font-bold text-gray-900 text-xs">Feedback</div>
              <p className="text-[11px] text-gray-500 mt-0.5">Developmental coaching</p>
            </button>
          </div>
        </div>

        {/* Right Column: JLPT Status Overview & Upcoming Deadlines */}
        <div className="space-y-6">
          {/* JLPT Cohort Eligibility Status */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">JLPT Eligibility Matrix</h3>
                <p className="text-[11px] text-gray-500">Cohort certification readiness</p>
              </div>
              <Link to="/japanese/jlpt" className="text-xs text-blue-600 font-semibold hover:underline">
                Details
              </Link>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 text-emerald-900">
                <span className="font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Meets Requirement
                </span>
                <span className="text-base font-black">{jlpt_summary.meetsRequirement}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 text-amber-900">
                <span className="font-bold flex items-center gap-2">
                  <Clock size={16} className="text-amber-600" />
                  Pending Verification
                </span>
                <span className="text-base font-black">{jlpt_summary.pendingVerification}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 text-blue-900">
                <span className="font-bold flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-600" />
                  In Progress (Studying)
                </span>
                <span className="text-base font-black">{jlpt_summary.inProgress}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 text-gray-700">
                <span className="font-semibold flex items-center gap-2">
                  <Clock size={16} className="text-gray-400" />
                  Not Started
                </span>
                <span className="text-base font-bold">{jlpt_summary.notStarted}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 text-[11px] text-purple-900 leading-relaxed">
              <strong>Policy Note:</strong> JLPT eligibility is tracked separately from the 60/40 cycle evaluation scores, acting as a gateway milestone for MIRAI progression.
            </div>
          </div>

          {/* Upcoming Curriculum Milestones */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Upcoming Target Dates</h3>
                <p className="text-[11px] text-gray-500">Plan completion deadlines</p>
              </div>
              <Calendar size={16} className="text-gray-400" />
            </div>

            {upcoming_deadlines.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-xs italic">
                No upcoming target deadlines configured.
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming_deadlines.map((dl) => (
                  <div key={dl.id} className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900 text-xs">{dl.internName}</div>
                      <div className="text-[11px] text-gray-500">{dl.title}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {dl.targetLevel}
                      </span>
                      <div className="text-[10px] text-gray-500 mt-1">{dl.targetDate}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isPlanModalOpen && (
        <CreateLearningPlanModal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          interns={internsDropdown}
          defaultCycleId={activeCycle.id || undefined}
        />
      )}

      {isJlptModalOpen && (
        <RecordJLPTAttemptModal
          isOpen={isJlptModalOpen}
          onClose={() => setIsJlptModalOpen(false)}
          interns={internsDropdown}
        />
      )}

      {isEvalModalOpen && (
        <ConductJapaneseEvaluationModal
          isOpen={isEvalModalOpen}
          onClose={() => {
            setIsEvalModalOpen(false);
            setSelectedEval(null);
          }}
          evaluation={selectedEval}
          cycleId={activeCycle.id || undefined}
        />
      )}
    </div>
  );
};

export default JapaneseInstructorDashboard;
