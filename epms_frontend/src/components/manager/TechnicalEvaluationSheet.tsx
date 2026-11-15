import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import {
  Sparkles,
  Save,
  Send,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  HelpCircle,
  Target,
  FileCheck2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  useGetTechnicalEvaluationSheetQuery,
  useSaveTechnicalEvaluationMutation,
} from '../../features/manager/managerApi';
import type { TechnicalCompetencyEvaluation } from '../../features/manager/managerApi';

interface TechnicalEvaluationSheetProps {
  participantId: string;
  cycleId?: string;
  onSaved?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

interface CompetencyFormState {
  score: number | null;
  mentor_assessment: string;
  evidence_url: string;
}

export const TechnicalEvaluationSheet: React.FC<TechnicalEvaluationSheetProps> = ({
  participantId,
  cycleId,
  onSaved,
  onDirtyChange,
}) => {
  const { data: sheet, isLoading, isError, error, refetch } = useGetTechnicalEvaluationSheetQuery({
    participant_id: participantId,
    cycle_id: cycleId,
  });

  const [saveTechnicalEvaluation, { isLoading: isSaving }] = useSaveTechnicalEvaluationMutation();

  // Local form state keyed by competency_id
  const [formState, setFormState] = useState<Record<string, CompetencyFormState>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [expandedRubrics, setExpandedRubrics] = useState<Record<string, boolean>>({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [missingCompIds, setMissingCompIds] = useState<string[]>([]);

  const competencyRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Sync initial state from sheet data
  useEffect(() => {
    if (sheet?.competencies) {
      const initial: Record<string, CompetencyFormState> = {};
      sheet.competencies.forEach((comp) => {
        initial[comp.competency_id] = {
          score: comp.review.score ?? null,
          mentor_assessment: comp.review.mentor_assessment || '',
          evidence_url: comp.review.evidence_url || '',
        };
      });
      setFormState(initial);
      setIsDirty(false);
      onDirtyChange?.(false);
      setMissingCompIds([]);
    }
  }, [sheet, onDirtyChange]);

  // Window beforeunload guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleFieldChange = (
    competencyId: string,
    field: keyof CompetencyFormState,
    value: any
  ) => {
    setFormState((prev) => {
      const updated = {
        ...prev,
        [competencyId]: {
          ...prev[competencyId],
          [field]: value,
        },
      };
      return updated;
    });
    if (!isDirty) {
      setIsDirty(true);
      onDirtyChange?.(true);
    }
    // Clear missing error for this competency if score is added
    if (field === 'score' && value !== null && value !== '') {
      setMissingCompIds((prev) => prev.filter((id) => id !== competencyId));
    }
  };

  const toggleRubric = (competencyId: string) => {
    setExpandedRubrics((prev) => ({
      ...prev,
      [competencyId]: !prev[competencyId],
    }));
  };

  const scaleMax = sheet?.rating_scale_max ?? 5.0;

  // Derive quick-score anchor options dynamically from the cycle's configured rating_scale_max
  const quickScoreOptions = useMemo(() => {
    const maxInt = Math.floor(scaleMax);
    const opts: number[] = [];
    for (let i = 0; i <= maxInt; i++) {
      opts.push(i);
    }
    if (scaleMax > maxInt && !opts.includes(scaleMax)) {
      opts.push(Number(scaleMax.toFixed(2)));
    }
    return opts;
  }, [scaleMax]);

  // Live average score calculation
  const liveAverageScore = useMemo(() => {
    if (!sheet?.competencies || sheet.competencies.length === 0) return null;
    let totalScore = 0;
    let count = 0;
    sheet.competencies.forEach((c) => {
      const s = formState[c.competency_id]?.score;
      if (s !== null && s !== undefined && !isNaN(s)) {
        totalScore += s;
        count++;
      }
    });
    return count > 0 ? (totalScore / count).toFixed(2) : null;
  }, [sheet, formState]);

  // Overall status derived from reviews
  const overallStatus = useMemo(() => {
    if (!sheet?.competencies || sheet.competencies.length === 0) return 'NOT_STARTED';
    const allSubmitted = sheet.competencies.every(
      (c) => c.review.status === 'SUBMITTED' && c.review.score !== null
    );
    if (allSubmitted) return 'SUBMITTED';
    const anyScored = sheet.competencies.some(
      (c) => c.review.score !== null || formState[c.competency_id]?.score !== null
    );
    return anyScored ? 'IN_PROGRESS' : 'NOT_STARTED';
  }, [sheet, formState]);

  // Save handler (DRAFT or SUBMITTED)
  const handleSave = async (targetStatus: 'DRAFT' | 'SUBMITTED') => {
    if (!sheet) return;

    if (targetStatus === 'SUBMITTED') {
      // Validate that all active competencies have valid scores within 0.00 to scaleMax
      const missing: string[] = [];
      sheet.competencies.forEach((c) => {
        const score = formState[c.competency_id]?.score;
        if (score === null || score === undefined || isNaN(score) || score < 0.00 || score > scaleMax) {
          missing.push(c.competency_id);
        }
      });

      if (missing.length > 0) {
        setMissingCompIds(missing);
        toast.error(
          `Cannot submit: ${missing.length} competencies require a valid score before submission.`
        );
        // Scroll to first missing competency
        const firstMissing = missing[0];
        competencyRefs.current[firstMissing]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        setShowSubmitConfirm(false);
        return;
      }
    }

    // Build payload
    const reviewsPayload = sheet.competencies.map((c) => {
      const state = formState[c.competency_id] || {
        score: null,
        mentor_assessment: '',
        evidence_url: '',
      };
      return {
        competency_id: c.competency_id,
        score: state.score,
        mentor_assessment: state.mentor_assessment?.trim() || '',
        evidence_url: state.evidence_url?.trim() || '',
      };
    });

    try {
      const res = await saveTechnicalEvaluation({
        participant_id: participantId,
        cycle_id: cycleId || sheet.cycle_id,
        status: targetStatus,
        reviews: reviewsPayload,
      }).unwrap();

      toast.success(
        targetStatus === 'SUBMITTED'
          ? 'Technical appraisal successfully finalized and submitted!'
          : 'Evaluation draft saved successfully.'
      );

      setIsDirty(false);
      onDirtyChange?.(false);
      setShowSubmitConfirm(false);
      refetch();
      onSaved?.();
    } catch (err: any) {
      const errorMsg =
        err?.data?.detail || err?.data?.error || 'Failed to save evaluation. Please try again.';
      toast.error(errorMsg);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mx-auto" />
        <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto" />
        <div className="space-y-4 pt-6">
          <div className="h-32 bg-slate-50 rounded-2xl" />
          <div className="h-32 bg-slate-50 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !sheet) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3">
        <AlertCircle size={32} className="mx-auto text-rose-500" />
        <h3 className="font-extrabold text-base text-slate-900">Failed to Load Evaluation Sheet</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          {(error as any)?.data?.error ||
            (error as any)?.data?.detail ||
            'You may not have technical evaluator permissions for this participant.'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-6">
      {/* Candidate Dossier Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-lg text-slate-900">{sheet.full_name}</h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              {sheet.employee_code}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
              {sheet.department || 'Engineering'}
            </span>
            {overallStatus === 'SUBMITTED' ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 size={12} />
                Submitted
              </span>
            ) : isDirty ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 flex items-center gap-1">
                <Clock size={12} />
                Unsaved Changes
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">
            Cycle: <strong className="text-slate-700">{sheet.cycle_name}</strong> &bull; Rating Scale:
            <strong className="text-purple-600 ml-1">0.00 &ndash; {scaleMax.toFixed(1)}</strong>
          </p>
        </div>

        {/* Live Average Score Pill & Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-1.5 rounded-xl bg-purple-50/70 border border-purple-100 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Average Score
            </div>
            <div className="text-sm font-extrabold text-purple-700">
              {liveAverageScore ? `${liveAverageScore} / ${scaleMax.toFixed(1)}` : 'Pending'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave('DRAFT')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Save size={14} />
              <span>Save Draft</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setShowSubmitConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Send size={14} />
              <span>Submit Evaluation</span>
            </button>
          </div>
        </div>
      </div>

      {/* Missing Competencies Alert */}
      {missingCompIds.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
          <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-800 space-y-1">
            <div className="font-bold">Incomplete Submission</div>
            <p>
              All active competencies must be scored before final submission. Please score the highlighted
              competencies below.
            </p>
          </div>
        </div>
      )}

      {/* Competency Evaluation Cards */}
      <div className="space-y-4">
        {sheet.competencies.map((comp, idx) => {
          const state = formState[comp.competency_id] || {
            score: null,
            mentor_assessment: '',
            evidence_url: '',
          };
          const isMissing = missingCompIds.includes(comp.competency_id);
          const isRubricExpanded = !!expandedRubrics[comp.competency_id];
          const hasRubrics = comp.rubric_descriptors && Object.keys(comp.rubric_descriptors).length > 0;

          return (
            <div
              key={comp.competency_id}
              ref={(el) => (competencyRefs.current[comp.competency_id] = el)}
              className={`p-5 rounded-2xl border transition-all ${
                isMissing
                  ? 'bg-rose-50/40 border-rose-300 ring-2 ring-rose-100'
                  : 'bg-slate-50/70 border-slate-200/80 hover:border-purple-200'
              }`}
            >
              {/* Competency Card Header */}
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-3 border-b border-slate-200/60">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-extrabold text-[11px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900">{comp.name}</h4>
                    <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-100">
                      {comp.weight}% Weight
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center gap-1">
                      <Target size={11} className="text-purple-600" />
                      Target: {comp.benchmark_score.toFixed(2)}
                    </span>
                  </div>
                  {comp.description && (
                    <p className="text-xs text-slate-600 leading-relaxed">{comp.description}</p>
                  )}
                </div>

                {/* Score Controls: Stepped Level Buttons + Precision Input */}
                <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Score (0.00 &ndash; {scaleMax.toFixed(1)})
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Stepped Quick-Select Buttons Derived Dynamically from Rating Scale */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                      {quickScoreOptions.map((val) => {
                        const isSelected = state.score !== null && Math.abs(state.score - val) < 0.001;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleFieldChange(comp.competency_id, 'score', val)}
                            className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-600 text-white shadow-2xs scale-105'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {Number.isInteger(val) ? val : val.toFixed(1)}
                          </button>
                        );
                      })}
                    </div>

                    {/* Precision Decimal Input Supporting 0.00 to rating_scale_max with 2 Decimals */}
                    <div className="relative">
                      <input
                        type="number"
                        min="0.00"
                        max={scaleMax}
                        step="0.01"
                        value={state.score !== null && state.score !== undefined ? state.score : ''}
                        onChange={(e) => {
                          const valStr = e.target.value;
                          if (valStr === '') {
                            handleFieldChange(comp.competency_id, 'score', null);
                          } else {
                            const val = parseFloat(valStr);
                            if (!isNaN(val)) {
                              handleFieldChange(comp.competency_id, 'score', val);
                            }
                          }
                        }}
                        placeholder="0.00"
                        className={`w-20 px-2.5 py-1 bg-white border rounded-xl text-center text-xs font-extrabold focus:outline-hidden ${
                          state.score !== null && (state.score < 0 || state.score > scaleMax)
                            ? 'border-rose-400 text-rose-600 focus:border-rose-500 ring-1 ring-rose-200'
                            : 'border-slate-200 text-purple-700 focus:border-purple-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Rubric Accordion */}
              {hasRubrics && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => toggleRubric(comp.competency_id)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-purple-700 hover:text-purple-800 transition-colors cursor-pointer"
                  >
                    <HelpCircle size={13} />
                    <span>{isRubricExpanded ? 'Hide Rubric Descriptors' : 'View Rubric Level Descriptors'}</span>
                    {isRubricExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {isRubricExpanded && (
                    <div className="mt-2.5 grid grid-cols-1 md:grid-cols-5 gap-2 p-3 bg-white rounded-xl border border-purple-100/80 shadow-2xs text-left">
                      {[1, 2, 3, 4, 5].map((lvl) => {
                        const descriptor =
                          comp.rubric_descriptors[String(lvl)] ||
                          comp.rubric_descriptors[lvl] ||
                          'No descriptor specified.';
                        const isActiveLevel = state.score !== null && Math.floor(state.score) === lvl;

                        return (
                          <div
                            key={lvl}
                            onClick={() => handleFieldChange(comp.competency_id, 'score', lvl)}
                            className={`p-2.5 rounded-lg border text-xs space-y-1 transition-all cursor-pointer ${
                              isActiveLevel
                                ? 'bg-purple-50/80 border-purple-300 ring-1 ring-purple-200'
                                : 'bg-slate-50/50 border-slate-100 hover:bg-slate-100/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-[11px] text-purple-700">
                                Level {lvl}
                              </span>
                              {isActiveLevel && (
                                <CheckCircle2 size={12} className="text-purple-600" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 leading-snug">{descriptor}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Evidence & Assessment Row */}
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Evidence Picker */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <LinkIcon size={12} className="text-slate-400" />
                      Supporting Evidence
                    </span>
                    {state.evidence_url && (
                      <a
                        href={state.evidence_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-600 hover:text-purple-700 text-[10px] flex items-center gap-1"
                      >
                        <span>Preview Link</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </label>

                  {/* Evidence Selection Dropdown if available */}
                  {sheet.available_evidence && sheet.available_evidence.length > 0 && (
                    <select
                      onChange={(e) => {
                        const url = e.target.value;
                        if (url) {
                          handleFieldChange(comp.competency_id, 'evidence_url', url);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-purple-300 mb-1"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        -- Select Approved Candidate Evidence --
                      </option>
                      {sheet.available_evidence.map((ev) => (
                        <option key={ev.id} value={ev.external_url || ''}>
                          [{ev.review_status}] {ev.title}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="url"
                    value={state.evidence_url}
                    onChange={(e) =>
                      handleFieldChange(comp.competency_id, 'evidence_url', e.target.value)
                    }
                    placeholder="https://github.com/... or paste evidence link"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-purple-300"
                  />
                </div>

                {/* Mentor Qualitative Assessment */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Mentor Remarks & Assessment
                  </label>
                  <textarea
                    rows={2}
                    value={state.mentor_assessment}
                    onChange={(e) =>
                      handleFieldChange(comp.competency_id, 'mentor_assessment', e.target.value)
                    }
                    placeholder="Detailed observations on technical execution, code quality, and delivery..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-purple-300 resize-none"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto">
              <FileCheck2 size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-slate-900">
                Confirm Technical Evaluation Submission
              </h3>
              <p className="text-xs text-slate-500">
                You are about to submit the final technical evaluation for{' '}
                <strong className="text-slate-800">{sheet.full_name}</strong>. Once submitted, these
                scores will be locked for appraisal scoring calculation.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 flex items-center justify-between">
              <span>Average Evaluation Score:</span>
              <strong className="text-purple-700 font-extrabold text-sm">
                {liveAverageScore || 'N/A'} / {scaleMax.toFixed(1)}
              </strong>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave('SUBMITTED')}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSaving ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
