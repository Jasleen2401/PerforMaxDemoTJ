import React, { useState, useMemo } from 'react';
import { useGetDepartmentsQuery } from '../../features/org/departmentApi';
import { useGetEmployeesQuery } from '../../features/employee/employeeapi';
import { 
  useGetPerformanceHistoryByEmployeeQuery, 
  useGetAllPerformanceHistoryQuery,
  useGetPerformancePulseQuery,
  useGetMeetingPulseQuery,
  useGetDepartmentBenchmarksQuery,
  useGetGoalsPulseOverlayQuery
} from '../../features/continuous/continuousApi';
import type { 
  DepartmentBenchmarksResponse, 
  DepartmentBenchmarkItem,
  GoalsPulseOverlayResponse 
} from '../../features/continuous/continuousTypes';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { 
  Activity, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  RotateCcw, 
  Download, 
  FileSpreadsheet, 
  FileText,
  Filter,
  Users,
  Calendar,
  AlertCircle,
  Target
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MonthData {
  name: string;
  month: number;
  year: number;
  praise: number;
  improvement: number;
  warning: number;
  meetings: number;
  actionItemsCompleted: number;
  totalActionItems: number;
  goalProgress?: number;
  goalTotal?: number;
  goalCompleted?: number;
}

// ─── 1. Activity Snapshot Component ──────────────────────────────────────────

interface ActivitySnapshotProps {
  totalInteractions: number;
  praiseCount: number;
  improvementCount: number;
  correctionCount: number;
  taskCompleted: number;
  taskTotal: number;
  isLoading: boolean;
}

const ActivitySnapshot = ({
  totalInteractions,
  praiseCount,
  improvementCount,
  correctionCount,
  taskCompleted,
  taskTotal,
  isLoading
}: ActivitySnapshotProps) => {
  const totalFeedback = praiseCount + improvementCount + correctionCount;
  const praiseRate = totalFeedback > 0 ? Math.round((praiseCount / totalFeedback) * 100) : null;
  const taskDoneRate = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : null;

  const cards = [
    {
      label: 'Published Activity',
      value: totalInteractions,
      subtitle: totalInteractions > 0 ? 'Total published feedback & coaching events' : 'No recorded interactions',
      icon: <Activity size={18} className="text-purple-600" />,
      tone: 'bg-purple-50 border-purple-200/60 text-purple-700',
    },
    {
      label: 'Recognition (Praise)',
      value: praiseCount,
      subtitle: praiseRate !== null ? `${praiseRate}% of published feedback entries` : 'No recognition recorded',
      icon: <Award size={18} className="text-emerald-600" />,
      tone: 'bg-emerald-50 border-emerald-200/60 text-emerald-700',
    },
    {
      label: 'Coaching & Guidance',
      value: improvementCount + correctionCount,
      subtitle: totalFeedback > 0 ? `${improvementCount} improvement · ${correctionCount} correction` : 'No coaching feedback recorded',
      icon: <TrendingUp size={18} className="text-amber-600" />,
      tone: 'bg-amber-50 border-amber-200/60 text-amber-700',
    },
    {
      label: 'Action Item Completion',
      value: taskDoneRate !== null ? `${taskDoneRate}%` : 'N/A',
      subtitle: taskTotal > 0 ? `${taskCompleted} of ${taskTotal} tasks finalized` : 'No action items recorded',
      icon: <CheckCircle2 size={18} className="text-indigo-600" />,
      tone: 'bg-indigo-50 border-indigo-200/60 text-indigo-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[104px]"
        >
          {isLoading ? (
            <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  {c.label}
                </span>
                <span className={`p-1.5 rounded-lg border ${c.tone} shrink-0`}>
                  {c.icon}
                </span>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {c.value}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-1 truncate" title={c.subtitle}>
                  {c.subtitle}
                </p>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── 2. Historical Pulse Trends Chart ─────────────────────────────────────────

const HistoricalPulseChart = ({ 
  history, 
  employeeName, 
  filterType, 
  actionItems = [],
  timeRange = 6,
  onTimeRangeChange,
  showGoalOverlay = true,
  onToggleGoalOverlay,
  goalOverlayData,
}: { 
  history: any[]; 
  employeeName?: string; 
  filterType: string; 
  actionItems?: any[];
  timeRange?: number;
  onTimeRangeChange?: (range: 3 | 6 | 12) => void;
  showGoalOverlay?: boolean;
  onToggleGoalOverlay?: () => void;
  goalOverlayData?: GoalsPulseOverlayResponse;
}) => {
  const [showPraise, setShowPraise] = useState(true);
  const [showImprovement, setShowImprovement] = useState(true);
  const [showCorrection, setShowCorrection] = useState(true);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartData: MonthData[] = [];
  const now = new Date();
  
  for (let i = timeRange - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mMonth = d.getMonth();
    const mYear = d.getFullYear();

    const goalSlot = goalOverlayData?.monthlyOverlay?.find(
      gm => gm.month === mMonth && gm.year === mYear
    );

    chartData.push({
      name: months[mMonth],
      month: mMonth,
      year: mYear,
      praise: 0,
      improvement: 0,
      warning: 0,
      meetings: 0,
      actionItemsCompleted: 0,
      totalActionItems: 0,
      goalProgress: goalSlot ? goalSlot.averageProgress : undefined,
      goalTotal: goalSlot ? goalSlot.totalGoals : undefined,
      goalCompleted: goalSlot ? goalSlot.completedGoals : undefined
    });
  }

  const uniqueMeetingsPerMonth = new Map<string, Set<number | string>>();
  const uniqueFeedbacksPerMonth = new Map<string, Set<number | string>>();

  history.forEach(h => {
    if (!h.createdAt) return;
    const date = new Date(h.createdAt);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const monthData = chartData.find(m => m.month === date.getMonth() && m.year === date.getFullYear());
    
    if (monthData) {
      if (h.sourceType === 'MEETING') {
        if (!uniqueMeetingsPerMonth.has(monthKey)) uniqueMeetingsPerMonth.set(monthKey, new Set());
        const meetingSet = uniqueMeetingsPerMonth.get(monthKey)!;
        if (!meetingSet.has(h.sourceId)) {
          meetingSet.add(h.sourceId);
          monthData.meetings++;
        }
      } else if (h.sourceType === 'FEEDBACK') {
        if (!uniqueFeedbacksPerMonth.has(monthKey)) uniqueFeedbacksPerMonth.set(monthKey, new Set());
        const feedbackSet = uniqueFeedbacksPerMonth.get(monthKey)!;

        if (!feedbackSet.has(h.sourceId)) {
          feedbackSet.add(h.sourceId);
          const type: string = (h.feedbackType || '').toUpperCase();
          if (type === 'PRAISE' || type === 'POSITIVE') monthData.praise++;
          else if (type === 'IMPROVEMENT' || type === 'CONSTRUCTIVE') monthData.improvement++;
          else if (type === 'WARNING' || type === 'NEGATIVE') monthData.warning++;
          else monthData.improvement++;
        }
      }
    }
  });

  const nowMonth = now.getMonth();
  const nowYear = now.getFullYear();

  actionItems.forEach(ai => {
    let targetMonth: { month: number; year: number } | undefined;
    if (ai.dueDate) {
      const dueDate = new Date(ai.dueDate);
      const slot = chartData.find(m => m.month === dueDate.getMonth() && m.year === dueDate.getFullYear());
      if (slot) targetMonth = slot;
    }
    if (!targetMonth) {
      targetMonth = chartData.find(m => m.month === nowMonth && m.year === nowYear);
    }
    if (targetMonth) {
      (targetMonth as any).totalActionItems++;
    }

    if (ai.status === 'DONE' && ai.completedAt) {
      const completedDate = new Date(ai.completedAt);
      const monthData = chartData.find(m => m.month === completedDate.getMonth() && m.year === completedDate.getFullYear());
      if (monthData) {
        monthData.actionItemsCompleted++;
      }
    }
  });

  const isMeetingOnly = filterType === 'MEETING';
  const totalPublishedInChart = chartData.reduce(
    (acc, m) => acc + (isMeetingOnly ? m.meetings : m.praise + m.improvement + m.warning),
    0
  );

  const maxValue = isMeetingOnly
    ? Math.max(...chartData.map(m => Math.max(m.meetings, m.actionItemsCompleted)), 5)
    : Math.max(...chartData.flatMap(m => [showPraise ? m.praise : 0, showImprovement ? m.improvement : 0, showCorrection ? m.warning : 0]), 5);

  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            <h3 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">
              {isMeetingOnly ? 'Meeting Sync Frequency' : 'Historical Pulse Trends'}{employeeName ? `: ${employeeName}` : ''}
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isMeetingOnly
              ? 'Monthly 1-on-1 meeting frequency and action item completion.'
              : 'Monthly distribution of praise, constructive improvement, and correction.'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {onTimeRangeChange && (
            <select 
              value={timeRange} 
              onChange={(e) => onTimeRangeChange(Number(e.target.value) as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer transition-colors"
            >
              <option value={3}>Last 3 Months</option>
              <option value={6}>Last 6 Months</option>
              <option value={12}>Last 12 Months</option>
            </select>
          )}

          <div className="flex items-center gap-2">
            {!isMeetingOnly ? (
              <>
                <button
                  onClick={() => setShowPraise(!showPraise)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    showPraise
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 text-slate-400 border-slate-200/60 opacity-60'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Praise</span>
                </button>
                <button
                  onClick={() => setShowImprovement(!showImprovement)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    showImprovement
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-400 border-slate-200/60 opacity-60'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Improvement</span>
                </button>
                <button
                  onClick={() => setShowCorrection(!showCorrection)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    showCorrection
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-slate-50 text-slate-400 border-slate-200/60 opacity-60'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Correction</span>
                </button>
                {onToggleGoalOverlay && (
                  <button 
                    onClick={onToggleGoalOverlay} 
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      showGoalOverlay 
                        ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-2xs' 
                        : 'bg-slate-50 text-slate-400 border-slate-200/60 opacity-60'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                    <span>Goal Overlay</span>
                  </button>
                )}
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>1-on-1 Meetings</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Empty State vs SVG Trends */}
      {totalPublishedInChart === 0 && (!showGoalOverlay || !goalOverlayData?.monthlyOverlay?.length) ? (
        <div className="py-14 text-center space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100">
            <TrendingUp size={20} />
          </div>
          <p className="text-sm font-bold text-slate-800">No Published Feedback Trends in this Period</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Feedback trends across Praise, Improvement, and Correction will automatically plot here once published interactions occur within the selected date range.
          </p>
        </div>
      ) : (
        <div className="relative h-60 w-full pt-2">
          {/* Horizontal Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
            <div key={i} className="absolute w-full border-t border-slate-100 z-0" style={{ bottom: `${p * 100}%` }}>
              <span className="absolute -left-6 -top-2 text-[9px] font-bold text-slate-400">{Math.round(p * maxValue)}</span>
              {showGoalOverlay && !isMeetingOnly && (
                <span className="absolute -right-7 -top-2 text-[9px] font-bold text-purple-400">{Math.round(p * 100)}%</span>
              )}
            </div>
          ))}

          <svg className="w-full h-full overflow-visible z-10" preserveAspectRatio="none" viewBox="0 0 500 200">
            <defs>
              <linearGradient id="pulsePraiseGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity="0.35" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient>
              <linearGradient id="pulseImproveGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" /><stop offset="100%" stopColor="#f59e0b" stopOpacity="0" /></linearGradient>
              <linearGradient id="pulseWarningGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" /><stop offset="100%" stopColor="#f43f5e" stopOpacity="0" /></linearGradient>
            </defs>

            {(() => {
              const width = 500;
              const height = 200;
              const points = chartData.length;
              const dx = width / (points - 1 || 1);

              const getPath = (getData: (m: MonthData) => number): string => {
                let path = '';
                let prevY = 0;
                chartData.forEach((m, i) => {
                  const x = i * dx;
                  const val = getData(m);
                  const y = height - (val / maxValue) * height;
                  if (i === 0) path = `M ${x} ${y}`;
                  else {
                    const prevX = (i - 1) * dx;
                    const cpX = prevX + (x - prevX) / 2;
                    path += ` C ${cpX} ${prevY}, ${cpX} ${y}, ${x} ${y}`;
                  }
                  prevY = y;
                });
                return path;
              };

              const fillPath = (path: string) => `${path} L ${width} ${height} L 0 ${height} Z`;

              const praiseP = getPath(m => m.praise);
              const improvementP = getPath(m => m.improvement);
              const correctionP = getPath(m => m.warning);

              let goalLinePath = '';
              if (showGoalOverlay) {
                chartData.forEach((m, i) => {
                  const x = i * dx;
                  const progressPct = m.goalProgress !== undefined ? m.goalProgress : 0;
                  const y = height - (progressPct / 100) * height;
                  if (i === 0) goalLinePath = `M ${x} ${y}`;
                  else {
                    const prevX = (i - 1) * dx;
                    const cpX = prevX + (x - prevX) / 2;
                    const prevY = height - (((chartData[i-1].goalProgress || 0) / 100) * height);
                    goalLinePath += ` C ${cpX} ${prevY}, ${cpX} ${y}, ${x} ${y}`;
                  }
                });
              }

              return (
                <>
                  {showPraise && <path d={fillPath(praiseP)} fill="url(#pulsePraiseGrad)" />}
                  {showImprovement && <path d={fillPath(improvementP)} fill="url(#pulseImproveGrad)" />}
                  {showCorrection && <path d={fillPath(correctionP)} fill="url(#pulseWarningGrad)" />}
                  {showPraise && <path d={praiseP} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />}
                  {showImprovement && <path d={improvementP} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />}
                  {showCorrection && <path d={correctionP} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />}

                  {showGoalOverlay && goalLinePath && (
                    <>
                      <path d={goalLinePath} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" />
                      {chartData.map((m, i) => {
                        const y = height - (((m.goalProgress || 0) / 100) * height);
                        return (
                          <circle key={`goal-pt-${i}`} cx={i * dx} cy={y} r="4" fill="#7c3aed" stroke="#ffffff" strokeWidth="2" />
                        );
                      })}
                    </>
                  )}
                </>
              );
            })()}
          </svg>

          {/* Tooltip & Month Labels */}
          <div className="absolute inset-0 flex justify-between items-end pointer-events-none">
            {chartData.map((m, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 group relative pointer-events-auto">
                <div className="w-px h-56 bg-transparent group-hover:bg-purple-100 transition-colors relative">
                  <div className="absolute -top-32 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-semibold px-3.5 py-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-20 space-y-1 border border-slate-700">
                    <p className="text-slate-300 font-bold border-b border-slate-700 pb-1">{m.name} {m.year}</p>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-emerald-400">Praise:</span>
                      <span className="font-bold">{m.praise}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-amber-400">Improvement:</span>
                      <span className="font-bold">{m.improvement}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-rose-400">Correction:</span>
                      <span className="font-bold">{m.warning}</span>
                    </div>
                    {showGoalOverlay && m.goalProgress !== undefined && (
                      <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-700 text-purple-300">
                        <span>Goal Progress:</span>
                        <span className="font-bold">{m.goalProgress}% ({m.goalCompleted || 0}/{m.goalTotal || 0})</span>
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight bg-white px-1.5 mb-[-22px] z-20">
                  {m.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 3. Goal & KPI Alignment Overlay Panel ─────────────────────────────────────

const GoalAndKpiAlignmentPanel = ({
  goalOverlayData,
  isLoading
}: {
  goalOverlayData?: GoalsPulseOverlayResponse;
  isLoading: boolean;
}) => {
  const summary = goalOverlayData?.summary;
  const goals = goalOverlayData?.goals || [];

  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            <h3 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">Goal & KPI Progress Alignment</h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Correlating ongoing continuous coaching with active employee goal deliverables and milestone achievement.
          </p>
        </div>

        {summary && summary.totalGoals > 0 && (
          <div className="flex items-center gap-3 bg-purple-50/70 px-3.5 py-1.5 rounded-xl border border-purple-200/60 self-start sm:self-auto text-xs">
            <div>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Avg Goal Progress</span>
              <span className="font-extrabold text-purple-900 text-sm">{summary.averageCompletionPercentage}%</span>
            </div>
            <div className="h-6 w-px bg-purple-200" />
            <div>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Completed</span>
              <span className="font-extrabold text-purple-900 text-sm">
                {summary.completionRate}% <span className="text-[10px] text-purple-600 font-semibold">({summary.completedGoals}/{summary.totalGoals})</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400 font-semibold text-xs animate-pulse">
          Loading goal alignment data...
        </div>
      ) : goals.length === 0 ? (
        <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100">
            <Target size={20} />
          </div>
          <p className="text-sm font-bold text-slate-800">No Goal Progress Records Available</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Goal deliverables and KPI progress alignment will display here once employees have active goals assigned in the selected review scope.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {goals.map((g) => (
            <div 
              key={g.id} 
              className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50/80 space-y-2.5 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900 line-clamp-1" title={g.title}>{g.title}</h4>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 border ${
                  g.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : g.status === 'IN_PROGRESS'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {g.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">{g.employeeName}</span>
                <span>Due: {g.dueDate}</span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-purple-700">{g.completionPercentage}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full" style={{ width: `${g.completionPercentage}%` }} />
                </div>
              </div>

              {g.kpis && g.kpis.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60 space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active KPIs</p>
                  {g.kpis.map((k) => (
                    <div key={k.id} className="flex justify-between text-[10px]">
                      <span className="text-slate-600 truncate max-w-[150px]">{k.name}</span>
                      <span className="font-bold text-slate-800">{k.achievedValue} / {k.targetValue} {k.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── 4. Department Benchmark Comparison Component ─────────────────────────────

const DepartmentBenchmarkComparison = ({
  benchmarkData,
  selectedDeptId,
  onSelectDepartment,
  isLoading
}: {
  benchmarkData?: DepartmentBenchmarksResponse;
  selectedDeptId?: string;
  onSelectDepartment: (deptId: string) => void;
  isLoading: boolean;
}) => {
  const depts = benchmarkData?.departments || [];

  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
      <div className="pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-600" />
          <h3 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">Department Benchmark Comparison</h3>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Cross-department comparison of continuous feedback activity volume, employee density, and goal completion rates.
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400 font-semibold uppercase text-xs animate-pulse">
          Loading departmental benchmarks...
        </div>
      ) : depts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-3">Department</th>
                <th className="pb-3 px-3">Headcount</th>
                <th className="pb-3 px-3">Activities</th>
                <th className="pb-3 px-3">Rate / Employee</th>
                <th className="pb-3 px-3 min-w-[140px]">Sentiment Breakdown</th>
                <th className="pb-3 px-3 min-w-[140px]">Goal Completion</th>
                <th className="pb-3 px-3 text-right">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/70 text-xs">
              {depts.map((d) => {
                const isSelected = selectedDeptId === d.departmentId;
                const s = d.sentimentDistribution;
                const g = d.goals;
                return (
                  <tr 
                    key={d.departmentId} 
                    className={`group transition hover:bg-purple-50/30 ${isSelected ? 'bg-purple-50/50 font-semibold' : ''}`}
                  >
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      {d.departmentName}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">
                      {d.headcount > 0 ? `${d.headcount} staff` : <span className="text-slate-400 italic">0 staff</span>}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      {d.totalActivities}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        d.activitiesPerEmployee > 0
                          ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {d.activitiesPerEmployee != null ? `${d.activitiesPerEmployee} / emp` : '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      {d.totalActivities > 0 ? (
                        <div className="space-y-1">
                          <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100">
                            <div style={{ width: `${s.praisePercentage}%` }} className="bg-emerald-500" title={`Praise: ${s.praisePercentage}%`} />
                            <div style={{ width: `${s.improvementPercentage}%` }} className="bg-amber-400" title={`Improvement: ${s.improvementPercentage}%`} />
                            <div style={{ width: `${s.warningPercentage}%` }} className="bg-rose-500" title={`Correction: ${s.warningPercentage}%`} />
                          </div>
                          <div className="flex justify-between text-[8px] font-bold text-slate-400">
                            <span className="text-emerald-600">{s.praisePercentage}% praise</span>
                            <span className="text-amber-600">{s.improvementPercentage}% improve</span>
                            <span className="text-rose-600">{s.warningPercentage}% correct</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No feedback entries</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      {g.total > 0 ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold">
                            <span className="text-slate-900">{g.averageCompletionPercentage}% avg</span>
                            <span className="text-slate-500">{g.completed}/{g.total} done</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-600 rounded-full" 
                              style={{ width: `${g.averageCompletionPercentage}%` }} 
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No active goals</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {isSelected ? (
                        <span className="px-2.5 py-1 bg-purple-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                          Filtered
                        </span>
                      ) : (
                        <button
                          onClick={() => onSelectDepartment(d.departmentId)}
                          className="px-2.5 py-1 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg text-xs font-semibold transition cursor-pointer border border-transparent hover:border-purple-200"
                        >
                          Filter
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-10 text-center text-slate-400 text-xs">
          No department benchmark metrics available.
        </div>
      )}
    </div>
  );
};

// ─── Main Performance Pulse Page Component ───────────────────────────────────

export const PerformanceHistoryAdminPage = () => {
  const { isAdmin, isHR, accessToken } = useAuth();
  
  const { data: departments } = useGetDepartmentsQuery();
  const { data: employeeData, isLoading: isEmpsLoading } = useGetEmployeesQuery({ page: 0, size: 1000 });
  const employees = employeeData?.content || [];

  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [filterType, setFilterType] = useState<'ALL' | 'FEEDBACK' | 'MEETING'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Date Range State
  const [datePreset, setDatePreset] = useState<'3M' | '6M' | '12M' | 'CUSTOM'>('6M');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return format(d, 'yyyy-MM-dd');
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return format(new Date(), 'yyyy-MM-dd');
  });

  // Calculate effective date range
  const { effectiveStartDate, effectiveEndDate, isDateRangeValid } = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    if (datePreset === '3M') {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      return { effectiveStartDate: format(d, 'yyyy-MM-dd'), effectiveEndDate: todayStr, isDateRangeValid: true };
    }
    if (datePreset === '6M') {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      return { effectiveStartDate: format(d, 'yyyy-MM-dd'), effectiveEndDate: todayStr, isDateRangeValid: true };
    }
    if (datePreset === '12M') {
      const d = new Date();
      d.setMonth(d.getMonth() - 12);
      return { effectiveStartDate: format(d, 'yyyy-MM-dd'), effectiveEndDate: todayStr, isDateRangeValid: true };
    }
    const valid = Boolean(customStartDate && customEndDate && customEndDate >= customStartDate);
    return { effectiveStartDate: customStartDate, effectiveEndDate: customEndDate, isDateRangeValid: valid };
  }, [datePreset, customStartDate, customEndDate]);

  // Export State
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Goal Overlay Toggle
  const [showGoalOverlay, setShowGoalOverlay] = useState(true);

  const selectedEmployee = employees?.find(e => String(e.id) === String(selectedEmpId));
  const selectedEmployeeName = selectedEmployee?.staffName;

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSelectedDeptId('');
    setSelectedEmpId('');
    setFilterType('ALL');
    setDatePreset('6M');
    setCurrentPage(1);
  };

  // Queries wired to date range and filters
  const { data: employeeHistoryResponse, isLoading: isEmpHistoryLoading } = useGetPerformanceHistoryByEmployeeQuery(
    { 
      employeeId: selectedEmpId ? Number(selectedEmpId) : 0, 
      sourceType: filterType,
      startDate: isDateRangeValid ? effectiveStartDate : undefined,
      endDate: isDateRangeValid ? effectiveEndDate : undefined,
      page: currentPage - 1, 
      size: itemsPerPage 
    },
    { skip: !selectedEmpId }
  );

  const { data: globalHistoryResponse, isLoading: isGlobalHistoryLoading } = useGetAllPerformanceHistoryQuery(
    { 
      sourceType: filterType,
      departmentId: selectedDeptId || undefined,
      startDate: isDateRangeValid ? effectiveStartDate : undefined,
      endDate: isDateRangeValid ? effectiveEndDate : undefined,
      page: currentPage - 1, 
      size: itemsPerPage 
    },
    { skip: !!selectedEmpId }
  );

  const historyResponse = selectedEmpId ? employeeHistoryResponse : globalHistoryResponse;
  const isHistoryLoading = selectedEmpId ? isEmpHistoryLoading : isGlobalHistoryLoading;

  const { data: analyticsData, isLoading: isPulseLoading } = useGetPerformancePulseQuery({
    departmentId: selectedDeptId || undefined,
    employeeId: selectedEmpId || undefined,
    startDate: isDateRangeValid ? effectiveStartDate : undefined,
    endDate: isDateRangeValid ? effectiveEndDate : undefined
  });

  const { data: meetingPulseData } = useGetMeetingPulseQuery({
    departmentId: selectedDeptId || undefined,
    employeeId: selectedEmpId || undefined,
    startDate: isDateRangeValid ? effectiveStartDate : undefined,
    endDate: isDateRangeValid ? effectiveEndDate : undefined
  });

  const { data: benchmarkData, isLoading: isBenchmarkLoading } = useGetDepartmentBenchmarksQuery(
    isDateRangeValid ? { startDate: effectiveStartDate, endDate: effectiveEndDate } : undefined
  );

  const { data: goalOverlayData, isLoading: isGoalOverlayLoading } = useGetGoalsPulseOverlayQuery(
    isDateRangeValid ? {
      departmentId: selectedDeptId || undefined,
      employeeId: selectedEmpId || undefined,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate
    } : undefined
  );

  const history = historyResponse?.content || [];
  const totalPages = historyResponse?.totalPages || 0;
  const filteredAuditHistory = history;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Export Trigger Function
  const handleExport = async (formatType: 'csv' | 'pdf') => {
    if (!isDateRangeValid) {
      setExportError('Cannot export: End date cannot precede start date.');
      return;
    }
    try {
      if (formatType === 'csv') setIsExportingCsv(true);
      else setIsExportingPdf(true);
      setExportError(null);

      const params = new URLSearchParams();
      params.append('format', formatType);
      if (effectiveStartDate) params.append('startDate', effectiveStartDate);
      if (effectiveEndDate) params.append('endDate', effectiveEndDate);
      if (selectedDeptId) params.append('departmentId', selectedDeptId);
      if (selectedEmpId) params.append('employeeId', selectedEmpId);
      if (filterType && filterType !== 'ALL') params.append('sourceType', filterType);

      const response = await fetch(`/api/performance-history/export/?${params.toString()}`, {
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access Denied: Super Admin or HR permissions required for export.');
        }
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || `Export failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const stamp = format(new Date(), 'yyyyMMdd_HHmmss');
      a.download = `performance_pulse_report_${stamp}.${formatType}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      setExportError(err.message || 'An error occurred during export.');
    } finally {
      setIsExportingCsv(false);
      setIsExportingPdf(false);
    }
  };

  // Activity snapshot counts
  const totalPublishedInteractions = (analyticsData?.length || 0) + (meetingPulseData?.meetingHistory?.length || 0);
  const praiseTotal = (analyticsData || []).filter(h => h.feedbackType === 'PRAISE').length;
  const improvementTotal = (analyticsData || []).filter(h => h.feedbackType === 'IMPROVEMENT').length;
  const correctionTotal = (analyticsData || []).filter(h => h.feedbackType === 'WARNING').length;
  const actionDone = meetingPulseData?.completedActionItems || 0;
  const actionTotal = meetingPulseData?.totalActionItems || 0;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      
      {/* 1. Header & Export Controls */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200/60 px-2.5 py-0.5 rounded-full">Continuous Feedback Pulse</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Performance Pulse</h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium">Understand feedback activity, recognition patterns, and continuous coaching across teams.</p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleExport('csv')}
            disabled={isExportingCsv || !isDateRangeValid}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200/90 hover:border-purple-200 hover:bg-purple-50/50 text-slate-700 hover:text-purple-700 rounded-xl font-semibold text-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download CSV report with activities, sentiment, benchmarks, and goals"
          >
            {isExportingCsv ? (
              <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-purple-600 rounded-full animate-spin" />
            ) : (
              <FileSpreadsheet size={14} className="text-emerald-600" />
            )}
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={isExportingPdf || !isDateRangeValid}
            className="flex items-center gap-2 px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download PDF report with summary metrics, benchmarks, and audit trail"
          >
            {isExportingPdf ? (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <FileText size={14} />
            )}
            <span>Export PDF</span>
          </button>
        </div>
      </header>

      {/* Export Error Alert */}
      {exportError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center justify-between text-xs font-semibold animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-500 shrink-0" />
            <span>{exportError}</span>
          </div>
          <button onClick={() => setExportError(null)} className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* 2. Filter Bar */}
      <div className="bg-white p-4 md:p-5 rounded-2xl shadow-2xs border border-slate-200/90 space-y-3.5">
        <div className="flex flex-col lg:flex-row gap-3.5">
          {/* Department Filter */}
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Department</label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 outline-none text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
              value={selectedDeptId}
              onChange={(e) => {
                setSelectedDeptId(e.target.value);
                setSelectedEmpId('');
                setCurrentPage(1);
              }}
            >
              <option value="">All Departments</option>
              {departments?.map(dept => <option key={dept.id} value={String(dept.id)}>{dept.departmentName}</option>)}
            </select>
          </div>

          {/* Employee Filter */}
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Employee</label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 outline-none text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
              value={selectedEmpId}
              onChange={(e) => {
                setSelectedEmpId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Employees</option>
              {employees.filter(emp => !selectedDeptId || String(emp.currentDepartmentId) === String(selectedDeptId)).map(emp => (
                <option key={emp.id} value={String(emp.id)}>{emp.staffName} ({emp.positionName || 'Staff'})</option>
              ))}
            </select>
          </div>

          {/* Activity Type Filter */}
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Activity Type</label>
            <select 
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 outline-none text-xs font-semibold text-slate-700 cursor-pointer transition-colors" 
              value={filterType} 
              onChange={(e) => { setFilterType(e.target.value as any); setCurrentPage(1); }}
            >
              <option value="ALL">All Feedback Activities</option>
              <option value="FEEDBACK">Continuous Feedback Only</option>
              <option value="MEETING">1-on-1 Syncs Only</option>
            </select>
          </div>

          {/* Date Range Preset */}
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Date Range</label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 outline-none text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as any)}
            >
              <option value="3M">Last 3 Months</option>
              <option value="6M">Last 6 Months</option>
              <option value="12M">Last 12 Months</option>
              <option value="CUSTOM">Custom Date Range</option>
            </select>
          </div>

          {/* Reset Filters Action */}
          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="w-full lg:w-auto px-3.5 py-2 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Reset all filters back to default"
            >
              <RotateCcw size={13} className="text-slate-400" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Custom Date Range Pickers */}
        {datePreset === 'CUSTOM' && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-12">Start:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-12">End:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 outline-none"
              />
            </div>
            {!isDateRangeValid ? (
              <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                <AlertCircle size={14} />
                End date cannot precede start date.
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                Range applied: {effectiveStartDate} to {effectiveEndDate}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. Activity Snapshot Strip */}
      <ActivitySnapshot
        totalInteractions={totalPublishedInteractions}
        praiseCount={praiseTotal}
        improvementCount={improvementTotal}
        correctionCount={correctionTotal}
        taskCompleted={actionDone}
        taskTotal={actionTotal}
        isLoading={isPulseLoading}
      />

      {/* 4. Historical Pulse Trends Chart */}
      <HistoricalPulseChart 
        history={filterType === 'MEETING' ? (meetingPulseData?.meetingHistory || []) : (analyticsData || [])} 
        employeeName={selectedEmployeeName} 
        filterType={filterType}
        actionItems={meetingPulseData?.actionItems || []}
        goalOverlayData={goalOverlayData}
        showGoalOverlay={showGoalOverlay}
        onToggleGoalOverlay={() => setShowGoalOverlay(!showGoalOverlay)}
      />

      {/* 5. Goal & KPI Progress Overlay */}
      {showGoalOverlay && (
        <GoalAndKpiAlignmentPanel 
          goalOverlayData={goalOverlayData}
          isLoading={isGoalOverlayLoading}
        />
      )}

      {/* 6. Department Benchmark Comparison */}
      <DepartmentBenchmarkComparison 
        benchmarkData={benchmarkData}
        selectedDeptId={selectedDeptId}
        onSelectDepartment={(deptId) => {
          setSelectedDeptId(deptId);
          setSelectedEmpId('');
          setCurrentPage(1);
        }}
        isLoading={isBenchmarkLoading}
      />

      {/* 7. Feedback History & Audit Trail Table */}
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-2xs border border-slate-200/90 relative min-h-[460px] flex flex-col">
        <div className="flex flex-col gap-0.5 mb-5 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            <h2 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">Feedback History & Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">Detailed chronological record of published continuous feedback and coaching interactions.</p>
        </div>

        {isHistoryLoading ? (
          <div className="text-center py-20 text-slate-400 font-semibold uppercase text-xs animate-pulse">Loading feedback history...</div>
        ) : filteredAuditHistory.length > 0 ? (
          <>
            <div className="flex-grow overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 px-3">Timestamp</th>
                    <th className="pb-3 px-3">Participants</th>
                    <th className="pb-3 px-3">Direction</th>
                    <th className="pb-3 px-3">Type / Category</th>
                    <th className="pb-3 px-3">Summary / Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70 text-xs">
                  {filteredAuditHistory.map((record: any) => {
                    const isGiven = !selectedEmpId || String(record.performerId) === String(selectedEmpId);
                    return (
                      <tr key={record.historyId || record.id} className="group hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-3 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                          {record.createdAt ? format(new Date(record.createdAt), 'MMM d, yyyy · p') : 'Recent'}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-900">{record.performerName}</span>
                          <span className="text-slate-400 font-medium block text-[10px]">to {record.employeeName}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase border ${
                            isGiven
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            {isGiven ? 'Given' : 'Received'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase border ${
                            record.feedbackType === 'PRAISE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : record.feedbackType === 'WARNING'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {record.feedbackType || record.sourceType}
                          </span>
                          {record.tagName && (
                            <span className="block text-[9px] font-medium text-slate-400 mt-0.5 truncate max-w-[120px]">
                              {record.tagName}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-[11px] text-slate-600 max-w-sm truncate" title={record.description}>
                          "{record.description}"
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Page {currentPage} of {totalPages || 1} · {filteredAuditHistory.length} records shown</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)} 
                  disabled={currentPage === 1} 
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer"
                >
                  Previous
                </button>
                <button 
                  onClick={() => handlePageChange(currentPage + 1)} 
                  disabled={currentPage === totalPages || totalPages === 0} 
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <Users size={18} />
            </div>
            <p className="text-xs font-bold text-slate-700">No Published Records Found</p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              No continuous feedback interactions were recorded for the selected department, employee, or date range.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceHistoryAdminPage;
