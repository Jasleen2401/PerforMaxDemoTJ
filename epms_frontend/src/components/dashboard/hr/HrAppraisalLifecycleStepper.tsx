import React from 'react';
import { ShieldCheck, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { EvaluationCycle, HrDashboardTelemetry, Goal, Intern, SectionFetchStatus } from './types';

interface HrAppraisalLifecycleStepperProps {
  activeCycle?: EvaluationCycle;
  telemetry: HrDashboardTelemetry | null;
  goals: Goal[];
  totalCount: number;
  evaluatedInterns: Intern[];
  publishedCount: number;
  hoveredStageId: number | null;
  setHoveredStageId: (id: number | null) => void;
  pinnedStageId: number | null;
  setPinnedStageId: React.Dispatch<React.SetStateAction<number | null>>;
  appraisalsStatus?: SectionFetchStatus;
}

export const HrAppraisalLifecycleStepper: React.FC<HrAppraisalLifecycleStepperProps> = ({
  activeCycle,
  telemetry,
  goals,
  totalCount,
  evaluatedInterns,
  publishedCount,
  hoveredStageId,
  setHoveredStageId,
  pinnedStageId,
  setPinnedStageId,
  appraisalsStatus = 'success'
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-purple-100/90 shadow-xs p-5 space-y-4 relative overflow-visible">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Appraisal Cycle Overview</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Four-stage evaluation lifecycle for {activeCycle ? activeCycle.name : 'Active Cycle'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Current Phase:</span>
          <span className="px-2.5 py-1 rounded-lg font-bold bg-purple-50 text-purple-700 border border-purple-300 ring-1 ring-purple-200 shadow-2xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
            <span>{telemetry?.currentCyclePhase ? telemetry.currentCyclePhase.replace(/_/g, ' ') : 'Manager Evaluation'}</span>
          </span>
          {telemetry?.daysUntilCycleEnd ? (
            <span className="text-[11px] text-slate-400">({telemetry.daysUntilCycleEnd}d remaining)</span>
          ) : null}
        </div>
      </div>

      {/* Stepper Progress Tracker (Interactive Cards with Smooth Hover, Keyboard & Touch Popovers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1 relative overflow-visible">
        {/* Stage 1: Goal Setting */}
        {(() => {
          const isCompleted = goals.length > 0;
          const isHovered = hoveredStageId === 1 || pinnedStageId === 1;
          return (
            <div
              tabIndex={0}
              role="button"
              aria-label="Stage 1: Goal Setting details"
              onMouseEnter={() => setHoveredStageId(1)}
              onMouseLeave={() => setHoveredStageId(null)}
              onFocus={() => setHoveredStageId(1)}
              onBlur={() => setHoveredStageId(null)}
              onClick={() => setPinnedStageId(prev => prev === 1 ? null : 1)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPinnedStageId(prev => prev === 1 ? null : 1);
                }
              }}
              className={`p-3.5 rounded-xl border transition-all duration-200 select-none cursor-pointer relative overflow-visible motion-reduce:transform-none ${
                isCompleted
                  ? 'bg-emerald-50/40 border-emerald-200/80 text-emerald-950 hover:border-emerald-300 hover:-translate-y-1 hover:shadow-md'
                  : 'bg-slate-50/60 border-slate-200/70 text-slate-800 hover:border-purple-300 hover:-translate-y-1 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Stage 1</span>
                {isCompleted ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 size={13} /> Completed
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400">In Progress</span>
                )}
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1.5 flex items-center justify-between">
                <span>Goal Setting</span>
                <span className="text-[10px] text-purple-600 font-semibold opacity-0 group-hover:opacity-100">Info ▾</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {goals.length > 0 ? `${goals.length} Goals Assigned` : 'Setting objectives'}
              </div>

              {/* Contained Popover on Hover / Focus / Click */}
              {isHovered && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-white/98 backdrop-blur-xs p-3.5 rounded-xl border border-purple-200 shadow-xl z-40 text-left space-y-2 pointer-events-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-bold text-slate-900">Stage 1 • Goal Setting</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {isCompleted ? 'Finalized' : 'In Progress'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Assigned Goals:</span>
                      <span className="font-bold text-slate-900">{goals.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Goals:</span>
                      <span className="font-bold text-emerald-700">{goals.filter(g => g.status === 'Completed').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>In Progress:</span>
                      <span className="font-bold text-blue-700">{goals.filter(g => g.status === 'In Progress').length}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/employees');
                    }}
                    className="w-full mt-1 py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>View Employees Directory</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Stage 2: Self-Assessment */}
        {(() => {
          const isActive = telemetry?.currentCyclePhase === 'SELF_ASSESSMENT';
          const isCompleted = telemetry?.pendingSelfAssessments !== undefined && telemetry.pendingSelfAssessments === 0 && totalCount > 0;
          const isHovered = hoveredStageId === 2 || pinnedStageId === 2;
          return (
            <div
              tabIndex={0}
              role="button"
              aria-label="Stage 2: Self-Assessment details"
              onMouseEnter={() => setHoveredStageId(2)}
              onMouseLeave={() => setHoveredStageId(null)}
              onFocus={() => setHoveredStageId(2)}
              onBlur={() => setHoveredStageId(null)}
              onClick={() => setPinnedStageId(prev => prev === 2 ? null : 2)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPinnedStageId(prev => prev === 2 ? null : 2);
                }
              }}
              className={`p-3.5 rounded-xl border transition-all duration-200 select-none cursor-pointer relative overflow-visible motion-reduce:transform-none ${
                isActive
                  ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-300 shadow-[0_0_15px_rgba(147,51,234,0.12)] hover:-translate-y-1 hover:shadow-md'
                  : isCompleted
                  ? 'bg-emerald-50/40 border-emerald-200/80 text-emerald-950 hover:border-emerald-300 hover:-translate-y-1 hover:shadow-md'
                  : 'bg-blue-50/30 border-blue-200/70 hover:border-purple-300 hover:-translate-y-1 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Stage 2</span>
                {isActive ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 ring-1 ring-purple-300 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-purple-600 animate-pulse"></span>
                    Active Phase
                  </span>
                ) : isCompleted ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 size={13} /> Completed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-700">
                    <Clock size={12} /> In Progress
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1.5">Self-Assessment</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {telemetry?.pendingSelfAssessments !== undefined
                  ? `${telemetry.pendingSelfAssessments} Pending Submission`
                  : 'Intern self-reflections'}
              </div>

              {/* Contained Popover on Hover / Focus / Click */}
              {isHovered && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-white/98 backdrop-blur-xs p-3.5 rounded-xl border border-purple-200 shadow-xl z-40 text-left space-y-2 pointer-events-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-bold text-slate-900">Stage 2 • Self-Assessment</span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Reflection Window
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Eligible Interns:</span>
                      <span className="font-bold text-slate-900">{totalCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending Submissions:</span>
                      <span className="font-bold text-amber-700">{telemetry?.pendingSelfAssessments ?? Math.max(0, totalCount - evaluatedInterns.length)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Submitted Forms:</span>
                      <span className="font-bold text-emerald-700">{totalCount - (telemetry?.pendingSelfAssessments ?? Math.max(0, totalCount - evaluatedInterns.length))}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/appraisal', { state: { activeTab: 'queue', initialFilter: 'appraisals' } });
                    }}
                    className="w-full mt-1 py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Track Submissions in Queue</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Stage 3: Manager Evaluation */}
        {(() => {
          const isActive = !telemetry?.currentCyclePhase || telemetry.currentCyclePhase.includes('EVALUATION') || telemetry.currentCyclePhase.includes('MANAGER');
          const isCompleted = evaluatedInterns.length === totalCount && totalCount > 0;
          const isHovered = hoveredStageId === 3 || pinnedStageId === 3;
          return (
            <div
              tabIndex={0}
              role="button"
              aria-label="Stage 3: Manager Evaluation details"
              onMouseEnter={() => setHoveredStageId(3)}
              onMouseLeave={() => setHoveredStageId(null)}
              onFocus={() => setHoveredStageId(3)}
              onBlur={() => setHoveredStageId(null)}
              onClick={() => setPinnedStageId(prev => prev === 3 ? null : 3)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPinnedStageId(prev => prev === 3 ? null : 3);
                }
              }}
              className={`p-3.5 rounded-xl border transition-all duration-200 select-none cursor-pointer relative overflow-visible motion-reduce:transform-none ${
                isActive
                  ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-300 shadow-[0_0_15px_rgba(147,51,234,0.12)] hover:-translate-y-1 hover:shadow-md'
                  : isCompleted
                  ? 'bg-emerald-50/40 border-emerald-200/80 text-emerald-950 hover:border-emerald-300 hover:-translate-y-1 hover:shadow-md'
                  : 'bg-slate-50/60 border-slate-200/70 hover:border-purple-300 hover:-translate-y-1 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Stage 3</span>
                {isActive ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 ring-1 ring-purple-300 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-purple-600 animate-pulse"></span>
                    Active Phase
                  </span>
                ) : isCompleted ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 size={13} /> Completed
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400">Pending</span>
                )}
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1.5">Manager Evaluation</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {appraisalsStatus === 'unavailable'
                  ? 'Scorecard Sync Pending'
                  : totalCount > 0
                  ? `${evaluatedInterns.length} of ${totalCount} Evaluated`
                  : 'Awaiting Evaluation'}
              </div>

              {/* Contained Popover on Hover / Focus / Click */}
              {isHovered && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-white/98 backdrop-blur-xs p-3.5 rounded-xl border border-purple-200 shadow-xl z-40 text-left space-y-2 pointer-events-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-bold text-slate-900">Stage 3 • Manager Evaluation</span>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      Rubric Scoring
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-1">
                    {appraisalsStatus === 'unavailable' ? (
                      <div className="p-2 bg-amber-50 rounded-lg text-amber-800 text-[10px] border border-amber-200">
                        Scorecards awaiting backend route synchronization (/appraisals/).
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span>Evaluated Interns:</span>
                          <span className="font-bold text-purple-700">{evaluatedInterns.length} / {totalCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Awaiting Mentor Review:</span>
                          <span className="font-bold text-amber-700">{Math.max(0, totalCount - evaluatedInterns.length)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Score:</span>
                          <span className="font-bold text-slate-900">
                            {evaluatedInterns.length > 0
                              ? `${(evaluatedInterns.reduce((acc, i) => acc + (i.score || 0), 0) / evaluatedInterns.length).toFixed(1)}%`
                              : 'Pending'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/appraisal', { state: { activeTab: 'queue' } });
                    }}
                    className="w-full mt-1 py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Review Evaluations & Scores</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Stage 4: HR Publication */}
        {(() => {
          const isCompleted = publishedCount === totalCount && totalCount > 0;
          const isReleasing = publishedCount > 0;
          const isHovered = hoveredStageId === 4 || pinnedStageId === 4;
          return (
            <div
              tabIndex={0}
              role="button"
              aria-label="Stage 4: HR Publication details"
              onMouseEnter={() => setHoveredStageId(4)}
              onMouseLeave={() => setHoveredStageId(null)}
              onFocus={() => setHoveredStageId(4)}
              onBlur={() => setHoveredStageId(null)}
              onClick={() => setPinnedStageId(prev => prev === 4 ? null : 4)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPinnedStageId(prev => prev === 4 ? null : 4);
                }
              }}
              className={`p-3.5 rounded-xl border transition-all duration-200 select-none cursor-pointer relative overflow-visible motion-reduce:transform-none ${
                isCompleted
                  ? 'bg-emerald-50/40 border-emerald-200/80 text-emerald-950 hover:border-emerald-300 hover:-translate-y-1 hover:shadow-md'
                  : isReleasing
                  ? 'bg-purple-50/50 border-purple-300 ring-1 ring-purple-200 hover:-translate-y-1 hover:shadow-md'
                  : 'bg-slate-50/60 border-slate-200/70 hover:border-purple-300 hover:-translate-y-1 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Stage 4</span>
                {isCompleted ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 size={13} /> Completed
                  </span>
                ) : isReleasing ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700">Releasing</span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400">Awaiting Lock</span>
                )}
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1.5">HR Publication</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {appraisalsStatus === 'unavailable'
                  ? 'Scorecard Sync Pending'
                  : `${publishedCount} of ${totalCount} Published`}
              </div>

              {/* Contained Popover on Hover / Focus / Click */}
              {isHovered && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white/98 backdrop-blur-xs p-3.5 rounded-xl border border-purple-200 shadow-xl z-40 text-left space-y-2 pointer-events-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-bold text-slate-900">Stage 4 • HR Publication</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Official Release
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-1">
                    {appraisalsStatus === 'unavailable' ? (
                      <div className="p-2 bg-amber-50 rounded-lg text-amber-800 text-[10px] border border-amber-200">
                        Scorecards awaiting backend route synchronization (/appraisals/).
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span>Total Eligible:</span>
                          <span className="font-bold text-slate-900">{totalCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Published Scorecards:</span>
                          <span className="font-bold text-emerald-700">{publishedCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Unpublished:</span>
                          <span className="font-bold text-amber-700">{totalCount - publishedCount}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/appraisal', { state: { activeTab: 'queue' } });
                    }}
                    className="w-full mt-1 py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Open Scorecard Release Desk</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
