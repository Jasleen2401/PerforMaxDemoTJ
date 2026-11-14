// src/components/instructor/ProvideJapaneseFeedbackModal.tsx
import React, { useState, useEffect } from "react";
import { X, MessageSquare, Send, Eye, EyeOff, Save, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  useGetJapaneseInternsQuery,
  useCreateJapaneseFeedbackMutation,
} from "../../features/japanese/japaneseApi";

interface ProvideJapaneseFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultInternId?: string;
  defaultCategory?: string;
}

const CATEGORIES = [
  { value: "COACHING", label: "Coaching & Mentorship", desc: "One-on-one coaching on language acquisition" },
  { value: "CONSTRUCTIVE", label: "Constructive Guidance", desc: "Targeted areas needing practice or review" },
  { value: "TRAINING", label: "Training & Practice", desc: "Homework, quizzes, or practice exercise feedback" },
  { value: "POSITIVE", label: "Positive Reinforcement", desc: "Recognizing steady progress and effort" },
  { value: "PRAISE", label: "Commendation / Praise", desc: "Exemplary performance or test score recognition" },
  { value: "SUGGESTION", label: "Learning Suggestion", desc: "Recommended study routines, podcasts, or apps" },
  { value: "OBSERVATION", label: "Class Observation", desc: "Active participation and classroom interaction notes" },
];

export const ProvideJapaneseFeedbackModal: React.FC<ProvideJapaneseFeedbackModalProps> = ({
  isOpen,
  onClose,
  defaultInternId,
  defaultCategory,
}) => {
  const { data: interns = [], isLoading: isLoadingInterns } = useGetJapaneseInternsQuery();
  const [createFeedback, { isLoading: isSubmitting }] = useCreateJapaneseFeedbackMutation();

  const [selectedInternId, setSelectedInternId] = useState<string>(defaultInternId || "");
  const [category, setCategory] = useState<string>(defaultCategory || "COACHING");
  const [message, setMessage] = useState<string>("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");

  useEffect(() => {
    if (defaultInternId) {
      setSelectedInternId(defaultInternId);
    } else if (interns.length > 0 && !selectedInternId) {
      setSelectedInternId(interns[0].id);
    }
  }, [defaultInternId, interns, selectedInternId]);

  if (!isOpen) return null;

  const currentIntern = interns.find((i) => i.id === selectedInternId);

  const handleSubmit = async (status: "DRAFT" | "PUBLISHED") => {
    if (!selectedInternId) {
      toast.error("Please select an assigned intern.");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter feedback guidance.");
      return;
    }

    try {
      await createFeedback({
        recipient: selectedInternId,
        feedback_type: category,
        message: message.trim(),
        visibility: visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE",
        status,
      }).unwrap();

      toast.success(
        status === "PUBLISHED"
          ? "Developmental guidance published successfully!"
          : "Feedback saved as draft."
      );
      setMessage("");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error || err?.data?.detail || "Failed to record feedback.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <MessageSquare size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Provide Japanese Guidance</h2>
              <p className="text-xs text-slate-500">Record targeted developmental mentorship</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Intern Selection */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Assigned Intern
            </label>
            <select
              value={selectedInternId}
              onChange={(e) => setSelectedInternId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 bg-white font-medium text-slate-800"
              required
            >
              <option value="" disabled>Select an intern...</option>
              {interns.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.fullName} ({i.employeeCode}) — {i.batchName || "Batch"} {i.subBatchCode ? `(${i.subBatchCode})` : ""}
                </option>
              ))}
            </select>
            {currentIntern && (
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                <span>Batch: <strong className="text-slate-700">{currentIntern.batchName || "N/A"}</strong></span>
                <span>• Sub-batch: <strong className="text-slate-700">{currentIntern.subBatchCode || "N/A"}</strong></span>
                <span>• Progress: <strong className="text-purple-700">{currentIntern.progress?.percentage || 0}%</strong></span>
              </div>
            )}
          </div>

          {/* Feedback Category */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Guidance Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 bg-white font-medium text-slate-800"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              {CATEGORIES.find((c) => c.value === category)?.desc}
            </p>
          </div>

          {/* Message Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider">
                Developmental Message & Advice
              </label>
            </div>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide actionable guidance on vocabulary acquisition, JLPT exam preparation, spoken practice, Kanji retention, or homework exercises..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 bg-white leading-relaxed text-slate-800"
              required
            />
          </div>

          {/* Visibility Option */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <label className="block font-bold text-slate-700 uppercase tracking-wider">
              Feedback Visibility
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="visibility"
                  value="PUBLIC"
                  checked={visibility === "PUBLIC"}
                  onChange={() => setVisibility("PUBLIC")}
                  className="text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                />
                <span className="text-slate-800 font-semibold flex items-center gap-1">
                  <Eye size={13} className="text-emerald-600" />
                  Visible to Intern
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="visibility"
                  value="PRIVATE"
                  checked={visibility === "PRIVATE"}
                  onChange={() => setVisibility("PRIVATE")}
                  className="text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                />
                <span className="text-slate-800 font-semibold flex items-center gap-1">
                  <EyeOff size={13} className="text-amber-600" />
                  Private (Instructor & HR only)
                </span>
              </label>
            </div>
            <p className="text-[11px] text-slate-500">
              {visibility === "PUBLIC"
                ? "The intern will be able to read this guidance and reply with follow-up questions."
                : "Kept confidential for instructor records and HR review."}
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSubmit("DRAFT")}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Save size={14} />
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSubmit("PUBLISHED")}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all shadow-xs cursor-pointer"
              >
                <Send size={14} />
                Publish Guidance
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvideJapaneseFeedbackModal;
