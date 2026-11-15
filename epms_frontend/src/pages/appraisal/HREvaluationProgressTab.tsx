import React, { useState, useMemo } from 'react';
import {
  Users, CheckCircle2, Clock, AlertCircle, Search, Filter,
  ShieldAlert, RefreshCw, ChevronRight, Award, Languages,
  HelpCircle, UserCheck, AlertTriangle
} from 'lucide-react';
import { useAppraisalWorkspace } from './AppraisalWorkspaceContext';
import {
  useGetHREvaluationProgressQuery,
  type ProgressParticipantItem,
} from '../../features/appraisal/appraisalApi';
import { HRBehavioralEvaluationSheet } from '../../components/appraisal/HRBehavioralEvaluationSheet';
import { HRCalibrationDeskModal } from '../../components/appraisal/HRCalibrationDeskModal';

export const HREvaluationProgressTab: React.FC = () => {
  const { activeCycle } = useAppraisalWorkspace();

  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [calibrationModalParticipant, setCalibrationModalParticipant] = useState<ProgressParticipantItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'NEEDS_TECH' | 'NEEDS_BEHAV' | 'WAITING_JP' | 'UNASSIGNED'>('ALL');

  const {
    data: progressData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetHREvaluationProgressQuery(
    { cycle_id: activeCycle?.id || '' },
    { skip: !activeCycle?.id }
  );

  const isCycleLocked =
    activeCycle?.status === 'FINALIZED' ||
    activeCycle?.status === 'PUBLISHED' ||
    activeCycle?.status === 'CLOSED';

  // Extract unique departments
  const departments = useMemo(() => {
    if (!progressData?.participants) return [];
    const depts = new Set<string>();
    progressData.participants.forEach((p) => {
      if (p.department) depts.add(p.department);
    });
    return Array.from(depts);
  }, [progressData]);

  // Filter participants
  const filteredParticipants = useMemo(() => {
    if (!progressData?.participants) return [];
    return progressData.participants.filter((p) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.full_name.toLowerCase().includes(q);
        const matchesCode = p.employee_code.toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }

      // Department filter
      if (selectedDept !== 'ALL' && p.department !== selectedDept) {
        return false;
      }

      // Status pill filter
      if (statusFilter === 'READY') {
        return p.is_ready_for_review;
      }
      if (statusFilter === 'NEEDS_TECH') {
        return p.technical.status !== 'SUBMITTED';
      }
      if (statusFilter === 'NEEDS_BEHAV') {
        return p.behavioral.status !== 'SUBMITTED';
      }
      if (statusFilter === 'WAITING_JP') {
        return p.japanese.is_blocking;
      }
      if (statusFilter === 'UNASSIGNED') {
        return !p.technical_evaluator_assigned || !p.behavioral_evaluator_assigned;
      }

      return true;
    });
  }, [progressData, searchQuery, selectedDept, statusFilter]);

  // If a participant is selected, open the dedicated Behavioral Evaluation Sheet
  if (selectedParticipantId && activeCycle) {
    return (
      <HRBehavioralEvaluationSheet
        participantId={selectedParticipantId}
        cycleId={activeCycle.id}
        onBack={() => {
          setSelectedParticipantId(null);
          refetch();
        }}
        isCycleLocked={isCycleLocked}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-xs">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Loading Cohort Evaluation Progress...</h3>
        <p className="text-xs text-slate-400 mt-1">
          Aggregating live technical, behavioral, and Japanese evaluation telemetry.
        </p>
      </div>
    );
  }

  if (isError || !progressData) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-xs max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Progress Telemetry Unavailable</h3>
        <p className="text-xs text-slate-500 mt-1">
          {(error as any)?.data?.error || (error as any)?.data?.detail || 'Unable to load evaluation progress.'}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { summary, configuration_health } = progressData;

  return (
    <div className="space-y-6">
      {/* Configuration Health Warning (if any) */}
      {!configuration_health.is_valid && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-900">
              Cycle Configuration Health Issues Detected
            </h4>
            <p className="text-xs text-amber-700 leading-relaxed">
              The following configuration issues prevent candidate evaluations from becoming review-ready:
            </p>
            <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5 mt-1 font-medium">
              {configuration_health.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ready for Review */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Ready for Review
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900">{summary.fully_ready_count}</span>
              <span className="text-xs font-semibold text-slate-400">/ {summary.total_participants}</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500">
              {summary.total_participants > 0
                ? Math.round((summary.fully_ready_count / summary.total_participants) * 100)
                : 0}
              % Cohort Complete
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Technical Progress */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Technical Evals
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {summary.technical_summary.submitted}
              </span>
              <span className="text-xs font-semibold text-slate-400">/ {summary.total_participants}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-semibold text-slate-500">
                {summary.technical_summary.in_progress} in progress
              </span>
              {summary.technical_summary.unassigned_evaluators > 0 && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">
                  {summary.technical_summary.unassigned_evaluators} unassigned
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Behavioral Progress */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Behavioral Evals
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {summary.behavioral_summary.submitted}
              </span>
              <span className="text-xs font-semibold text-slate-400">/ {summary.total_participants}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-semibold text-slate-500">
                {summary.behavioral_summary.in_progress} in progress
              </span>
              {summary.behavioral_summary.unassigned_evaluators > 0 && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">
                  {summary.behavioral_summary.unassigned_evaluators} unassigned
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Japanese Track */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Japanese Track
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {summary.japanese_summary.accepted}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {summary.japanese_summary.mode === 'MANDATORY' ? `Accepted (${summary.total_participants})` : 'Optional'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {summary.japanese_summary.mode === 'MANDATORY' ? (
                summary.japanese_summary.blocking_count > 0 ? (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                    {summary.japanese_summary.blocking_count} blocking
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                    All Accepted
                  </span>
                )
              ) : summary.japanese_summary.mode === 'OPTIONAL' ? (
                <span className="text-[10px] font-semibold text-slate-500">Non-blocking track</span>
              ) : (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">
                  Unconfigured
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Languages className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          {(['ALL', 'READY', 'NEEDS_TECH', 'NEEDS_BEHAV', 'WAITING_JP', 'UNASSIGNED'] as const).map((st) => {
            const labels = {
              ALL: 'All Participants',
              READY: 'Ready for Review',
              NEEDS_TECH: 'Needs Technical',
              NEEDS_BEHAV: 'Needs Behavioral',
              WAITING_JP: 'Waiting Japanese',
              UNASSIGNED: 'Unassigned Evaluators',
            };
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {labels[st]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* Department Filter */}
          {departments.length > 0 && (
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}

          {/* Search Input */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Cohort Progress Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Candidate</th>
                <th className="py-3.5 px-4">Technical Progress</th>
                <th className="py-3.5 px-4">Behavioral Progress</th>
                <th className="py-3.5 px-4">Japanese Track</th>
                <th className="py-3.5 px-4 text-center">Review Readiness</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParticipants.map((p) => {
                const techBadgeClass =
                  p.technical.status === 'SUBMITTED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : p.technical.status === 'IN_PROGRESS'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                    : p.technical.status === 'UNCONFIGURED'
                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                    : 'bg-slate-100 text-slate-600 border-slate-200';

                const behavBadgeClass =
                  p.behavioral.status === 'SUBMITTED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : p.behavioral.status === 'IN_PROGRESS'
                    ? 'bg-purple-50 text-purple-700 border-purple-100'
                    : p.behavioral.status === 'UNCONFIGURED'
                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                    : 'bg-slate-100 text-slate-600 border-slate-200';

                return (
                  <tr key={p.participant_id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Candidate */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 text-xs">{p.full_name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="font-mono">{p.employee_code}</span>
                          <span>•</span>
                          <span>{p.department || 'General'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Technical Progress */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1 max-w-[170px]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`px-2 py-0.5 rounded-md font-bold border text-[10px] ${techBadgeClass}`}>
                            {p.technical.status}
                          </span>
                          <span className="font-semibold text-slate-500">
                            {p.technical.scored_competencies}/{p.technical.total_competencies}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate" title={p.technical.evaluator_name || 'Unassigned'}>
                          Mentor: <span className="font-medium text-slate-700">{p.technical.evaluator_name || 'Unassigned'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Behavioral Progress */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1 max-w-[170px]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`px-2 py-0.5 rounded-md font-bold border text-[10px] ${behavBadgeClass}`}>
                            {p.behavioral.status}
                          </span>
                          <span className="font-semibold text-slate-500">
                            {p.behavioral.scored_competencies}/{p.behavioral.total_competencies}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate" title={p.behavioral.evaluator_name || 'HR Team'}>
                          HR: <span className="font-medium text-slate-700">{p.behavioral.evaluator_name || 'HR Team'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Japanese Track */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1 max-w-[170px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                              p.japanese.status === 'ACCEPTED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : p.japanese.is_blocking
                                ? 'bg-rose-50 text-rose-700 border-rose-100'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {p.japanese.status_display}
                          </span>
                        </div>
                        {p.japanese.overall_score !== null && (
                          <div className="text-[10px] font-semibold text-slate-500">
                            Score: <span className="font-bold text-slate-700">{p.japanese.overall_score.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Review Readiness (4-State Precedence) */}
                    <td className="py-3.5 px-4 text-center">
                      {p.publication_status === 'PUBLISHED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Published
                        </span>
                      ) : p.publication_status === 'READY_TO_PUBLISH' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Ready to Publish
                        </span>
                      ) : p.publication_status === 'BLOCKED' ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 cursor-help"
                          title={p.configuration_blockers?.join(' • ') || p.readiness_blockers.join(' • ')}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Blocked ({p.configuration_blockers?.length || p.readiness_blockers.length})
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 cursor-help"
                          title={p.evaluation_incomplete_reasons?.join(' • ') || p.readiness_blockers.join(' • ')}
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> Incomplete ({p.evaluation_incomplete_reasons?.length || p.readiness_blockers.length})
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {p.publication_status === 'PUBLISHED' ? (
                        <button
                          type="button"
                          onClick={() => setCalibrationModalParticipant(p)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          <span>Scorecard</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : p.publication_status === 'READY_TO_PUBLISH' ? (
                        <button
                          type="button"
                          onClick={() => setCalibrationModalParticipant(p)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                        >
                          <span>Calibrate & Publish</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : p.publication_status === 'BLOCKED' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCalibrationModalParticipant(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            title="Inspect blockers and evidence"
                          >
                            <span>Blockers</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedParticipantId(p.participant_id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                          >
                            <span>Evaluate</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedParticipantId(p.participant_id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          <span>Evaluate</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredParticipants.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No participants matched the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* HR Calibration & Publication Desk Modal */}
      {calibrationModalParticipant && activeCycle && (
        <HRCalibrationDeskModal
          isOpen={Boolean(calibrationModalParticipant)}
          onClose={() => setCalibrationModalParticipant(null)}
          cycleId={activeCycle.id}
          participantId={calibrationModalParticipant.participant_id}
          participantName={calibrationModalParticipant.full_name}
          employeeCode={calibrationModalParticipant.employee_code}
          department={calibrationModalParticipant.department}
          publicationStatus={calibrationModalParticipant.publication_status}
          publishedAt={calibrationModalParticipant.appraisal?.published_at}
          configurationBlockers={calibrationModalParticipant.configuration_blockers}
          initialScorecard={calibrationModalParticipant.scorecard}
        />
      )}
    </div>
  );
};
export default HREvaluationProgressTab;