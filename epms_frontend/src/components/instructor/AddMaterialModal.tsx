// src/components/instructor/AddMaterialModal.tsx
import React, { useState } from "react";
import { X, FileText, Link as LinkIcon, Clock } from "lucide-react";
import { toast } from "react-toastify";
import { useCreateJapaneseMaterialMutation } from "../../features/japanese/japaneseApi";
import type { MaterialType } from "../../features/japanese/types";

interface AddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  topicTitle?: string;
  defaultOrder?: number;
}

export const AddMaterialModal: React.FC<AddMaterialModalProps> = ({
  isOpen,
  onClose,
  topicId,
  topicTitle,
  defaultOrder = 1,
}) => {
  const [createMaterial, { isLoading }] = useCreateJapaneseMaterialMutation();

  const [title, setTitle] = useState("");
  const [materialType, setMaterialType] = useState<MaterialType>("READING");
  const [externalUrl, setExternalUrl] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [order, setOrder] = useState(defaultOrder);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Material title is required.");
      return;
    }

    try {
      await createMaterial({
        topic: topicId,
        title: title.trim(),
        material_type: materialType,
        external_url: externalUrl.trim() || undefined,
        estimated_minutes: Number(estimatedMinutes) || 30,
        order: Number(order) || 1,
      }).unwrap();
      toast.success("Study material attached to topic!");
      setTitle("");
      setExternalUrl("");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to add material.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-linear-to-r from-blue-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileText size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Add Learning Material</h2>
              {topicTitle && <p className="text-xs text-gray-500 truncate max-w-xs">{topicTitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Resource Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Chapter 4: Polite Requests and Work Emails"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Format / Type
              </label>
              <select
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white font-medium"
              >
                <option value="READING">Reading Article / Text</option>
                <option value="LISTENING">Audio / Listening</option>
                <option value="VOCABULARY">Vocabulary / Flashcards</option>
                <option value="GRAMMAR">Grammar Drill</option>
                <option value="EXERCISE">Exercise / Assignment</option>
                <option value="VIDEO">Video Lecture</option>
                <option value="OTHER">Other Reference</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Estimated Minutes
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 30)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white"
                />
                <Clock size={14} className="absolute left-2.5 top-3 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              External Link / Google Drive / LMS URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white font-mono text-[11px]"
              />
              <LinkIcon size={14} className="absolute left-2.5 top-3 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Sequence Order
            </label>
            <input
              type="number"
              min="1"
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
              className="w-24 px-3.5 py-2 rounded-xl border border-gray-200 focus:border-blue-500 bg-white"
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
              {isLoading ? "Saving..." : "Attach Material"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
