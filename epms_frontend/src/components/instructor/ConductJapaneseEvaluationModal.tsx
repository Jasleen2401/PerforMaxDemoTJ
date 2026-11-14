// src/components/instructor/ConductJapaneseEvaluationModal.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Award,
  AlertCircle,
  Save,
  Send,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  useGetJapaneseEvalCriteriaQuery,
  useGetJapaneseInternsQuery,
  useGetJapaneseDashboardQuery,
  useCreateJapaneseEvaluationMutation,
  useUpdateJapaneseEvaluationMutation,
  useSubmitJapaneseEvaluationMutation,
} from "../../features/japanese/japaneseApi";
import type { JapaneseEvaluation, EvaluationStatus } from "../../features/japanese/types";

interface ConductJapaneseEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation?: JapaneseEvaluation | null;
  internId?: string;
  internName?: string;
  cycleId?: string;
}

export const ConductJapaneseEvaluationModal: React.FC<ConductJapaneseEvaluationModalProps> = ({
  isOpen,
  onClose,
  evaluation,
  internId,
  internName,
  cycleId,
}) => {
  const { data: dashboardData } = useGetJapaneseDashboardQuery();
  const { data: internsList = [] } = useGetJapaneseInternsQuery();

  const [selectedInternId, setSelectedInternId] = useState<string>(
    evaluation?.intern || internId || ""
  );

  useEffect(() => {
    if (evaluation?.intern) {
      setSelectedInternId(evaluation.intern);
    } else if (internId) {
      setSelectedInternId(internId);
    } else if (!selectedInternId && internsList.length > 0) {
      setSelectedInternId(internsList[0].id);
    }
  }, [evaluation, internId, internsList, selectedInternId]);

  const activeCycleId = evaluation?.cycle || cycleId || dashboardData?.activeCycle?.id || "";
  const { data: criteriaList = [] } = useGetJapaneseEvalCriteriaQuery(
    activeCycleId ? { cycle: activeCycleId } : undefined
  );

  const safeCriteria = useMemo(() => {
    if (Array.isArray(criteriaList)) return criteriaList;
    if (criteriaList && Array.isArray((criteriaList as any).results)) return (criteriaList as any).results;
    return [];
  }, [criteriaList]);

  const [createEval, { isLoading: isCreating }] = useCreateJapaneseEvaluationMutation();
  const [updateEval, { isLoading: isUpdating }] = useUpdateJapaneseEvaluationMutation();
  const [submitEval, { isLoading: isSubmitting }] = useSubmitJapaneseEvaluationMutation();

  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [strengths, setStrengths] = useState("");
  const [areasForImprovement, setAreasForImprovement] = useState("");
  const [instructorRemarks, setInstructorRemarks] = useState("");
  const [developmentalFeedback, setDevelopmentalFeedback] = useState("");
  const [feedbackVisible, setFeedbackVisible] = useState(true);
  const [jlptSummary, setJlptSummary] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  useEffect(() => {
    if (evaluation) {
      setStrengths(evaluation.strengths || "");
      setAreasForImprovement(evaluation.areas_for_improvement || "");
      setInstructorRemarks(evaluation.instructor_remarks || "");
      setDevelopmentalFeedback(evaluation.developmental_feedback || "");
      setFeedbackVisible(evaluation.is_developmental_feedback_visible ?? true);
      setJlptSummary(evaluation.jlpt_status_summary || "");

      const scoreMap: Record<string, number> = {};
      const commentMap: Record<string, string> = {};
      if (evaluation.ratings && evaluation.ratings.length > 0) {
        evaluation.ratings.forEach((r) => {
          scoreMap[r.criterion] = Number(r.score) || 0;
          commentMap[r.criterion] = r.comments || "";
        });
      }
      setScores(scoreMap);
      setComments(commentMap);
    } else {
      setStrengths("");
      setAreasForImprovement("");
      setInstructorRemarks("");
      setDevelopmentalFeedback("");
      setFeedbackVisible(true);
      setJlptSummary("");
      setScores({});
      setComments({});
    }
  }, [evaluation, isOpen]);

  // Compute live weighted average score
  const computedAverage = useMemo(() => {
    if (!safeCriteria.length) return null;
    let totalScore = 0;
    let totalWeight = 0;
    safeCriteria.forEach((c) => {
      const s = scores[c.id];
      if (typeof s === "number" && s > 0) {
        const w = Number(c.weight) || 25;
        totalScore += s * (w / 100);
        totalWeight += w;
      }
    });
    if (totalWeight === 0) return null;
    return totalScore.toFixed(2);
  }, [safeCriteria, scores]);

  if (!isOpen) return null;

  const currentIntern = internsList.find((i) => i.id === selectedInternId);
  const targetInternId = evaluation?.intern || selectedInternId;
  const displayName = evaluation?.intern_name || currentIntern?.fullName || internName || "Assigned Intern";
  const displayCode = evaluation?.intern_code || currentIntern?.employeeCode || "";
  const displayBatch = evaluation?.batch_name || currentIntern?.batchName || "";
  const displaySubBatch = evaluation?.sub_batch_code || currentIntern?.subBatchCode || "";
  const submittedEvidence = evaluation?.submitted_evidence || [];

  const handleScoreChange = (critId: string, val: number) => {
    setScores((prev) => ({ ...prev, [critId]: Math.max(0, Math.min(10, val)) }));
  };

  const handleCommentChange = (critId: string, text: string) => {
    setComments((prev) => ({ ...prev, [critId]: text }));
  };

  const buildPayload = (status: EvaluationStatus) => {
    const ratings_data = safeCriteria.map((c) => ({
      criterion: c.id,
      score: scores[c.id] ?? 0,
      comments: comments[c.id] ?? "",
    }));

    return {
      intern: targetInternId,
      cycle: activeCycleId,
      status,
      strengths,
      areas_for_improvement: areasForImprovement,
      instructor_remarks: instructorRemarks,
      developmental_feedback: developmentalFeedback,
      is_developmental_feedback_visible: feedbackVisible,
      jlpt_status_summary: jlptSummary,
      ratings_data,
    };
  };

  const handleSaveDraft = async () => {
    try {
      const payload = buildPayload("DRAFT");
      if (evaluation?.id) {
        await updateEval({ id: evaluation.id, data: payload }).unwrap();
      } else {
        await createEval(payload).unwrap();
      }
      toast.success("Evaluation saved as draft successfully.");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to save draft.");
    }
  };

  const handleConfirmSubmit = async () => {
    try {
      const missingCriteria = safeCriteria.filter((c) => !scores[c.id] || scores[c.id] <= 0);
      if (missingCriteria.length > 0) {
        toast.warning("Please provide ratings for all criteria before submitting.");
        setShowConfirmSubmit(false);
        return;
      }

      let evalId = evaluation?.id;
      const targetStatus: EvaluationStatus = "SUBMITTED";
      const payload = buildPayload(targetStatus);

      if (evalId) {
        await updateEval({ id: evalId, data: payload }).unwrap();
      } else {
        const created = await createEval(payload).unwrap();
        evalId = created.id;
      }

      if (evalId) {
        await submitEval(evalId).unwrap();
      }
      toast.success("Evaluation submitted to HR review queue!");
      setShowConfirmSubmit(false);
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to submit evaluation.");
      setShowConfirmSubmit(false);
    }
  };

  const isSaving = isCreating || isUpdating || isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Award size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Japanese Language Evaluation</h2>
                <span
                  className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    evaluation?.status === "SUBMITTED" || evaluation?.status === "RESUBMITTED"
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : evaluation?.status === "ACCEPTED"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : evaluation?.status === "PENDING"
                      ? "bg-amber-100 text-amber-700 border border-amber-200"
                      : "bg-purple-100 text-purple-700 border border-purple-200"
                  }`}
                >
                  {evaluation?.status === "DRAFT"
                    ? "Draft"
                    : evaluation?.status_display || evaluation?.status || "Draft"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Intern: <span className="font-semibold text-slate-800">{displayName}</span>
                {displayCode ? ` • ID: ${displayCode}` : ""}
                {displayBatch ? ` • ${displayBatch}` : ""}
                {displaySubBatch ? ` (${displaySubBatch})` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs text-slate-700">
          {/* Intern Selection for New Evaluation */}
          {!evaluation && (
            <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl space-y-2">
              <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider">
                Select Intern to Evaluate
              </label>
              <select
                value={selectedInternId}
                onChange={(e) => setSelectedInternId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="" disabled>Select an intern from your assigned batches...</option>
                {internsList.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.fullName} ({i.employeeCode}) — {i.batchName || "Batch"} {i.subBatchCode ? `(${i.subBatchCode})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Intern Practice Evidence Review Collapsible */}
          {submittedEvidence.length > 0 && (
            <div className="border border-purple-100 rounded-2xl bg-purple-50/40 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowEvidence(!showEvidence)}
                className="w-full p-3.5 flex items-center justify-between font-bold text-xs text-purple-900 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-purple-600" />
                  <span>Submitted Intern Practice Evidence ({submittedEvidence.length} items)</span>
                </div>
                {showEvidence ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showEvidence && (
                <div className="p-3.5 pt-0 border-t border-purple-100/60 divide-y divide-purple-100/60">
                  {submittedEvidence.map((ev) => (
                    <div key={ev.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{ev.topic_title}</div>
                        {ev.notes && <p className="text-[11px] text-slate-500 italic mt-0.5">"{ev.notes}"</p>}
                        {ev.submitted_at && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Submitted: {new Date(ev.submitted_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {ev.score !== null && (
                          <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            {ev.score} / {ev.max_score}
                          </span>
                        )}
                        {ev.external_url && (
                          <a
                            href={ev.external_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple-600 hover:text-purple-800"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Criteria Ratings Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  HR Japanese Competency Criteria
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Rate the intern on a 1.0 to 10.0 scale for each authorized criterion.
                </p>
              </div>
              {computedAverage && (
                <div className="bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-purple-700">Weighted Average</div>
                  <div className="text-base font-black text-purple-900">{computedAverage} / 10.0</div>
                </div>
              )}
            </div>

            {safeCriteria.length === 0 ? (
              <div className="p-4 bg-slate-50 text-slate-500 text-xs rounded-xl text-center">
                No evaluation criteria configured for this performance cycle. Defaulting to general assessment.
              </div>
            ) : (
              <div className="space-y-3">
                {safeCriteria.map((crit) => {
                  const currentScore = scores[crit.id] ?? "";
                  return (
                    <div
                      key={crit.id}
                      className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                            <span>{crit.name}</span>
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                              Weight: {crit.weight}%
                            </span>
                          </div>
                          {crit.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{crit.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Score (1-10):
                          </label>
                          <input
                            type="number"
                            min="1.0"
                            max="10.0"
                            step="0.1"
                            value={currentScore}
                            onChange={(e) => handleScoreChange(crit.id, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 focus:border-purple-600 focus:outline-none text-center font-bold text-slate-900 bg-white"
                            placeholder="0.0"
                          />
                        </div>
                      </div>
                      <div>
                        <input
                          type="text"
                          value={comments[crit.id] || ""}
                          onChange={(e) => handleCommentChange(crit.id, e.target.value)}
                          placeholder="Evidence, observations, and criterion remarks..."
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:border-purple-600 focus:bg-white bg-slate-50/50"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Qualitative Feedback Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Key Strengths & Achievements
              </label>
              <textarea
                rows={3}
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="E.g., High aptitude in technical terminology; accurate email writing..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-600 text-xs bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Areas for Growth & Improvement
              </label>
              <textarea
                rows={3}
                value={areasForImprovement}
                onChange={(e) => setAreasForImprovement(e.target.value)}
                placeholder="E.g., Active listening in fast-paced meetings; Keigo formality..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-600 text-xs bg-white"
              />
            </div>
          </div>

          {/* Confidential Instructor Remarks (HR / Admin only) */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
            <div className="flex items-center gap-1.5">
              <AlertCircle size={14} className="text-amber-600" />
              <label className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Confidential Instructor Remarks (HR & Calibration View Only)
              </label>
            </div>
            <p className="text-[10.5px] text-amber-700">
              Private assessment notes between instructor and HR. Not visible to the intern.
            </p>
            <textarea
              rows={2}
              value={instructorRemarks}
              onChange={(e) => setInstructorRemarks(e.target.value)}
              placeholder="Private readiness assessment, conversion readiness, potential risks..."
              className="w-full px-3 py-2 rounded-xl border border-amber-200 focus:border-amber-500 text-xs bg-white"
            />
          </div>

          {/* Developmental Feedback (Intern Visibility) */}
          <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Developmental Guidance for Intern
                </label>
                <p className="text-[10.5px] text-purple-700">
                  Actionable guidance to support the intern's Japanese study trajectory.
                </p>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={feedbackVisible}
                  onChange={(e) => setFeedbackVisible(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                />
                <span className="text-[11px] font-semibold text-slate-700">
                  Visible to Intern
                </span>
              </label>
            </div>
            <textarea
              rows={2}
              value={developmentalFeedback}
              onChange={(e) => setDevelopmentalFeedback(e.target.value)}
              placeholder="Recommended exercises, recommended kanji focus, specific milestones..."
              className="w-full px-3 py-2 rounded-xl border border-purple-200 focus:border-purple-500 text-xs bg-white"
            />
          </div>

          {/* JLPT Target Summary */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              JLPT Milestone Summary / Recommendations
            </label>
            <input
              type="text"
              value={jlptSummary}
              onChange={(e) => setJlptSummary(e.target.value)}
              placeholder="E.g., On track for JLPT N4 exam in July; mock tests average 78%."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-600 text-xs bg-white"
            />
          </div>
        </div>

        {/* Confirmation Dialog Overlay */}
        {showConfirmSubmit && (
          <div className="p-4 bg-purple-50 border-t border-purple-200 flex items-center justify-between animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-xs text-purple-900 font-semibold">
              <CheckCircle2 size={16} className="text-purple-600" />
              <span>Are you sure you want to submit this evaluation to HR? Once submitted, it will be locked for review.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSaving}
                className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!showConfirmSubmit && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/70">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Save size={14} />
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(true)}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Send size={14} />
                Submit Evaluation to HR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConductJapaneseEvaluationModal;
