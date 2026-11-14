// src/components/instructor/CreateLearningPlanModal.tsx
import React, { useState } from "react";
import { X, BookOpen } from "lucide-react";
import { toast } from "react-toastify";
import { useCreateJapaneseLearningPlanMutation } from "../../features/japanese/japaneseApi";
import type { JLPTLevel } from "../../features/japanese/types";

interface CreateLearningPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  interns: Array<{ id: string; fullName: string; employeeCode: string }>;
  defaultCycleId?: string;
  defaultInternId?: string;
}

export const CreateLearningPlanModal: React.FC<CreateLearningPlanModalProps> = ({
  isOpen,
  onClose,
  interns,
  defaultCycleId,
  defaultInternId,
}) => {
  const [createPlan, { isLoading }] = useCreateJapaneseLearningPlanMutation();

  const [internId, setInternId] = useState(defaultInternId || (interns[0]?.id ?? ""));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetLevel, setTargetLevel] = useState<JLPTLevel>("N4");
  const [targetDate, setTargetDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Plan title is required.");
      return;
    }
    if (!internId) {
      toast.error("Please select an intern.");
      return;
    }
    if (!defaultCycleId) {
      toast.error("No active performance cycle found.");
      return;
    }

    try {
      await createPlan({
        intern: internId,
        cycle: defaultCycleId,
        title: title.trim(),
        description: description.trim(),
        target_jlpt_level: targetLevel,
        target_date: targetDate || undefined,
        is_active: isActive,
      }).unwrap();
      toast.success("Japanese Learning Plan created successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to create learning plan.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-linear-to-r from-blue-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Create Learning Plan</h2>
              <p className="text-xs text-gray-500">Configure Japanese curriculum & JLPT roadmap</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white font-medium text-gray-800"
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
            <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Plan Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., JLPT N4 Accelerator & IT Keigo Foundations"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white font-medium"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Curriculum Summary / Objectives
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline topics, grammar points, and daily conversational milestones..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Target JLPT Level
              </label>
              <select
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value as JLPTLevel)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white font-bold text-blue-700"
              >
                <option value="N5">JLPT N5 (Basic)</option>
                <option value="N4">JLPT N4 (Elementary)</option>
                <option value="N3">JLPT N3 (Intermediate)</option>
                <option value="N2">JLPT N2 (Business)</option>
                <option value="N1">JLPT N1 (Advanced)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Target Completion Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="font-semibold text-gray-700">Set as Active Curriculum Plan</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md shadow-blue-200"
            >
              {isLoading ? "Creating..." : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
