import React from 'react';
import { Users, TrendingUp, Info, AlertCircle, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { Intern, AppraisalProgressDataPoint, SectionFetchStatus } from './types';

interface HrPerformanceSnapshotProps {
  totalCount: number;
  evaluatedInterns: Intern[];
  publishedCount: number;
  achievedCount: number;
  progressingCount: number;
  focusCount: number;
  ungradedCount: number;
  activeSnapshotView: 'overview' | 'timeline';
  setActiveSnapshotView: (view: 'overview' | 'timeline') => void;
  appraisalProgressData: AppraisalProgressDataPoint[];
  appraisalsStatus?: SectionFetchStatus;
  onRetryAppraisals?: () => void;
}

export const HrPerformanceSnapshot: React.FC<HrPerformanceSnapshotProps> = ({
  totalCount,
  evaluatedInterns,
  publishedCount,
  achievedCount,
  progressingCount,
  focusCount,
  ungradedCount,
  activeSnapshotView,
  setActiveSnapshotView,
  appraisalProgressData,
  appraisalsStatus = 'success',
  onRetryAppraisals
}) => {
  return (
    <div className="bg-white rounded-2xl border border-purple-100/90 shadow-xs p-5 flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">People & Performance Snapshot</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Live appraisal completion and cohort grade distribution
              </p>
            </div>
          </div>
          
          {/* Snapshot View Switcher (Overview vs Timeline Chart) */}
          <div className="flex items-center gap-1.5">
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px]">
              <button
                onClick={() => setActiveSnapshotView('overview')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  activeSnapshotView === 'overview'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Coverage
              </button>
              <button
                onClick={() => setActiveSnapshotView('timeline')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeSnapshotView === 'timeline'
                    ? 'bg-white text-purple-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <TrendingUp size={11} />
                <span>Timeline</span>
              </button>
            </div>
            <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-400 pl-1">
              {totalCount} Interns
            </span>
          </div>
        </div>

        {/* View 1: Standard Progress Bars & Classification */}
        {activeSnapshotView === 'overview' && (
          <div className="space-y-4 pt-3">
            {/* If appraisals endpoint is unavailable (backend dependency 404), display informative alert */}
            {appraisalsStatus === 'unavailable' && (
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/90 text-xs text-amber-900 flex items-start gap-2.5">
                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>Scorecard Synchronization Pending</span>
                    <span className="px-1.5 py-0.2 bg-amber-200/60 text-amber-800 rounded-sm text-[9px] uppercase font-bold tracking-wide">
                      Awaiting Backend Route
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                    Appraisal scorecards from the evaluation engine are pending backend synchronization (/appraisals/). Workforce directory, intern tasks, and assigned goals remain fully operational.
                  </p>
                </div>
              </div>
            )}

            {/* Error state if fetch failed */}
            {appraisalsStatus === 'error' && (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>Failed to load appraisal scores from server.</span>
                </div>
                {onRetryAppraisals && (
                  <button
                    onClick={onRetryAppraisals}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                  >
                    <RefreshCw size={11} /> Retry
                  </button>
                )}
              </div>
            )}

            {/* Loading Skeleton */}
            {appraisalsStatus === 'loading' ? (
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <div className="h-3 w-40 bg-slate-100 rounded-sm animate-pulse" />
                  <div className="h-2 w-full bg-slate-100 rounded-full animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-44 bg-slate-100 rounded-sm animate-pulse" />
                  <div className="h-2 w-full bg-slate-100 rounded-full animate-pulse" />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                  <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                  <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                {/* Progress Bar 1: Evaluation Progress */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold mb-1">
                    <span className="text-slate-700">Evaluation Coverage</span>
                    <span className="text-purple-700">
                      {appraisalsStatus === 'unavailable'
                        ? `Awaiting Sync (${totalCount} Eligible)`
                        : `${evaluatedInterns.length} / ${totalCount} (${totalCount > 0 ? Math.round((evaluatedInterns.length / totalCount) * 100) : 0}%)`
                      }
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: appraisalsStatus === 'unavailable'
                          ? '0%'
                          : `${totalCount > 0 ? (evaluatedInterns.length / totalCount) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>

                {/* Progress Bar 2: Publication Status */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold mb-1">
                    <span className="text-slate-700">Official Scorecard Release</span>
                    <span className="text-emerald-700">
                      {appraisalsStatus === 'unavailable'
                        ? 'Awaiting Sync'
                        : `${publishedCount} / ${totalCount} (${totalCount > 0 ? Math.round((publishedCount / totalCount) * 100) : 0}%)`
                      }
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: appraisalsStatus === 'unavailable'
                          ? '0%'
                          : `${totalCount > 0 ? (publishedCount / totalCount) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>

                {/* Performance Classification Breakdown */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">
                      Performance Classification
                    </span>
                    {appraisalsStatus === 'unavailable' ? (
                      <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                        Scores pending sync
                      </span>
                    ) : ungradedCount > 0 ? (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {ungradedCount} Ungraded (Excluded from average)
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                      <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Achieved (≥85%)</div>
                      <div className="text-base font-black text-emerald-700 mt-0.5">
                        {appraisalsStatus === 'unavailable' ? '—' : achievedCount}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                      <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Progressing (70-84%)</div>
                      <div className="text-base font-black text-blue-700 mt-0.5">
                        {appraisalsStatus === 'unavailable' ? '—' : progressingCount}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100">
                      <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Focus Req (&lt;70%)</div>
                      <div className="text-base font-black text-rose-700 mt-0.5">
                        {appraisalsStatus === 'unavailable' ? '—' : focusCount}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* View 2: Interactive Line Chart / Genuine Timeline */}
        {activeSnapshotView === 'timeline' && (
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Appraisal Completion Over Time</span>
              <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-600 inline-block"></span>
                  <span>Evaluated</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  <span>Published</span>
                </span>
              </div>
            </div>

            {appraisalsStatus === 'unavailable' ? (
              <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <p className="font-medium text-slate-600">Timeline Awaiting Scorecard Synchronization</p>
                <p className="text-[11px] mt-0.5 text-slate-400">
                  Historical progression trends will be plotted once scorecard synchronization is activated.
                </p>
              </div>
            ) : appraisalProgressData.length >= 2 ? (
              <div className="w-full min-w-0 h-[155px] pt-1">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={140}>
                  <LineChart
                    data={appraisalProgressData}
                    margin={{ top: 10, right: 15, left: -22, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      content={({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: AppraisalProgressDataPoint }>; label?: string }) => {
                        if (active && payload && payload.length) {
                          const pData = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-xl text-[11px] shadow-xl border border-slate-800 space-y-1">
                              <div className="font-bold border-b border-slate-800 pb-1 text-slate-200">{label} Cycle</div>
                              <div className="flex justify-between gap-3 text-purple-300">
                                <span>Evaluated:</span>
                                <span className="font-bold">{pData.evaluatedCount} / {pData.totalEligible} ({pData.completionRate}%)</span>
                              </div>
                              <div className="flex justify-between gap-3 text-emerald-300">
                                <span>Published:</span>
                                <span className="font-bold">{pData.publishedCount} / {pData.totalEligible} ({pData.publishedRate}%)</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="completionRate"
                      name="Evaluation Rate"
                      stroke="#9333EA"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: '#9333EA', strokeWidth: 1.5, stroke: '#FFFFFF' }}
                      activeDot={{ r: 5, fill: '#9333EA' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="publishedRate"
                      name="Publication Rate"
                      stroke="#10B981"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#10B981', strokeWidth: 1.5, stroke: '#FFFFFF' }}
                      activeDot={{ r: 4.5, fill: '#10B981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <p className="font-medium text-slate-600">Historical Trend Initializing</p>
                <p className="text-[11px] mt-0.5 text-slate-400">
                  Trend analytics will render as historical evaluation quarters complete.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Grading threshold: Achieved (≥85%), Progressing (70-84%), Focus (&lt;70%)</span>
      </div>
    </div>
  );
};
