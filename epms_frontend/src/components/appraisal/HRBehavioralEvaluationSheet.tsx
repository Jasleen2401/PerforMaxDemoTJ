import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Save, Send, AlertCircle, CheckCircle2,
  Clock, ShieldAlert, Sparkles, HelpCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  useGetHRBehavioralEvaluationSheetQuery,
  useSaveHRBehavioralEvaluationMutation,
} from '../../features/appraisal/appraisalApi';

interface HRBehavioralEvaluationSheetProps {
  participantId: string;
  cycleId?: string;
  onBack: () => void;
  isCycleLocked?: boolean;
}

export const HRBehavioralEvaluationSheet: React.FC<HRBehavioralEvaluationSheetProps> = ({
  participantId,
  cycleId,
  onBack,
  isCycleLocked = false,
}) => {
  const { data: sheet, isLoading, isError, error, refetch } = useGetHRBehavioralEvaluationSheetQuery({
    participant_id: participantId,
    cycle_id: cycleId,
  });

  const [saveEvaluation, { isLoading: isSaving }] = useSaveHRBehavioralEvaluationMutation();

  const [scores, setScores] = useState<Record<string, string>>({});
  const [assessments, setAssessments] = useState<Record<string, string>>({});
  const [expandedRubrics, setExpandedRubrics] = useState<Record<string, boolean>>({});

  // Sync initial review data from backend
  useEffect(() => {
    if (sheet?.competencies) {
      const initialScores: Record<string, string> = {};
      const initialAssessments: Record<string, string> = {};
      sheet.competencies.forEach((comp) => {
        if (comp.review?.score !== null && comp.review?.score !== undefined) {
          initialScores[comp.competency_id] = comp.review.score.toString();
        }
        if (comp.review?.hr_assessment) {
          initialAssessments[comp.competency_id] = comp.review.hr_assessment;
        }
      });
      setScores(initialScores);
      setAssessments(initialAssessments);
    }
  }, [sheet]);

  const scaleMax = sheet?.rating_scale_max || 5.0;

  // Dynamic quick score anchor buttons derived from rating_scale_max
  const quickScoreOptions = useMemo(() => {
    const opts: number[] = [];
    const maxInt = Math.floor(scaleMax);
    for (let i = 0; i <= maxInt; i++) {
      opts.push(i);
    }
    if (scaleMax > maxInt && !opts.includes(scaleMax)) {
      opts.push(scaleMax);
    }
    return opts;
  }, [scaleMax]);

  const toggleRubric = (compId: string) => {
    setExpandedRubrics((prev) => ({ ...prev, [compId]: !prev[compId] }));
  };

  const handleScoreChange = (compId: string, value: string) => {
    setScores((prev) => ({ ...prev, [compId]: value }));
  };

  const handleAssessmentChange = (compId: string, value: string) => {
    setAssessments((prev) => ({ ...prev, [compId]: value }));
  };

  const handleSave = async (targetStatus: 'DRAFT' | 'SUBMITTED') => {
    if (!sheet) return;

    if (targetStatus === 'SUBMITTED') {
      const missingScores = sheet.competencies.filter((comp) => {
        const val = scores[comp.competency_id];
        if (val === undefined || val === null || val.trim() === '') return true;
        const num = parseFloat(val);
        return isNaN(num) || num < 0.0 || num > scaleMax;
      });

      if (missingScores.length > 0) {
        toast.error(
          `All ${sheet.competencies.length} Behavioral competencies must be scored between 0.00 and ${scaleMax} before submission. Missing: ${missingScores.length}.`
        );
        return;
      }
    }

    const reviews = sheet.competencies.map((comp) => {
      const val = scores[comp.competency_id];
      const parsed = val !== undefined && val !== null && val.trim() !== '' ? parseFloat(val) : null;
      return {
        competency_id: comp.competency_id,
        score: parsed !== null && !isNaN(parsed) ? parsed : null,
        hr_assessment: assessments[comp.competency_id] || '',
      };
    });

    try {
      const res = await saveEvaluation({
        participant_id: participantId,
        cycle_id: cycleId || sheet.cycle_id,
        status: targetStatus,
        reviews,
      }).unwrap();

      toast.success(res.message || `Behavioral evaluation ${targetStatus === 'SUBMITTED' ? 'submitted' : 'saved as draft'}.`);
      refetch();
    } catch (err: any) {
      const errMsg = err?.data?.detail || err?.data?.error || 'Failed to save evaluation.';
      toast.error(errMsg);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-xs">
        <Clock className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Loading Behavioral Evaluation Sheet...</h3>
        <p className="text-xs text-slate-400 mt-1">Retrieving candidate competencies, rubric descriptors, and existing drafts.</p>
      </div>
    );
  }

  if (isError || !sheet) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-xs max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Evaluation Sheet Unavailable</h3>
        <p className="text-xs text-slate-500 mt-1">
          {(error as any)?.data?.error || (error as any)?.data?.detail || 'Unable to load behavioral evaluation sheet.'}
        </p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const overallStatus = sheet.competencies.every((c) => c.review?.status === 'SUBMITTED') ? 'SUBMITTED' : 'DRAFT';
  const scoredCount = sheet.competencies.filter((c) => {
    const s = scores[c.competency_id];
    return s !== undefined && s !== null && s.trim() !== '';
  }).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Cohort Progress
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Behavioral Evaluation: {sheet.full_name}
            </h1>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
              {sheet.employee_code}
            </span>
            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100/50">
              {sheet.department || 'General'}
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                overallStatus === 'SUBMITTED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}
            >
              {overallStatus === 'SUBMITTED' ? 'Submitted' : 'Draft in Progress'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cycle: <span className="font-semibold text-slate-700">{sheet.cycle_name}</span> • Rating Scale: <span className="font-bold text-slate-700">0.00 – {scaleMax.toFixed(1)}</span> • Progress: <span className="font-bold text-slate-700">{scoredCount} / {sheet.competencies.length} Scored</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {isCycleLocked ? (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-500 text-xs font-bold rounded-xl">
              <ShieldAlert className="w-4 h-4 text-slate-400" />
              <span>Historical Cycle (Read-Only)</span>
            </div>
          ) : (
            <>
              <button
                onClick={() => handleSave('DRAFT')}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>Save Draft</span>
              </button>

              <button
                onClick={() => handleSave('SUBMITTED')}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Behavioral Evaluation</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Competencies List */}
      <div className="space-y-4">
        {sheet.competencies.map((comp, idx) => {
          const currentScore = scores[comp.competency_id] ?? '';
          const currentAssessment = assessments[comp.competency_id] ?? '';
          const isRubricOpen = expandedRubrics[comp.competency_id];
          const hasRubric = comp.rubric_descriptors && Object.keys(comp.rubric_descriptors).length > 0;

          return (
            <div
              key={comp.competency_id}
              className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 md:p-6 space-y-4 transition-all"
            >
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{comp.name}</h3>
                  </div>
                  {comp.description && (
                    <p className="text-xs text-slate-500 max-w-2xl">{comp.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                    Weight: {comp.weight}%
                  </span>
                  <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100/50">
                    Benchmark: {comp.benchmark_score.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Rubric Accordion */}
              {hasRubric && (
                <div className="bg-slate-50/70 rounded-xl border border-slate-100 p-3 text-xs">
                  <button
                    type="button"
                    onClick={() => toggleRubric(comp.competency_id)}
                    className="flex items-center justify-between w-full font-bold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      View Rubric Performance Descriptors
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      {isRubricOpen ? 'Hide' : 'Expand'}
                    </span>
                  </button>

                  {isRubricOpen && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                      {Object.entries(comp.rubric_descriptors).map(([lvl, desc]) => (
                        <div key={lvl} className="p-2.5 bg-white rounded-lg border border-slate-100 shadow-2xs">
                          <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                            Level {lvl}
                          </span>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-4 leading-relaxed">{desc}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Score Controls */}
              <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Rating Score (0.00 – {scaleMax.toFixed(2)})
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {quickScoreOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        disabled={isCycleLocked}
                        onClick={() => handleScoreChange(comp.competency_id, opt.toFixed(2))}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer disabled:opacity-50 ${
                          currentScore === opt.toFixed(2)
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.toFixed(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-36 space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-500">
                    Exact Score (2 decimals)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.00"
                    max={scaleMax}
                    disabled={isCycleLocked}
                    value={currentScore}
                    onChange={(e) => handleScoreChange(comp.competency_id, e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Qualitative Remarks */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-700">
                  HR Qualitative Assessment & Observations
                </label>
                <textarea
                  rows={2}
                  disabled={isCycleLocked}
                  value={currentAssessment}
                  onChange={(e) => handleAssessmentChange(comp.competency_id, e.target.value)}
                  placeholder="Record strengths, behavioral observations, or areas for development..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-800 disabled:opacity-50"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default HRBehavioralEvaluationSheet;