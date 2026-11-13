// src/components/instructor/ReviewPracticeModal.tsx
import React, { useState, useEffect } from "react";
import { X, CheckCircle, ExternalLink, Award } from "lucide-react";
import { toast } from "react-toastify";
import { useReviewJapanesePracticeResultMutation } from "../../features/japanese/japaneseApi";
import type { JapanesePracticeResult } from "../../features/japanese/types";

interface ReviewPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  practice: JapanesePracticeResult | null;
}

export const ReviewPracticeModal: React.FC<ReviewPracticeModalProps> = ({
  isOpen,
  onClose,
  practice,
}) => {
  const [reviewPractice, { isLoading }] = useReviewJapanesePracticeResultMutation();
  const [score, setScore] = useState<number | "">("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (practice) {
      setScore(practice.score !== null && practice.score !== undefined ? Number(practice.score) : 85);
      setRemarks(practice.instructor_remarks || "");
    }
  }, [practice, isOpen]);

  if (!isOpen || !practice) return null;

  const maxScore = Number(practice.max_score) || 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (score === "" || Number(score) < 0 || Number(score) > maxScore) {
      toast.error(`Please enter a valid score between 0 and ${maxScore}.`);
      return;
    }

    try {
      await reviewPractice({
        id: practice.id,
        data: {
          score: Number(score),
          instructor_remarks: remarks.trim(),
        },
      }).unwrap();
      toast.success("Practice exercise reviewed and graded successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to submit review.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-linear-to-r from-blue-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <CheckCircle size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Review Exercise Submission</h2>
              <p className="text-xs text-gray-500">
                Intern: <span className="font-semibold text-gray-700">{practice.intern_name || "Intern"}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Submission Info Card */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-gray-900 text-sm">{practice.topic_title || "Exercise"}</div>
                {practice.material_title && (
                  <p className="text-gray-500 text-xs mt-0.5">{practice.material_title}</p>
                )}
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {practice.status}
              </span>
            </div>

            {practice.notes && (
              <div className="pt-2 border-t border-gray-200">
                <div className="text-[10px] uppercase font-bold text-gray-400">Intern Notes / Evidence:</div>
                <p className="text-gray-700 text-xs mt-0.5 italic">{practice.notes}</p>
              </div>
            )}

            {practice.external_url && (
              <div className="pt-1">
                <a
                  href={practice.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold text-xs"
                >
                  <ExternalLink size={13} />
                  View Submitted Evidence Artifact
                </a>
              </div>
            )}
          </div>

          {/* Score Input */}
          <div>
            <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Assigned Score (Max {maxScore})
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max={maxScore}
                step="1"
                value={score}
                onChange={(e) => setScore(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-28 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white font-bold text-base text-gray-900 text-center"
                required
              />
              <span className="text-xs text-gray-400 font-semibold">/ {maxScore} points</span>
            </div>
          </div>

          {/* Instructor Remarks */}
          <div>
            <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Instructor Feedback & Recommendations
            </label>
            <textarea
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Highlight strengths, stroke order accuracy, vocabulary nuance, or areas to re-drill..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md shadow-blue-200 cursor-pointer"
            >
              {isLoading ? "Saving Review..." : "Confirm & Save Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
