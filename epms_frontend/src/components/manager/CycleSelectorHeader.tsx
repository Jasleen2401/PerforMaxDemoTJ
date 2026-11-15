import React from 'react';
import { Calendar, ChevronDown, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { SelectedCycleDetails, EligibleCycleItem } from '../../features/manager/managerApi';

interface CycleSelectorHeaderProps {
  selectedCycle: SelectedCycleDetails | null;
  eligibleCycles: EligibleCycleItem[];
  requiresSelection: boolean;
  onSelectCycle: (cycleId: string) => void;
  isLoading?: boolean;
}

export const CycleSelectorHeader: React.FC<CycleSelectorHeaderProps> = ({
  selectedCycle,
  eligibleCycles,
  requiresSelection,
  onSelectCycle,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-2xl border border-slate-200 animate-pulse flex items-center justify-between">
        <div className="h-5 bg-slate-200 rounded w-48" />
        <div className="h-8 bg-slate-200 rounded-xl w-32" />
      </div>
    );
  }

  // Case: Multiple cycles active -> explicit selection prompt required
  if (requiresSelection && !selectedCycle) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-purple-100 text-purple-700 shrink-0 mt-0.5">
            <Layers size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Multiple Active Performance Cycles Open
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Please choose a cycle to inspect and execute your assigned technical appraisals.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {eligibleCycles.map((c) => (
            <div
              key={c.id}
              className="bg-white p-4 rounded-xl border border-slate-200 hover:border-purple-300 shadow-2xs transition-all flex flex-col justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-100">
                    {c.status}
                  </span>
                  <span className="text-[11px] text-slate-400">Scale: {c.rating_scale_max}</span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 leading-snug">{c.name}</h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                  <Calendar size={13} className="text-slate-400" />
                  <span>
                    {c.start_date || 'N/A'} &rarr; {c.end_date || 'N/A'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectCycle(c.id)}
                className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs active:scale-95"
              >
                Select Cycle
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Case: No eligible cycles active
  if (!selectedCycle) {
    return (
      <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
        <AlertCircle size={28} className="mx-auto text-slate-400" />
        <h4 className="text-sm font-bold text-slate-700">No Active Evaluation Cycles</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          There are currently no active performance cycles with technical evaluations assigned to you.
        </p>
      </div>
    );
  }

  // Case: Single cycle selected
  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 shrink-0">
          <Layers size={20} />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-extrabold text-slate-900">{selectedCycle.name}</h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 flex items-center gap-1">
              <CheckCircle2 size={11} />
              {selectedCycle.status}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-100">
              {selectedCycle.scoring_model === 'COMPETENCY_FRAMEWORK' ? 'Competency Framework' : 'Legacy Criteria'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar size={13} className="text-slate-400" />
              {selectedCycle.start_date || 'N/A'} &rarr; {selectedCycle.end_date || 'N/A'}
            </span>
            <span>&bull;</span>
            <span>Rating Scale: 0.00 &ndash; {selectedCycle.rating_scale_max.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {eligibleCycles.length > 1 && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-500">Switch Cycle:</span>
          <div className="relative">
            <select
              value={selectedCycle.id}
              onChange={(e) => onSelectCycle(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {eligibleCycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
