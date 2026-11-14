// src/components/instructor/JapaneseInternDetailModal.tsx
import React from "react";
import {
  X,
  BookOpen,
  Award,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Calendar,
} from "lucide-react";
import type { JapaneseAssignedIntern } from "../../features/japanese/types";

interface JapaneseInternDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  intern: JapaneseAssignedIntern | null;
  onEvaluate?: (intern: JapaneseAssignedIntern) => void;
  onManagePlan?: (intern: JapaneseAssignedIntern) => void;
}

export const JapaneseInternDetailModal: React.FC<JapaneseInternDetailModalProps> = ({
  isOpen,
  onClose,
  intern,
  onEvaluate,
  onManagePlan,
}) => {
  if (!isOpen || !intern) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-linear-to-r from-blue-50/50 via-indigo-50/20 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-200">
              {intern.fullName?.[0]?.toUpperCase() || "I"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">{intern.fullName}</h2>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                  {intern.employeeCode}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {intern.designation} • {intern.department} • Mentor: {intern.managerName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Progress Overview Card */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Exercise Progress</div>
              <div className="text-xl font-black text-gray-900 mt-1">{intern.progress.percentage}%</div>
              <div className="text-gray-500 text-[11px] mt-0.5">
                {intern.progress.completed} of {intern.progress.total} reviewed
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full"
                  style={{ width: `${intern.progress.percentage}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">JLPT Target</div>
              <div className="text-xl font-black text-indigo-700 mt-1">
                {intern.plan?.targetLevel || intern.jlpt.requiredLevel}
              </div>
              <div className="text-gray-500 text-[11px] mt-0.5">
                Status: {intern.jlpt.eligibilityStatusDisplay || intern.jlpt.eligibilityStatus}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cycle Evaluation</div>
              <div className="text-xl font-black text-gray-900 mt-1">
                {intern.evaluation?.overallScore !== null && intern.evaluation?.overallScore !== undefined
                  ? `${intern.evaluation.overallScore} / 10`
                  : "Pending"}
              </div>
              <div className="text-gray-500 text-[11px] mt-0.5">
                {intern.evaluation?.statusDisplay || intern.evaluation?.status || "Not Started"}
              </div>
            </div>
          </div>

          {/* Active Learning Plan Section */}
          <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm">Active Curriculum Plan</h3>
              </div>
              {intern.plan?.targetDate && (
                <span className="text-[11px] text-gray-500 flex items-center gap-1 font-medium">
                  <Calendar size={13} />
                  Target: {intern.plan.targetDate}
                </span>
              )}
            </div>
            {intern.plan ? (
              <div>
                <div className="font-semibold text-gray-900 text-xs">{intern.plan.title}</div>
                <p className="text-gray-500 text-[11px] mt-1">
                  Enrolled modules: {intern.plan.topicsCount} structured learning topics with assigned reading and practice.
                </p>
              </div>
            ) : (
              <p className="text-gray-500 italic">No active learning plan assigned yet for this intern.</p>
            )}
          </div>

          {/* Evaluation Status Banner */}
          {intern.evaluation && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                intern.evaluation.status === "SUBMITTED"
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : intern.evaluation.status === "ACCEPTED"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-purple-50 border-purple-200 text-purple-800"
              }`}
            >
              <CheckCircle2 className="shrink-0 text-purple-600 mt-0.5" size={18} />
              <div className="space-y-1">
                <div className="font-bold text-xs">
                  Evaluation Status: {intern.evaluation.status === "DRAFT" ? "Draft" : intern.evaluation.statusDisplay || intern.evaluation.status}
                </div>
                {intern.evaluation.overallScore !== null && (
                  <p className="text-xs font-semibold">
                    Overall Competency Score: {intern.evaluation.overallScore} / 10.0
                  </p>
                )}
              </div>
            </div>
          )}

          {/* JLPT Milestones */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-indigo-600" />
              <h3 className="font-bold text-gray-900 text-sm">JLPT Certification Trajectory</h3>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-gray-600">Total Attempts Recorded:</span>
              <span className="font-bold text-gray-900">{intern.jlpt.attemptsCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Cycle Eligibility Status:</span>
              <span className="font-bold text-indigo-700">
                {intern.jlpt.eligibilityStatusDisplay || intern.jlpt.eligibilityStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-100"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            {onManagePlan && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onManagePlan(intern);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-blue-200 bg-white text-blue-700 font-bold hover:bg-blue-50"
              >
                <BookOpen size={14} />
                Manage Plan
              </button>
            )}
            {onEvaluate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEvaluate(intern);
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md shadow-blue-200"
              >
                <FileCheck size={14} />
                {intern.evaluation?.status === "DRAFT" ? "Continue Draft" : "Open Evaluation"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
