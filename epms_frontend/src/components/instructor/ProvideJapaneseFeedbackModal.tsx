// src/components/instructor/ProvideJapaneseFeedbackModal.tsx
import React, { useState } from "react";
import { X, MessageSquare, Send, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import { useCreateJapaneseEvaluationMutation } from "../../features/japanese/japaneseApi";

interface ProvideJapaneseFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  interns: Array<{ id: string; fullName: string; employeeCode: string }>;
  defaultCycleId?: string;
  defaultInternId?: string;
}

export const ProvideJapaneseFeedbackModal: React.FC<ProvideJapaneseFeedbackModalProps> = ({
  isOpen,
  onClose,
  interns,
  defaultCycleId,
  defaultInternId,
}) => {
  const [createEval, { isLoading }] = useCreateJapaneseEvaluationMutation();

  const [internId, setInternId] = useState(defaultInternId || (interns[0]?.id ?? ""));
  const [feedback, setFeedback] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [remarks, setRemarks] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internId) {
      toast.error("Please select an intern.");
      return;
    }
    if (!feedback.trim()) {
      toast.error("Please enter developmental feedback.");
      return;
    }
    if (!defaultCycleId) {
      toast.error("No active cycle found.");
      return;
    }

    try {
      await createEval({
        intern: internId,
        cycle: defaultCycleId,
        status: "DRAFT",
        developmental_feedback: feedback.trim(),
        is_developmental_feedback_visible: isVisible,
        instructor_remarks: remarks.trim(),
      }).unwrap();
      toast.success("Feedback recorded successfully!");
      setFeedback("");
      setRemarks("");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to submit feedback.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-linear-to-r from-blue-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <MessageSquare size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Provide Japanese Guidance</h2>
              <p className="text-xs text-gray-500">Record targeted developmental feedback</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Assigned Intern
            </label>
            <select
              value={internId}
              onChange={(e) => setInternId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white font-medium"
              required
            >
              <option value="" disabled>Select an intern...</option>
              {interns.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.fullName} ({i.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-gray-700 uppercase tracking-wider">
                Developmental Feedback
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-blue-700 font-semibold select-none">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) => setIsVisible(e.target.checked)}
                  className="rounded text-blue-600 h-3.5 w-3.5"
                />
                {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                <span>{isVisible ? "Visible to Intern" : "Private to Instructor"}</span>
              </label>
            </div>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive guidance on vocabulary retention, conversational confidence, or exam strategies..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Confidential Instructor Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Internal notes regarding learning pace or assessment readiness..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white"
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
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md shadow-blue-200 cursor-pointer"
            >
              <Send size={14} />
              {isLoading ? "Saving..." : "Save Guidance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
