import React from 'react';
import { X, Download, RefreshCw, Check } from 'lucide-react';
import type { Evidence } from './types';

interface HrReviewEvidenceModalProps {
  evidence: Evidence | null;
  onClose: () => void;
  reviewStatusChoice: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
  setReviewStatusChoice: (status: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED') => void;
  reviewNotesInput: string;
  setReviewNotesInput: (notes: string) => void;
  isSubmittingReview: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const HrReviewEvidenceModal: React.FC<HrReviewEvidenceModalProps> = ({
  evidence,
  onClose,
  reviewStatusChoice,
  setReviewStatusChoice,
  reviewNotesInput,
  setReviewNotesInput,
  isSubmittingReview,
  onSubmit
}) => {
  if (!evidence) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Verify Work Evidence</h3>
            <p className="text-xs text-slate-500">{evidence.internName} • {evidence.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-slate-800">Related Goal/Task: {evidence.goalTitle}</div>
            {evidence.link && (
              <div className="text-purple-600 font-semibold truncate">
                URL: <a href={evidence.link} target="_blank" rel="noreferrer" className="underline">{evidence.link}</a>
              </div>
            )}
            {evidence.fileAttachment && (
              <div className="text-emerald-700 font-semibold flex items-center gap-1">
                <Download size={12} />
                <a href={`/api/evidence/${evidence.id}/download/`} target="_blank" rel="noreferrer" className="underline">
                  Download File Attachment
                </a>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Review Decision *</label>
            <select
              value={reviewStatusChoice}
              onChange={(e) => setReviewStatusChoice(e.target.value as 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-purple-500 focus:bg-white"
            >
              <option value="APPROVED">Approve Deliverable</option>
              <option value="REVISION_REQUESTED">Request Revision / Changes</option>
              <option value="REJECTED">Reject Submission</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Review Notes / Feedback</label>
            <textarea
              rows={3}
              placeholder="Provide guidance or feedback for the intern..."
              value={reviewNotesInput}
              onChange={(e) => setReviewNotesInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-500 focus:bg-white resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingReview}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmittingReview ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
              Save Verification
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
