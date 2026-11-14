// src/components/instructor/RecordJLPTAttemptModal.tsx
import React, { useState } from "react";
import { X, Award } from "lucide-react";
import { toast } from "react-toastify";
import { useCreateJLPTAttemptMutation } from "../../features/japanese/japaneseApi";
import type { JLPTLevel } from "../../features/japanese/types";

interface RecordJLPTAttemptModalProps {
  isOpen: boolean;
  onClose: () => void;
  interns: Array<{ id: string; fullName: string; employeeCode: string }>;
  defaultInternId?: string;
}

export const RecordJLPTAttemptModal: React.FC<RecordJLPTAttemptModalProps> = ({
  isOpen,
  onClose,
  interns,
  defaultInternId,
}) => {
  const [createAttempt, { isLoading }] = useCreateJLPTAttemptMutation();

  const [internId, setInternId] = useState(defaultInternId || (interns[0]?.id ?? ""));
  const [level, setLevel] = useState<JLPTLevel>("N4");
  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);
  const [score, setScore] = useState<number | "">("");
  const [passed, setPassed] = useState(true);
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internId) {
      toast.error("Please select an intern.");
      return;
    }
    if (!examDate) {
      toast.error("Please provide an exam date.");
      return;
    }

    try {
      await createAttempt({
        intern: internId,
        level,
        exam_date: examDate,
        score: score === "" ? undefined : Number(score),
        passed: Boolean(passed),
        notes: notes.trim() || undefined,
      }).unwrap();
      toast.success("JLPT attempt recorded successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to record JLPT attempt.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-linear-to-r from-blue-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Award size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Record JLPT Exam Attempt</h2>
              <p className="text-xs text-gray-500">Log intern official Japanese test score</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Intern
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                JLPT Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as JLPTLevel)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white font-bold text-blue-700"
              >
                <option value="N5">JLPT N5</option>
                <option value="N4">JLPT N4</option>
                <option value="N3">JLPT N3</option>
                <option value="N2">JLPT N2</option>
                <option value="N1">JLPT N1</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Exam Date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Result
              </label>
              <select
                value={passed ? "PASS" : "FAIL"}
                onChange={(e) => setPassed(e.target.value === "PASS")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white font-bold"
              >
                <option value="PASS">Passed (合格)</option>
                <option value="FAIL">Not Passed (不合格)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Total Score (/ 180)
              </label>
              <input
                type="number"
                min="0"
                max="180"
                value={score}
                onChange={(e) => setScore(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="E.g., 140"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Registration / Certificate Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Test venue, registration voucher, or sectional scoring notes..."
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
              className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md shadow-blue-200 cursor-pointer"
            >
              {isLoading ? "Saving..." : "Record Attempt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
