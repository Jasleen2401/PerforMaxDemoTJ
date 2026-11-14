import React from 'react';
import { Sparkles, Target, RefreshCw } from 'lucide-react';
import type { Intern } from './types';

interface HrWelcomeHeaderProps {
  hrName: string;
  interns: Intern[];
  selectedInternId: string;
  setSelectedInternId: (id: string) => void;
  onOpenAssignGoal: () => void;
  isRefreshing: boolean;
  isTelemetryFetching: boolean;
  onRefresh: () => void;
}

export const HrWelcomeHeader: React.FC<HrWelcomeHeaderProps> = ({
  hrName,
  interns,
  selectedInternId,
  setSelectedInternId,
  onOpenAssignGoal,
  isRefreshing,
  isTelemetryFetching,
  onRefresh
}) => {
  const handleAssignGoalClick = () => {
    if (interns.length > 0 && !selectedInternId) {
      setSelectedInternId(interns[0].id);
    }
    onOpenAssignGoal();
  };

  return (
    <div className="bg-white rounded-2xl border border-purple-100/90 p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80">
            <Sparkles size={12} className="text-purple-600" />
            People Operations • HR Executive
          </span>
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          Welcome back, {hrName} 👋
        </h1>
        <p className="text-xs md:text-[13px] text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Monitor appraisal cycles, review evaluation submissions, track performance analytics, and manage intern cohorts.
        </p>
      </div>

      {/* Action Controls & Data Sync */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleAssignGoalClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-all cursor-pointer"
          title="Assign a new performance goal to an intern"
        >
          <Target size={14} />
          <span>Assign Goal</span>
        </button>
        <button
          onClick={onRefresh}
          disabled={isRefreshing || isTelemetryFetching}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
          title="Refresh database records and metrics"
        >
          <RefreshCw size={14} className={(isRefreshing || isTelemetryFetching) ? "animate-spin text-purple-600" : "text-slate-500"} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
};
