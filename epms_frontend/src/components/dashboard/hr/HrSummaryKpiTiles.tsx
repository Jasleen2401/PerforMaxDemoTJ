import React from 'react';
import { Users, Calendar, AlertCircle, Award, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatedCounter } from './AnimatedCounter';
import type { EvaluationCycle, HrDashboardTelemetry, SectionFetchStatus } from './types';

interface HrSummaryKpiTilesProps {
  totalCount: number;
  activeCount: number;
  activeCycle?: EvaluationCycle;
  telemetry: HrDashboardTelemetry | null;
  totalQueueItems: number;
  pendingPublishCount: number;
  pendingEvidenceCount: number;
  publishedCount: number;
  mentorsCount: number;
  cohortsCount: number;
  employeesStatus?: SectionFetchStatus;
  appraisalsStatus?: SectionFetchStatus;
  cyclesStatus?: SectionFetchStatus;
  evidenceStatus?: SectionFetchStatus;
  onNavigateInterns?: () => void;
  onNavigateCycle?: () => void;
  onNavigateQueue?: () => void;
  onNavigatePublished?: () => void;
  onNavigateMentors?: () => void;
}

export const HrSummaryKpiTiles: React.FC<HrSummaryKpiTilesProps> = ({
  totalCount,
  activeCount,
  activeCycle,
  telemetry,
  totalQueueItems,
  pendingPublishCount,
  pendingEvidenceCount,
  publishedCount,
  mentorsCount,
  cohortsCount,
  employeesStatus = 'success',
  appraisalsStatus = 'success',
  cyclesStatus = 'success',
  evidenceStatus = 'success',
  onNavigateInterns,
  onNavigateCycle,
  onNavigateQueue,
  onNavigatePublished,
  onNavigateMentors
}) => {
  const navigate = useNavigate();

  const handleInternsClick = () => {
    if (onNavigateInterns) onNavigateInterns();
    else navigate('/employees');
  };

  const handleCycleClick = () => {
    if (onNavigateCycle) onNavigateCycle();
    else navigate('/appraisal');
  };

  const handleQueueClick = () => {
    if (onNavigateQueue) onNavigateQueue();
    else navigate('/appraisal', { state: { activeTab: 'queue' } });
  };

  const handlePublishedClick = () => {
    if (onNavigatePublished) onNavigatePublished();
    else navigate('/appraisal', { state: { activeTab: 'queue' } });
  };

  const handleMentorsClick = () => {
    if (onNavigateMentors) onNavigateMentors();
    else navigate('/employees');
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {/* Card 1: Total Interns Enrolled */}
      <div
        onClick={handleInternsClick}
        className="bg-white p-4 rounded-2xl border border-purple-100/90 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 select-none"
        title="Open Workforce Directory"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Interns</span>
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 group-hover:scale-105 transition-transform">
            <Users size={16} />
          </div>
        </div>
        {employeesStatus === 'loading' ? (
          <div className="h-8 w-16 bg-slate-100 rounded-md animate-pulse mt-2" />
        ) : employeesStatus === 'error' ? (
          <div className="text-xs font-bold text-rose-600 mt-2">Sync Error</div>
        ) : (
          <div className="text-2xl font-black text-slate-900 mt-2">
            <AnimatedCounter value={totalCount} />
          </div>
        )}
        <div className="text-[11px] text-slate-500 font-medium mt-1 flex items-center justify-between">
          {employeesStatus === 'loading' ? (
            <div className="h-3 w-12 bg-slate-100 rounded-sm animate-pulse" />
          ) : employeesStatus === 'error' ? (
            <span className="text-rose-500">Retry needed</span>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{activeCount} Active</span>
            </div>
          )}
          <span className="text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold">→</span>
        </div>
      </div>

      {/* Card 2: Active Evaluation Cycle */}
      <div
        onClick={handleCycleClick}
        className="bg-white p-4 rounded-2xl border border-purple-100/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 select-none"
        title="Open Performance Appraisals"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Cycle</span>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
            <Calendar size={16} />
          </div>
        </div>
        {cyclesStatus === 'loading' ? (
          <div className="h-6 w-28 bg-slate-100 rounded-md animate-pulse mt-2" />
        ) : cyclesStatus === 'error' ? (
          <div className="text-xs font-bold text-rose-600 mt-2">Cycle Error</div>
        ) : (
          <div className="text-lg font-bold text-slate-900 mt-2 truncate" title={activeCycle?.name || 'Active Cycle'}>
            {activeCycle ? activeCycle.name : 'No Active Cycle'}
          </div>
        )}
        <div className="text-[11px] text-blue-700 font-semibold mt-1 truncate flex items-center justify-between">
          <span>
            {cyclesStatus === 'loading' ? 'Checking...' : activeCycle ? (telemetry?.currentCyclePhase ? telemetry.currentCyclePhase.replace(/_/g, ' ') : 'Active Phase') : 'Cycle Inactive'}
          </span>
          <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold">→</span>
        </div>
      </div>

      {/* Card 3: Pending HR Attention (Queue items) */}
      <div
        onClick={handleQueueClick}
        className={`bg-white p-4 rounded-2xl border shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 select-none ${
          totalQueueItems > 0
            ? 'border-amber-200/90 hover:border-amber-300'
            : 'border-purple-100/90 hover:border-purple-300'
        }`}
        title="Open Evaluation & Attention Queue"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Attention Queue</span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
            <AlertCircle size={16} />
          </div>
        </div>
        {evidenceStatus === 'loading' && appraisalsStatus === 'loading' ? (
          <div className="h-8 w-14 bg-slate-100 rounded-md animate-pulse mt-2" />
        ) : (
          <div className="text-2xl font-black text-slate-900 mt-2">
            <AnimatedCounter value={totalQueueItems} />
          </div>
        )}
        <div className="text-[11px] text-slate-500 font-medium mt-1 truncate flex items-center justify-between">
          {appraisalsStatus === 'unavailable' ? (
            <span>{pendingEvidenceCount} Evidence • Appraisals Pending</span>
          ) : (
            <span>{pendingPublishCount} Appraisals • {pendingEvidenceCount} Evidence</span>
          )}
          <span className="text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold">→</span>
        </div>
      </div>

      {/* Card 4: Published Appraisals */}
      <div
        onClick={handlePublishedClick}
        className="bg-white p-4 rounded-2xl border border-purple-100/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 select-none"
        title="Open Appraisal Publishing Desk"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Published</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
            <Award size={16} />
          </div>
        </div>
        {appraisalsStatus === 'loading' ? (
          <div className="h-8 w-16 bg-slate-100 rounded-md animate-pulse mt-2" />
        ) : appraisalsStatus === 'unavailable' ? (
          <div className="mt-2.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Sync Pending
            </span>
          </div>
        ) : appraisalsStatus === 'error' ? (
          <div className="text-xs font-bold text-rose-600 mt-2">Sync Error</div>
        ) : (
          <div className="text-2xl font-black text-emerald-700 mt-2">
            <AnimatedCounter value={publishedCount} />
            <span className="text-sm font-semibold text-slate-400 ml-1">/ {totalCount}</span>
          </div>
        )}
        <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center justify-between">
          {appraisalsStatus === 'unavailable' ? (
            <span className="text-slate-400 font-normal">Scorecard sync awaiting backend</span>
          ) : appraisalsStatus === 'loading' ? (
            <div className="h-3 w-16 bg-slate-100 rounded-sm animate-pulse" />
          ) : (
            <span>{totalCount > 0 ? `${Math.round((publishedCount / totalCount) * 100)}% Finalized` : 'No interns'}</span>
          )}
          <span className="text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold">→</span>
        </div>
      </div>

      {/* Card 5: Active Mentors */}
      <div
        onClick={handleMentorsClick}
        className="bg-white p-4 rounded-2xl border border-purple-100/90 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 select-none"
        title="Open Workforce Directory"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Mentors</span>
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 group-hover:scale-105 transition-transform">
            <GraduationCap size={16} />
          </div>
        </div>
        {employeesStatus === 'loading' ? (
          <div className="h-8 w-14 bg-slate-100 rounded-md animate-pulse mt-2" />
        ) : employeesStatus === 'error' ? (
          <div className="text-xs font-bold text-rose-600 mt-2">Sync Error</div>
        ) : (
          <div className="text-2xl font-black text-slate-900 mt-2">
            <AnimatedCounter value={mentorsCount} />
          </div>
        )}
        <div className="text-[11px] text-purple-700 font-semibold mt-1 flex items-center justify-between">
          {employeesStatus === 'loading' ? (
            <div className="h-3 w-14 bg-slate-100 rounded-sm animate-pulse" />
          ) : employeesStatus === 'error' ? (
            <span className="text-rose-500">Retry needed</span>
          ) : (
            <span>{cohortsCount} Batches</span>
          )}
          <span className="text-purple-600 group-hover:underline font-bold">View →</span>
        </div>
      </div>
    </div>
  );
};
