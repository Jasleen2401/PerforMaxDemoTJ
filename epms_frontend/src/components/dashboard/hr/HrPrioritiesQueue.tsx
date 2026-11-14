import React from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Award, ChevronRight, FileText, Calendar, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Intern, Evidence, EvaluationCycle, HrDashboardTelemetry, SectionFetchStatus } from './types';

interface HrPrioritiesQueueProps {
  totalQueueItems: number;
  pendingPublishInterns: Intern[];
  pendingEvidenceList: Evidence[];
  activeCycle?: EvaluationCycle;
  telemetry: HrDashboardTelemetry | null;
  appraisalsStatus?: SectionFetchStatus;
  evidenceStatus?: SectionFetchStatus;
  onRetryEvidence?: () => void;
}

export const HrPrioritiesQueue: React.FC<HrPrioritiesQueueProps> = ({
  totalQueueItems,
  pendingPublishInterns,
  pendingEvidenceList,
  activeCycle,
  telemetry,
  appraisalsStatus = 'success',
  evidenceStatus = 'success',
  onRetryEvidence
}) => {
  const navigate = useNavigate();

  const isInitialLoading = appraisalsStatus === 'loading' && evidenceStatus === 'loading';

  return (
    <div className="bg-white rounded-2xl border border-purple-100/90 shadow-xs p-5 flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
              <AlertCircle size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>HR Priorities</span>
                {totalQueueItems > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {totalQueueItems} Action{totalQueueItems !== 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                High-priority appraisal actions requiring administrative attention
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/appraisal', { state: { activeTab: 'queue' } })}
            className="text-xs font-semibold text-purple-600 hover:text-purple-800 hover:underline cursor-pointer flex items-center gap-1 shrink-0"
          >
            <span>View All</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {isInitialLoading ? (
          <div className="space-y-3 pt-3">
            <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        ) : totalQueueItems === 0 && (!telemetry?.pendingSelfAssessments || telemetry.pendingSelfAssessments === 0) && appraisalsStatus === 'success' && evidenceStatus === 'success' ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle2 size={20} />
            </div>
            <h4 className="text-xs font-bold text-slate-800">All priorities cleared</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              All appraisals are published and no evidence deliverables are pending review.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-3">
            {/* Item 1: Appraisals Awaiting HR Publication */}
            <div
              onClick={() => navigate('/appraisal', { state: { activeTab: 'queue', initialFilter: 'appraisals' } })}
              className="p-3.5 rounded-xl border border-slate-100 hover:border-purple-200 bg-slate-50/50 hover:bg-purple-50/30 transition-all cursor-pointer group flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  appraisalsStatus === 'unavailable'
                    ? 'bg-amber-100 text-amber-800'
                    : pendingPublishInterns.length > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  <Award size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">Appraisals Awaiting Publication</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {appraisalsStatus === 'unavailable'
                      ? 'Scorecard synchronization pending backend route (/appraisals/)'
                      : pendingPublishInterns.length > 0
                      ? `${pendingPublishInterns.length} evaluated intern${pendingPublishInterns.length !== 1 ? 's' : ''} ready for official scorecard release`
                      : 'All student scorecards have been published'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  appraisalsStatus === 'unavailable'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : pendingPublishInterns.length > 0
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}>
                  {appraisalsStatus === 'unavailable'
                    ? 'Sync Pending'
                    : pendingPublishInterns.length > 0
                    ? `${pendingPublishInterns.length} Pending`
                    : 'Published'}
                </span>
                <ChevronRight size={14} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
              </div>
            </div>

            {/* Item 2: Evidence Submissions Awaiting Review */}
            {evidenceStatus === 'error' ? (
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-rose-800">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>Failed to load evidence deliverables.</span>
                </div>
                {onRetryEvidence && (
                  <button
                    onClick={onRetryEvidence}
                    className="px-2 py-1 bg-white hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-300 text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                  >
                    <RefreshCw size={11} /> Retry
                  </button>
                )}
              </div>
            ) : (
              <div
                onClick={() => navigate('/appraisal', { state: { activeTab: 'queue', initialFilter: 'evidence' } })}
                className="p-3.5 rounded-xl border border-slate-100 hover:border-purple-200 bg-slate-50/50 hover:bg-purple-50/30 transition-all cursor-pointer group flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    pendingEvidenceList.length > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">Evidence Submissions Under Review</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {evidenceStatus === 'loading'
                        ? 'Loading evidence submissions...'
                        : pendingEvidenceList.length > 0
                        ? `${pendingEvidenceList.length} goal deliverable${pendingEvidenceList.length !== 1 ? 's' : ''} awaiting HR verification`
                        : 'All student evidence submissions reviewed'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    evidenceStatus === 'loading'
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : pendingEvidenceList.length > 0
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {evidenceStatus === 'loading'
                      ? 'Loading...'
                      : pendingEvidenceList.length > 0
                      ? `${pendingEvidenceList.length} Pending`
                      : 'Reviewed'}
                  </span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
                </div>
              </div>
            )}

            {/* Item 3: Appraisal Cycle Progression */}
            <div
              onClick={() => navigate('/appraisal')}
              className="p-3.5 rounded-xl border border-slate-100 hover:border-purple-200 bg-slate-50/50 hover:bg-purple-50/30 transition-all cursor-pointer group flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Calendar size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">Appraisal Cycle Progression</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {activeCycle ? activeCycle.name : 'No Active Cycle'} • {activeCycle ? (telemetry?.currentCyclePhase ? telemetry.currentCyclePhase.replace(/_/g, ' ') : 'Active Phase') : 'Cycle Inactive'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {activeCycle ? (telemetry?.currentCyclePhase ? telemetry.currentCyclePhase.replace(/_/g, ' ') : 'Active') : 'Inactive'}
                </span>
                <ChevronRight size={14} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Real-time workflow indicators</span>
        <button
          onClick={() => navigate('/appraisal', { state: { activeTab: 'queue' } })}
          className="text-purple-600 hover:underline font-semibold cursor-pointer"
        >
          Manage Attention Queue →
        </button>
      </div>
    </div>
  );
};
