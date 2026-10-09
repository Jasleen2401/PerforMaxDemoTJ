import React, { useState } from 'react';
import {
  Trophy, Target, Clock, ClipboardList, User, Award,
  Sparkles, Calendar, ChevronRight, Sliders, CheckCircle2,
  AlertCircle, ExternalLink, ArrowRight, ShieldCheck, Compass,
  Lock, Check, FileText, Bell, RefreshCw
} from 'lucide-react';
import type {
  InternOverviewData,
  InternScorecardResponse,
  InternMentorInfo,
  InternCycleInfo,
  InternPublishedResults,
  InternJourneyData,
  InternGoalItem,
  InternTaskItem
} from '../../features/dashboard/dashboardTypes';
import DashboardStatCard from '../dashboard/DashboardStatCard';
import { toast } from 'react-toastify';

export interface InternOverviewTabProps {
  overviewData?: InternOverviewData;
  journeyData?: InternJourneyData;
  goals?: InternGoalItem[];
  tasks?: InternTaskItem[];
  myNotifications?: any[];
  isLoading: boolean;
  onNavigateToTab: (tab: string) => void;
  onRefresh: () => void;
  onUpdateProgress?: (goalId: string, progress: number, comment?: string) => Promise<any>;
  onCompleteTask?: (payload: {
    id: string;
    isCompleted: boolean;
    completedAt?: string;
    hoursSpent?: number;
    completionNotes?: string;
    artifactUrl?: string;
  }) => Promise<any>;
  onOpenEvidenceModal?: (goalId: string) => void;
}

