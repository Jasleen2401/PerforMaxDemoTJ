// src/components/instructor/ConductJapaneseEvaluationModal.tsx
import React, { useState, useEffect, useMemo } from "react";
import { X, Award, AlertCircle, Save, Send, ShieldAlert } from "lucide-react";
import { toast } from "react-toastify";
import {
  useGetJapaneseEvalCriteriaQuery,
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
  const activeCycleId = evaluation?.cycle || cycleId || "";
  const { data: criteriaList = [] } = useGetJapaneseEvalCriteriaQuery(
    activeCycleId ? { cycle: activeCycleId } : undefined,
    { skip: !activeCycleId }
  );

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

  // Compute live average score
  const computedAverage = useMemo(() => {
    const scoreVals = Object.values(scores).filter((v) => typeof v === "number" && v > 0);
    if (!scoreVals.length) return null;
    const sum = scoreVals.reduce((acc, curr) => acc + curr, 0);
    return (sum / scoreVals.length).toFixed(2);
  }, [scores]);

  if (!isOpen) return null;

  const targetInternId = evaluation?.intern || internId || "";
  const displayName = evaluation?.intern_name || internName || "Assigned Intern";
  const isReturned = evaluation?.status === "RETURNED";
  const isResubmission = isReturned || evaluation?.status === "RESUBMITTED";

  const handleScoreChange = (critId: string, val: number) => {
    setScores((prev) => ({ ...prev, [critId]: Math.max(0, Math.min(10, val)) }));
  };

  const handleCommentChange = (critId: string, text: string) => {
    setComments((prev) => ({ ...prev, [critId]: text }));
  };

  const buildPayload = (status: EvaluationStatus) => {
    const ratings_data = criteriaList.map((c) => ({
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

  const handleSubmit = async () => {
    try {
      // Validate all criteria have a score
      const missingCriteria = criteriaList.filter((c) => !scores[c.id] || scores[c.id] <= 0);
      if (missingCriteria.length > 0) {
        toast.warning(`Please provide scores for all criteria before submitting.`);
        return;
      }

      let evalId = evaluation?.id;
      const targetStatus: EvaluationStatus = isReturned ? "RESUBMITTED" : "SUBMITTED";
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
      toast.success(
        isReturned
          ? "Evaluation resubmitted to HR successfully!"
          : "Evaluation submitted to HR review queue!"
      );
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to submit evaluation.");
    }
  };

  const isSaving = isCreating || isUpdating || isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-linear-to-r from-blue-50/50 via-indigo-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-200">
              <Award size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">Japanese Language Evaluation</h2>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    evaluation?.status === "RETURNED"
                      ? "bg-rose-100 text-rose-700 border border-rose-200"
                      : evaluation?.status === "SUBMITTED" || evaluation?.status === "RESUBMITTED"
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : evaluation?.status === "ACCEPTED"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-amber-100 text-amber-700 border border-amber-200"
                  }`}
                >
                  {evaluation?.statusDisplay || evaluation?.status || "New Draft"}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Intern: <span className="font-semibold text-gray-700">{displayName}</span>
                {evaluation?.intern_code ? ` (${evaluation.intern_code})` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-gray-700">
          {/* Urgent Return Alert if status is RETURNED */}
          {isReturned && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="text-rose-600 shrink-0 mt-0.5" size={20} />
              <div className="space-y-1">
                <div className="font-bold text-rose-900 text-sm">
                  Evaluation Returned by HR for Revision
                </div>
                <p className="text-rose-700 text-xs leading-relaxed">
                  {evaluation?.return_reason || "HR has requested revisions before accepting this evaluation."}
                </p>
                <div className="text-[11px] text-rose-500 font-medium pt-1">
                  Please update your ratings, comments, or remarks and click "Resubmit to HR".
                </div>
              </div>
            </div>
          )}

          {/* Competency Ratings Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="font-bold text-gray-900 text-base">HR Japanese Competency Criteria</h3>
                <p className="text-xs text-gray-500">
                  Rate the intern on a scale of 1.0 to 10.0 for each authorized criterion.
                </p>
              </div>
              {computedAverage && (
                <div className="bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-indigo-600">Calculated Average</div>
                  <div className="text-lg font-black text-indigo-900">{computedAverage} / 10</div>
                </div>
              )}
            </div>

            {criteriaList.length === 0 ? (
              <div className="p-4 bg-gray-50 text-gray-500 text-xs rounded-xl text-center">
                No evaluation criteria configured for this performance cycle. Defaulting to general assessment.
              </div>
            ) : (
              <div className="space-y-4">
                {criteriaList.map((crit) => {
                  const currentScore = scores[crit.id] ?? "";
                  return (
                    <div
                      key={crit.id}
                      className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200/80 hover:border-blue-200 transition-colors space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                            <span>{crit.name}</span>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              Weight: {crit.weight}%
                            </span>
                          </div>
                          {crit.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{crit.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                            Score (1-10):
                          </label>
                          <input
                            type="number"
                            min="1.0"
                            max="10.0"
                            step="0.1"
                            value={currentScore}
                            onChange={(e) => handleScoreChange(crit.id, parseFloat(e.target.value) || 0)}
                            className="w-20 px-3 py-1.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center font-bold text-gray-900 bg-white"
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
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-blue-500 bg-white"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Qualitative Feedback Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Key Strengths & Achievements
              </label>
              <textarea
                rows={3}
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="E.g., High aptitude in technical terminology; accurate email writing..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Areas for Growth & Improvement
              </label>
              <textarea
                rows={3}
                value={areasForImprovement}
                onChange={(e) => setAreasForImprovement(e.target.value)}
                placeholder="E.g., Active listening in fast-paced meetings; Keigo formality..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs bg-white"
              />
            </div>
          </div>

          {/* Confidential Instructor Remarks (HR / Admin only) */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600" />
              <label className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Confidential Instructor Remarks (HR & Calibration View Only)
              </label>
            </div>
            <p className="text-[11px] text-amber-700">
              These notes are strictly private between you and HR. They will not be visible to the intern.
            </p>
            <textarea
              rows={3}
              value={instructorRemarks}
              onChange={(e) => setInstructorRemarks(e.target.value)}
              placeholder="Private readiness assessment, conversion readiness, potential risks..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 focus:border-amber-500 text-xs bg-white"
            />
          </div>

          {/* Developmental Feedback (Intern Visibility) */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Developmental Feedback for Intern
                </label>
                <p className="text-[11px] text-blue-600">
                  Actionable guidance to support the intern's Japanese study trajectory.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={feedbackVisible}
                  onChange={(e) => setFeedbackVisible(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-gray-700">
                  Visible to Intern
                </span>
              </label>
            </div>
            <textarea
              rows={3}
              value={developmentalFeedback}
              onChange={(e) => setDevelopmentalFeedback(e.target.value)}
              placeholder="Recommended exercises, recommended kanji focus, specific milestones..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 focus:border-blue-500 text-xs bg-white"
            />
          </div>

          {/* JLPT Target Summary */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              JLPT Milestone Summary / Recommendations
            </label>
            <input
              type="text"
              value={jlptSummary}
              onChange={(e) => setJlptSummary(e.target.value)}
              placeholder="E.g., On track for JLPT N4 exam in July; mock tests average 78%."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 focus:border-blue-500 text-xs bg-white"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors shadow-xs cursor-pointer"
            >
              <Save size={15} />
              Save Draft
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 cursor-pointer"
            >
              <Send size={15} />
              {isResubmission ? "Resubmit to HR" : "Submit Evaluation to HR"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
