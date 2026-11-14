// epms_frontend/src/pages/appraisal/EvaluatorAssignmentTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserCheck, RefreshCw, Zap, AlertCircle, CheckCircle2,
  HelpCircle, ShieldAlert, Award
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAppraisalWorkspace } from './AppraisalWorkspaceContext';
import {
  appraisalWorkspaceService,
} from '../../features/appraisal/appraisalWorkspaceService';
import type {
  EvaluatorMatrixResponse,
  EvaluatorMatrixRow,
} from '../../features/appraisal/appraisalWorkspaceService';

export const EvaluatorAssignmentTab: React.FC = () => {
  const { activeCycle, refreshReadiness } = useAppraisalWorkspace();

  const [matrixData, setMatrixData] = useState<EvaluatorMatrixResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoAssigning, setAutoAssigning] = useState<boolean>(false);
  const [updatingParticipantId, setUpdatingParticipantId] = useState<string | null>(null);

  const isLocked = activeCycle?.status === 'FINALIZED' ||
    activeCycle?.status === 'PUBLISHED' ||
    activeCycle?.status === 'CLOSED';

  const loadMatrix = useCallback(async () => {
    if (!activeCycle?.id) return;
    try {
      setLoading(true);
      const data = await appraisalWorkspaceService.getEvaluatorMatrix(activeCycle.id);
      setMatrixData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load evaluator assignment matrix';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [activeCycle?.id]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  // 1-Click Auto-Assignment
  const handleAutoAssign = async () => {
    if (!activeCycle?.id) return;
    try {
      setAutoAssigning(true);
      const result = await appraisalWorkspaceService.autoAssignEvaluators(activeCycle.id);
      let summaryMsg = `Auto-assignment completed! Tech: ${result.technical_assigned}, Beh: ${result.behavioral_assigned}`;
      if (result.preserved_manual_count && result.preserved_manual_count > 0) {
        summaryMsg += `, Preserved Manual: ${result.preserved_manual_count}`;
      }
      if (activeCycle.japanese_evaluation_mandatory) {
        summaryMsg += `, Japanese: ${result.japanese_assigned} (${result.ambiguous_japanese_count} ambiguous)`;
      }
      toast.success(summaryMsg);
      await loadMatrix();
      await refreshReadiness();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to auto-assign evaluators';
      toast.error(msg);
    } finally {
      setAutoAssigning(false);
    }
  };

  // Manual Evaluator Assignment / Dropdown Override
  const handleAssignChange = async (
    participantId: string,
    section: 'TECHNICAL' | 'BEHAVIORAL' | 'JAPANESE',
    evaluatorId: string
  ) => {
    if (!activeCycle?.id) return;
    try {
      setUpdatingParticipantId(`${participantId}-${section}`);
      const payload = {
        participant_id: participantId,
        section,
        evaluator_id: evaluatorId || null,
        is_mandatory: true,
      };
      await appraisalWorkspaceService.assignEvaluator(activeCycle.id, payload);
      toast.success(`Evaluator updated for ${section.toLowerCase()} evaluation.`);
      await loadMatrix();
      await refreshReadiness();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to assign evaluator';
      toast.error(msg);
    } finally {
      setUpdatingParticipantId(null);
    }
  };

  if (!activeCycle) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-xs">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">No Cycle Selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Select or create an appraisal cycle to view and configure evaluator assignments.
        </p>
      </div>
    );
  }

  const summary = matrixData?.summary || {
    total_participants: 0,
    fully_assigned_count: 0,
    technical_assigned_count: 0,
    behavioral_assigned_count: 0,
    japanese_assigned_count: 0,
    ambiguous_japanese_count: 0,
    unassigned_count: 0,
  };

  const isJapaneseMandatory = activeCycle.japanese_evaluation_mandatory === true;

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                Tab 5 · Assignments
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-semibold text-slate-600">{activeCycle.name}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Cohort Evaluator Assignment Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Assign responsible mentors and designated Japanese instructors for each enrolled intern.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={loadMatrix}
              disabled={loading}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Refresh assignment matrix"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {!isLocked && (
              <button
                onClick={handleAutoAssign}
                disabled={autoAssigning || summary.total_participants === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-current" />
                {autoAssigning ? 'Auto-Assigning...' : '1-Click Auto-Assign Mentors'}
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Enrolled Interns</span>
            <div className="text-base font-black text-slate-800 mt-0.5">{summary.total_participants}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fully Assigned</span>
            <div className="text-base font-black text-emerald-600 mt-0.5">
              {summary.fully_assigned_count} / {summary.total_participants}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Technical Evaluators</span>
            <div className="text-base font-black text-slate-800 mt-0.5">
              {summary.technical_assigned_count} <span className="text-xs font-normal text-slate-400">assigned</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Behavioral Evaluators</span>
            <div className="text-base font-black text-slate-800 mt-0.5">
              {summary.behavioral_assigned_count} <span className="text-xs font-normal text-slate-400">assigned</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Japanese Instructors</span>
            <div className="text-base font-black text-slate-800 mt-0.5">
              {isJapaneseMandatory ? (
                <span>{summary.japanese_assigned_count} assigned</span>
              ) : (
                <span className="text-xs text-slate-400">Not Mandatory</span>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ambiguities</span>
            <div className={`text-base font-black mt-0.5 ${
              summary.ambiguous_japanese_count > 0 ? 'text-amber-600' : 'text-slate-400'
            }`}>
              {summary.ambiguous_japanese_count} <span className="text-xs font-normal text-slate-400">conflicts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cohort Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Assigned Evaluator Matrix ({matrixData?.matrix?.length || 0} participants)
            </h3>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Auto-assignment links managers to Technical/Behavioral and batch instructors to Japanese.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-semibold">Loading evaluator matrix...</p>
          </div>
        ) : !matrixData || matrixData.matrix.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-700">No participants enrolled in this cycle.</p>
            <p className="mt-1">Enroll interns in Tab 3 (Cohort Enrollment) to begin assigning evaluators.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 sm:px-6">Intern</th>
                  <th className="py-3 px-4">Designated Manager</th>
                  <th className="py-3 px-4">Technical Evaluator</th>
                  <th className="py-3 px-4">Behavioral Evaluator</th>
                  <th className="py-3 px-4 sm:px-6">Japanese Language Track</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {matrixData.matrix.map((row: EvaluatorMatrixRow) => {
                  const techEvaluatorId = row.assignments.technical?.evaluator_id || '';
                  const behavEvaluatorId = row.assignments.behavioral?.evaluator_id || '';
                  const jpEvaluatorId = row.assignments.japanese?.evaluator_id || '';

                  // Japanese instructors eligible for this specific intern (from their batches)
                  const internEligibleInstructors: { id: string; full_name: string; username: string }[] = [];
                  const seenIds = new Set<string>();
                  row.japanese_batches?.forEach((b) => {
                    b.instructors?.forEach((inst) => {
                      if (!seenIds.has(inst.id)) {
                        seenIds.add(inst.id);
                        internEligibleInstructors.push({
                          id: inst.id,
                          full_name: inst.full_name || inst.username,
                          username: inst.username,
                        });
                      }
                    });
                  });

                  return (
                    <tr key={row.participant_id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Intern Info */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-bold text-slate-900">{row.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {row.employee_code} · {row.department || 'General'}
                        </div>
                      </td>

                      {/* Designated Manager */}
                      <td className="py-3.5 px-4">
                        {row.manager ? (
                          <div>
                            <span className="font-semibold text-slate-800">{row.manager.full_name}</span>
                            <div className="text-[10px] text-slate-400">@{row.manager.username}</div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            No Manager Configured
                          </span>
                        )}
                      </td>

                      {/* Technical Evaluator Selector */}
                      <td className="py-3.5 px-4">
                        <div className="relative min-w-[170px]">
                          <select
                            disabled={isLocked || updatingParticipantId === `${row.participant_id}-TECHNICAL`}
                            value={techEvaluatorId}
                            onChange={(e) =>
                              handleAssignChange(row.participant_id, 'TECHNICAL', e.target.value)
                            }
                            className={`w-full px-2.5 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer ${
                              techEvaluatorId
                                ? 'bg-white border-slate-200 text-slate-800 font-semibold'
                                : 'bg-red-50/40 border-red-200 text-red-700'
                            }`}
                          >
                            <option value="">— Select Evaluator —</option>
                            {matrixData.available_mentors.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.full_name || m.username} ({m.role})
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Behavioral Evaluator Selector */}
                      <td className="py-3.5 px-4">
                        <div className="relative min-w-[170px]">
                          <select
                            disabled={isLocked || updatingParticipantId === `${row.participant_id}-BEHAVIORAL`}
                            value={behavEvaluatorId}
                            onChange={(e) =>
                              handleAssignChange(row.participant_id, 'BEHAVIORAL', e.target.value)
                            }
                            className={`w-full px-2.5 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer ${
                              behavEvaluatorId
                                ? 'bg-white border-slate-200 text-slate-800 font-semibold'
                                : 'bg-red-50/40 border-red-200 text-red-700'
                            }`}
                          >
                            <option value="">— Select Evaluator —</option>
                            {matrixData.available_mentors.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.full_name || m.username} ({m.role})
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Japanese Language Track Column */}
                      <td className="py-3.5 px-4 sm:px-6">
                        {!isJapaneseMandatory ? (
                          <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                            Not Mandatory (Standard Track)
                          </span>
                        ) : (
                          <div className="space-y-1.5">
                            {/* Batch Info & Status Badge */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                                  row.japanese_status.status_badge === 'ASSIGNED'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : row.japanese_status.status_badge === 'AMBIGUOUS'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                {row.japanese_status.status_badge === 'ASSIGNED'
                                  ? 'Assigned'
                                  : row.japanese_status.status_badge === 'AMBIGUOUS'
                                  ? `Ambiguous (${row.batch_instructors_count} Instructors)`
                                  : 'Unassigned'}
                              </span>

                              {/* Live Evaluation Status Pill if exists */}
                              {row.japanese_status.evaluation_status && (
                                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-100">
                                  Eval: {row.japanese_status.evaluation_status}
                                  {row.japanese_status.overall_score && ` (${row.japanese_status.overall_score})`}
                                </span>
                              )}
                            </div>

                            {/* Dropdown with intern-specific batch instructors */}
                            <div className="relative min-w-[170px]">
                              <select
                                disabled={isLocked || updatingParticipantId === `${row.participant_id}-JAPANESE`}
                                value={jpEvaluatorId}
                                onChange={(e) =>
                                  handleAssignChange(row.participant_id, 'JAPANESE', e.target.value)
                                }
                                className={`w-full px-2.5 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer ${
                                  jpEvaluatorId
                                    ? 'bg-white border-slate-200 text-slate-800 font-semibold'
                                    : 'bg-red-50/40 border-red-200 text-red-700'
                                }`}
                              >
                                <option value="">— Select Batch Sensei —</option>
                                {internEligibleInstructors.map((inst) => (
                                  <option key={inst.id} value={inst.id}>
                                    {inst.full_name} (@{inst.username})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Batch name hint */}
                            {row.japanese_batches && row.japanese_batches.length > 0 && (
                              <div className="text-[10px] text-slate-400">
                                Batch: {row.japanese_batches.map((b) => b.name).join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