export const InternOverviewTab: React.FC<InternOverviewTabProps> = ({
  overviewData,
  journeyData,
  goals = [],
  tasks = [],
  myNotifications = [],
  isLoading,
  onNavigateToTab,
  onRefresh,
  onUpdateProgress,
  onCompleteTask,
  onOpenEvidenceModal,
}) => {
  const [showWeightDetails, setShowWeightDetails] = useState(false);
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);
  const [goalSliderValues, setGoalSliderValues] = useState<Record<string, number>>({});
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  const scorecard = overviewData?.personalScorecard;
  const mentor = overviewData?.mentor;
  const cycle = overviewData?.cycle;
  const deadlines = overviewData?.deadlines || [];
  const publishedResults = overviewData?.publishedResults;
  const isPublished = Boolean(publishedResults?.isPublished);

  const weightDist = publishedResults?.weightDistribution || scorecard?.weightDistribution || {
    goals_and_kpis: 40,
    manager_evaluation: 40,
    self_assessment: 20
  };

  const evalParams = publishedResults?.evaluationParameters || scorecard?.evaluationParameters || [];

  // Goal & Task metrics (100% authentic)
  const totalGoals = scorecard?.totalGoals ?? goals.length;
  const completedGoals = scorecard?.completedGoals ?? goals.filter(g => (g.completionPercentage ?? g.progress ?? 0) >= 100 || g.status === 'COMPLETED').length;
  const avgGoalProgress = scorecard?.averageProgress ?? (totalGoals > 0 ? goals.reduce((acc, g) => acc + (g.completionPercentage ?? g.progress ?? 0), 0) / totalGoals : 0);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.isCompleted || t.status === 'COMPLETED').length;
  const pendingTasks = totalTasks - completedTasks;

  // Pending Actions Calculation
  const selfEvalSubmitted = journeyData?.stats?.selfEvaluationSubmitted ?? false;
  const pendingSelfEvalCount = selfEvalSubmitted ? 0 : 1;
  const overdueDeadlinesCount = deadlines.filter(d => d.daysLeft < 0).length;
  const pendingActionsCount = pendingTasks + pendingSelfEvalCount + overdueDeadlinesCount;

  // Milestone trajectory calculation from journeyData
  const milestones = journeyData?.milestones || [];
  const overallProgressPercent = journeyData?.overallProgressPercent ?? Math.round(avgGoalProgress);
  const currentStage = journeyData?.currentStage ?? (isPublished ? 5 : 2);
  const currentMilestone = milestones.find(m => m.stage === currentStage) || milestones[1];

  // Quick Goal Progress Update Handler
  const handleQuickSaveProgress = async (goal: InternGoalItem) => {
    if (!onUpdateProgress) return;
    const val = goalSliderValues[goal.id] ?? goal.completionPercentage ?? goal.progress ?? 0;
    try {
      setUpdatingGoalId(goal.id);
      await onUpdateProgress(goal.id, val);
      toast.success(val === 100 ? 'Goal marked as 100% completed!' : `Progress updated to ${val}%.`);
      onRefresh();
    } catch {
      toast.error('Failed to update progress.');
    } finally {
      setUpdatingGoalId(null);
    }
  };

  // Quick Task Complete Toggle Handler
  const handleToggleTask = async (task: InternTaskItem) => {
    if (!onCompleteTask) return;
    try {
      setTogglingTaskId(task.id);
      const nextStatus = !task.isCompleted;
      await onCompleteTask({
        id: task.id,
        isCompleted: nextStatus,
        completedAt: nextStatus ? new Date().toISOString() : undefined,
      });
      toast.success(nextStatus ? 'Task completed successfully!' : 'Task marked as in progress.');
      onRefresh();
    } catch {
      toast.error('Failed to update task status.');
    } finally {
      setTogglingTaskId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-slate-100 rounded-2xl border border-slate-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl border border-slate-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-slate-100 rounded-2xl lg:col-span-2 border border-slate-200" />
          <div className="h-96 bg-slate-100 rounded-2xl border border-slate-200" />
        </div>
      </div>
    );
  }

  const scoreDisplay = isPublished && publishedResults?.overallScore !== null
    ? `${publishedResults.overallScore.toFixed(1)} / 100`
    : 'Pending Publication';

  const classificationDisplay = isPublished && publishedResults?.classification
    ? publishedResults.classification
    : (cycle?.currentPhase || 'Cycle in progress');

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. MIRAI JOURNEY ROADMAP CARD (Reference 1 Visual Guide)                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-purple-100/90 p-5 sm:p-6 shadow-xs relative overflow-hidden transition-all duration-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-purple-50 text-purple-700 font-bold text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-purple-200">
                {journeyData?.cycle?.name || 'MIRAI Cohort 1'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Milestone Trajectory
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <Compass className="text-purple-600 shrink-0" size={22} />
              MIRAI Internship Journey
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Current Focus: <span className="font-semibold text-slate-800">{currentMilestone?.title || 'Quarterly Goal Alignment'}</span>
              {currentMilestone?.category ? ` • ${currentMilestone.category}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[11px] text-slate-500 font-medium">Overall Roadmap Progress</span>
              <span className="text-xl font-extrabold text-purple-700">{overallProgressPercent}%</span>
            </div>
            <button
              onClick={() => onNavigateToTab('journey')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              <span>View Full Journey</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Overall Smooth Progress Bar */}
        <div className="py-3">
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              style={{ width: `${overallProgressPercent}%` }}
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500"
            />
          </div>
        </div>

        {/* Milestone Steps Sequence (Dynamic Real Data - 4 Quarters) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {journeyData?.quarters && journeyData.quarters.length > 0 ? (
            journeyData.quarters.map((q) => {
              const isCurrent = q.quarterCode === (journeyData.currentQuarter || 'Q1');
              const isCompleted = q.status === 'COMPLETED';
              const isInProgress = q.status === 'IN_PROGRESS';

              return (
                <div
                  key={q.id || q.quarterCode}
                  onClick={() => onNavigateToTab('journey')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer hover:shadow-xs ${
                    isCurrent
                      ? 'bg-purple-50/70 border-purple-300 ring-1 ring-purple-400/30 shadow-2xs'
                      : isCompleted
                      ? 'bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50/70'
                      : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                      {q.quarterCode}
                    </span>
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={11} /> Cleared
                      </span>
                    ) : isInProgress ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-100/90 px-2 py-0.5 rounded-full">
                        <Clock size={11} className="animate-spin" style={{ animationDuration: '4s' }} /> Active
                      </span>
                    ) : !q.prerequisitesMet ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                        Prereq Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                        Not Started
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 truncate" title={q.title}>
                    {q.title}
                  </h4>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Progress</span>
                    <span className="font-bold text-purple-700">{q.completionPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden mt-1">
                    <div 
                      className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-purple-600'}`}
                      style={{ width: `${q.completionPercentage}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : milestones.length > 0 ? (
            milestones.map((m) => {
              const isCurrent = m.stage === currentStage;
              const isCompleted = m.status === 'COMPLETED';
              const isInProgress = m.status === 'IN_PROGRESS';

              return (
                <div
                  key={m.stage}
                  onClick={() => onNavigateToTab('journey')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-purple-50/70 border-purple-300 ring-1 ring-purple-400/30 shadow-2xs'
                      : isCompleted
                      ? 'bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50/70'
                      : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Stage {m.stage}
                    </span>
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded-full">
                        <CheckCircle2 size={11} /> Done
                      </span>
                    ) : isInProgress ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-100/90 px-1.5 py-0.2 rounded-full">
                        <Clock size={11} className="animate-spin" style={{ animationDuration: '4s' }} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-200/60 px-1.5 py-0.2 rounded-full">
                        Upcoming
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 truncate" title={m.title}>
                    {m.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {m.category}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-2 text-center text-xs text-slate-500">
              Active Performance Cycle: <span className="font-semibold">{cycle?.name || 'Active Internship Cohort'}</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMMARY METRICS (4 White Cards with Subtle Borders)                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard
          title="Active Goals"
          value={totalGoals}
          subtitle={`${completedGoals} completed • ${avgGoalProgress.toFixed(0)}% progress`}
          color="indigo"
          icon={<Target size={20} />}
          onClick={() => onNavigateToTab('goals')}
        />

        <DashboardStatCard
          title="Tasks Completed"
          value={`${completedTasks} / ${totalTasks}`}
          subtitle={`${pendingTasks} sprint tasks pending`}
          color="orange"
          icon={<ClipboardList size={20} />}
          onClick={() => onNavigateToTab('tasks')}
        />

        <DashboardStatCard
          title="Performance Status"
          value={scoreDisplay}
          subtitle={classificationDisplay}
          color={isPublished ? "green" : "purple"}
          icon={isPublished ? <Trophy size={20} /> : <ShieldCheck size={20} />}
          onClick={() => onNavigateToTab(isPublished ? 'results' : 'evaluation')}
        />

        <DashboardStatCard
          title="Pending Actions"
          value={pendingActionsCount}
          subtitle={`${pendingTasks} tasks, ${overdueDeadlinesCount} overdue cutoffs`}
          color={pendingActionsCount > 0 ? "red" : "green"}
          icon={<AlertCircle size={20} />}
          onClick={() => {
            if (pendingTasks > 0) onNavigateToTab('tasks');
            else if (!selfEvalSubmitted) onNavigateToTab('evaluation');
            else onNavigateToTab('goals');
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT SPLIT (2 COLUMNS: Goals/Tasks Left, Review/Activity Right) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: Goals & Tasks (lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Goals & Milestones */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Active Goals & Milestones</h3>
                  <p className="text-xs text-slate-500">Measurable KRAs assigned by mentor</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('goals')}
                className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
              >
                <span>View All Goals</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {goals.length > 0 ? (
              <div className="space-y-3.5">
                {goals.slice(0, 3).map((goal) => {
                  const currentProg = goalSliderValues[goal.id] ?? goal.completionPercentage ?? goal.progress ?? 0;
                  const isCompleted = currentProg >= 100 || goal.status === 'COMPLETED';

                  return (
                    <div
                      key={goal.id}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                              {goal.priority || 'MEDIUM'}
                            </span>
                            {goal.category && (
                              <span className="text-[10px] font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                {goal.category}
                              </span>
                            )}
                            <span className="text-[11px] font-semibold text-slate-500">
                              Weight: {goal.weight || 20}%
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {goal.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {onOpenEvidenceModal && (
                            <button
                              onClick={() => onOpenEvidenceModal(goal.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Attach PR or document evidence"
                            >
                              <FileText size={12} />
                              <span>Evidence</span>
                            </button>
                          )}
                          <span
                            className={`text-xs font-extrabold px-2 py-0.5 rounded-lg ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {currentProg}%
                          </span>
                        </div>
                      </div>

                      {/* Progress Slider & Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={currentProg}
                            onChange={(e) =>
                              setGoalSliderValues((prev) => ({
                                ...prev,
                                [goal.id]: parseInt(e.target.value, 10),
                              }))
                            }
                            className="w-full accent-purple-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                          />
                          {goalSliderValues[goal.id] !== undefined &&
                            goalSliderValues[goal.id] !== (goal.completionPercentage ?? goal.progress ?? 0) && (
                              <button
                                onClick={() => handleQuickSaveProgress(goal)}
                                disabled={updatingGoalId === goal.id}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-md transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                              >
                                {updatingGoalId === goal.id ? 'Saving...' : 'Save'}
                              </button>
                            )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Due: {goal.dueDate ? goal.dueDate.split('T')[0] : 'End of Cycle'}
                          </span>
                          <span>{isCompleted ? '✓ Completed' : 'In Progress'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <Target size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No active goals configured</p>
                <p className="text-xs">Your mentor will configure your quarterly goals shortly.</p>
              </div>
            )}
          </div>

          {/* Assigned Sprint Tasks */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Sprint Tasks & Action Items</h3>
                  <p className="text-xs text-slate-500">Direct technical execution tickets</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('tasks')}
                className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
              >
                <span>View All Tasks</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {tasks.length > 0 ? (
              <div className="space-y-2.5">
                {tasks.slice(0, 4).map((task) => {
                  const isDone = task.isCompleted || task.status === 'COMPLETED';

                  return (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        isDone
                          ? 'bg-slate-50/60 border-slate-200/60 text-slate-500'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task)}
                          disabled={togglingTaskId === task.id}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                            isDone
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 hover:border-purple-600 bg-white'
                          }`}
                          title={isDone ? 'Mark in progress' : 'Mark completed'}
                        >
                          {isDone && <Check size={13} strokeWidth={3} />}
                        </button>
                        <div className="min-w-0">
                          <p
                            className={`text-xs sm:text-sm font-semibold truncate ${
                              isDone ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                            {task.category && (
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px] font-medium">
                                {task.category}
                              </span>
                            )}
                            {task.priority && (
                              <span className="text-[10px] font-bold text-amber-700">
                                {task.priority}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="flex items-center gap-1">
                                <Clock size={11} /> Due: {task.dueDate.split('T')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {task.hoursSpent ? (
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 shrink-0">
                          {task.hoursSpent}h spent
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400">
                <ClipboardList size={28} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">No sprint tasks assigned</p>
                <p className="text-[11px]">Tasks assigned by your engineering manager will appear here.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Review Card + Recent Activity (lg:col-span-1) */}
        <div className="space-y-6">
          {/* Performance Review Card (Respects Strict Privacy Gating) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="text-purple-600" size={18} />
                <h3 className="text-sm font-bold text-slate-900">Performance Review</h3>
              </div>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                {cycle?.name || 'Active Cycle'}
              </span>
            </div>

            {isPublished && publishedResults?.overallScore !== null ? (
              // PUBLISHED RESULT STATE
              <div className="space-y-3.5">
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    Official Calibrated Result
                  </span>
                  <div className="text-3xl font-extrabold text-emerald-950 pt-1">
                    {publishedResults.overallScore.toFixed(1)} <span className="text-base text-emerald-700 font-semibold">/ 100</span>
                  </div>
                  <p className="text-xs font-bold text-emerald-800">
                    {publishedResults.classification || 'Outstanding Contributor'}
                  </p>
                </div>

                {publishedResults.reviewerComments && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Reviewer Feedback
                    </span>
                    <p className="text-xs text-slate-700 italic line-clamp-3">
                      "{publishedResults.reviewerComments}"
                    </p>
                  </div>
                )}

                <button
                  onClick={() => onNavigateToTab('results')}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span>View Full Scorecard & Calibration</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              // PRIVACY SHIELD: LOCKED / UNPUBLISHED STATE
              <div className="space-y-3.5">
                <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/70 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-white border border-purple-200 text-purple-700 mx-auto flex items-center justify-center shadow-2xs">
                    <Lock size={18} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Evaluation Results Locked
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Manager evaluations and calibrated scores are strictly confidential until released by HR.
                  </p>
                </div>

                {/* Lifecycle Checklist */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600">Self-Appraisal</span>
                    <span className={`font-bold text-[11px] ${selfEvalSubmitted ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {selfEvalSubmitted ? 'Submitted ✓' : 'Pending Action'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600">Mentor Evaluation</span>
                    <span className="font-semibold text-[11px] text-slate-500">
                      Confidential
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600">HR Committee Release</span>
                    <span className="font-semibold text-[11px] text-purple-700">
                      Pending Publication
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateToTab('evaluation')}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span>{selfEvalSubmitted ? 'Review Your Submission' : 'Complete Self-Appraisal'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Recent Activity & Reminders (100% Real Database Notifications & Deadlines) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="text-purple-600" size={18} />
                <h3 className="text-sm font-bold text-slate-900">Recent Activity & Reminders</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {deadlines.length} Cutoffs
              </span>
            </div>

            {/* Notifications Feed */}
            {myNotifications && myNotifications.length > 0 ? (
              <div className="space-y-2">
                {myNotifications.slice(0, 3).map((notif: any) => (
                  <div key={notif.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{notif.title}</span>
                      <span className="text-[10px] text-slate-400">
                        {notif.created_at ? notif.created_at.split('T')[0] : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">{notif.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2 text-center text-xs text-slate-400">
                <p>No unread notifications or alerts.</p>
              </div>
            )}

            {/* Upcoming Deadlines List */}
            {deadlines.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Upcoming Cutoffs
                </span>
                {deadlines.slice(0, 3).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <span className="text-slate-800 font-medium truncate max-w-[170px]" title={d.title}>
                      {d.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        d.daysLeft < 0
                          ? 'bg-rose-100 text-rose-800'
                          : d.daysLeft <= 3
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {d.daysLeft < 0 ? `${Math.abs(d.daysLeft)}d overdue` : `${d.daysLeft}d left`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Mentor Info */}
          {mentor && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 font-bold text-sm flex items-center justify-center shrink-0">
                {mentor.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || <User size={18} />}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Direct Mentor
                </span>
                <h4 className="text-xs font-bold text-slate-900 truncate">{mentor.name}</h4>
                <p className="text-[11px] text-purple-700 truncate">{mentor.designation}</p>
              </div>
            </div>
          )}

          {/* Evaluation Score Weight Distribution (Collapsible Drawer) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Scoring Weight Distribution</span>
              <button
                onClick={() => setShowWeightDetails(!showWeightDetails)}
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-800 cursor-pointer"
              >
                {showWeightDetails ? 'Hide' : 'View'}
              </button>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full flex overflow-hidden gap-0.5">
              <div style={{ width: `${weightDist.goals_and_kpis}%` }} className="bg-indigo-500 rounded-full" title={`Goals: ${weightDist.goals_and_kpis}%`} />
              <div style={{ width: `${weightDist.manager_evaluation}%` }} className="bg-emerald-500 rounded-full" title={`Mentor: ${weightDist.manager_evaluation}%`} />
              <div style={{ width: `${weightDist.self_assessment}%` }} className="bg-purple-500 rounded-full" title={`Self: ${weightDist.self_assessment}%`} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
              <span>Goals ({weightDist.goals_and_kpis}%)</span>
              <span>Mentor ({weightDist.manager_evaluation}%)</span>
              <span>Self ({weightDist.self_assessment}%)</span>
            </div>

            {showWeightDetails && evalParams.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                {evalParams.map((param) => (
                  <div key={param.id} className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-700">{param.name}</span>
                    <span className="font-bold text-purple-700">{param.weight}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternOverviewTab;
