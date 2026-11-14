// src/components/instructor/VerifyJLPTModal.tsx
import React, { useState, useEffect } from "react";
import { X, Award, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import { useVerifyJLPTAttemptMutation } from "../../features/japanese/japaneseApi";
import type { JLPTAttempt } from "../../features/japanese/types";

interface VerifyJLPTModalProps {
  isOpen: boolean;
  onClose: () => void;
  attempt: JLPTAttempt | null;
}

export const VerifyJLPTModal: React.FC<VerifyJLPTModalProps> = ({
  isOpen,
  onClose,
  attempt,
}) => {
  const [verifyAttempt, { isLoading }] = useVerifyJLPTAttemptMutation();
  const [passed, setPassed] = useState(true);
  const [score, setScore] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<"VERIFIED" | "REJECTED">("VERIFIED");

  useEffect(() => {
    if (attempt) {
      setPassed(attempt.passed ?? true);
      setScore(attempt.score ?? "");
      setNotes(attempt.notes || "");
      setVerificationStatus(attempt.verified ? "VERIFIED" : "VERIFIED");
    }
  }, [attempt, isOpen]);

  if (!isOpen || !attempt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyAttempt({
        id: attempt.id,
        data: {
          status: verificationStatus,
          verified: verificationStatus === "VERIFIED",
          passed: Boolean(passed),
          score: score === "" ? undefined : Number(score),
          notes: notes.trim(),
        },
      }).unwrap();
      toast.success(
        verificationStatus === "VERIFIED"
          ? "JLPT result successfully verified!"
          : "JLPT attempt rejected / marked unverified."
      );
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to verify JLPT attempt.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-linear-to-r from-blue-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Award size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Verify Official JLPT Exam</h2>
              <p className="text-xs text-gray-500">
                Intern: <span className="font-semibold text-gray-700">{attempt.intern_name || "Intern"}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-gray-900 text-sm">
                JLPT {attempt.level} Examination
              </div>
              <span className="text-xs text-gray-500 font-medium">
                Exam Date: {attempt.exam_date}
              </span>
            </div>
            {attempt.certificate_file && (
              <div className="pt-2">
                <a
                  href={attempt.certificate_file}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  View Submitted Certificate Scan
                </a>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Verification Outcome
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setVerificationStatus("VERIFIED");
                  setPassed(true);
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  verificationStatus === "VERIFIED"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <CheckCircle2 size={16} className="text-emerald-600" />
                Verified & Confirmed
              </button>
              <button
                type="button"
                onClick={() => {
                  setVerificationStatus("REJECTED");
                  setPassed(false);
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  verificationStatus === "REJECTED"
                    ? "border-rose-500 bg-rose-50 text-rose-800 shadow-xs"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <XCircle size={16} className="text-rose-600" />
                Reject / Incomplete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Result Status
              </label>
              <select
                value={passed ? "PASS" : "FAIL"}
                onChange={(e) => setPassed(e.target.value === "PASS")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white font-bold"
              >
                <option value="PASS">Official Pass (合格)</option>
                <option value="FAIL">Not Passed (不合格)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Official Score (Total / 180)
              </label>
              <input
                type="number"
                min="0"
                max="180"
                value={score}
                onChange={(e) => setScore(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="E.g., 135"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Verification Notes & Certificate Verification Details
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Certificate number verified against JEES / Japan Foundation scoring records..."
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
              {isLoading ? "Saving..." : "Confirm Verification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
