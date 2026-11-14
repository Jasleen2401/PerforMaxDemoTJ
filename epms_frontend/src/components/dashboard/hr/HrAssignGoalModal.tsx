import React from 'react';
import { X, RefreshCw, Plus } from 'lucide-react';
import type { Intern } from './types';

interface HrAssignGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  interns: Intern[];
  selectedInternId: string;
  setSelectedInternId: (id: string) => void;
  goalTitle: string;
  setGoalTitle: (title: string) => void;
  goalDescription: string;
  setGoalDescription: (desc: string) => void;
  goalCategory: string;
  setGoalCategory: (cat: string) => void;
  goalPriority: string;
  setGoalPriority: (priority: string) => void;
  goalDueDate: string;
  setGoalDueDate: (date: string) => void;
  goalTargetValue: number;
  setGoalTargetValue: (val: number) => void;
  goalWeightage: number;
  setGoalWeightage: (weight: number) => void;
  isAssigningGoal: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const HrAssignGoalModal: React.FC<HrAssignGoalModalProps> = ({
  isOpen,
  onClose,
  interns,
  selectedInternId,
  setSelectedInternId,
  goalTitle,
  setGoalTitle,
  goalDescription,
  setGoalDescription,
  goalCategory,
  setGoalCategory,
  goalPriority,
  setGoalPriority,
  goalDueDate,
  setGoalDueDate,
  goalTargetValue,
  setGoalTargetValue,
  goalWeightage,
  setGoalWeightage,
  isAssigningGoal,
  onSubmit
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Assign Performance Goal</h3>
            <p className="text-xs text-slate-500">Allocate milestone objective to an enrolled intern</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Select Intern *</label>
            <select
              required
              value={selectedInternId}
              onChange={(e) => setSelectedInternId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-purple-500 focus:bg-white"
            >
              <option value="">Choose an intern...</option>
              {interns.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.code || i.email}) - {i.cohort}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Goal Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Implement Japanese N4 Vocabulary Test Suite"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Category</label>
              <select
                value={goalCategory}
                onChange={(e) => setGoalCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-purple-500 focus:bg-white"
              >
                <option value="TECHNICAL">Technical Delivery</option>
                <option value="JAPANESE">Japanese Language (JLPT)</option>
                <option value="BEHAVIORAL">Behavioral Competencies</option>
                <option value="SOFT_SKILLS">Collaboration & Soft Skills</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Priority</label>
              <select
                value={goalPriority}
                onChange={(e) => setGoalPriority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-purple-500 focus:bg-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Due Date *</label>
              <input
                type="date"
                required
                value={goalDueDate}
                onChange={(e) => setGoalDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-purple-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Target Value</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={goalTargetValue}
                onChange={(e) => setGoalTargetValue(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-purple-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Weightage (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={goalWeightage}
                onChange={(e) => setGoalWeightage(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-purple-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Description & Success Criteria</label>
            <textarea
              rows={3}
              placeholder="Outline key deliverables, verification standards, and expectations..."
              value={goalDescription}
              onChange={(e) => setGoalDescription(e.target.value)}
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
              disabled={isAssigningGoal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isAssigningGoal ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
              Assign Goal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
