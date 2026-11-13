// src/components/instructor/AddTopicModal.tsx
import React, { useState } from "react";
import { X, Layers } from "lucide-react";
import { toast } from "react-toastify";
import { useCreateJapaneseTopicMutation } from "../../features/japanese/japaneseApi";

interface AddTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planTitle?: string;
  defaultOrder?: number;
}

export const AddTopicModal: React.FC<AddTopicModalProps> = ({
  isOpen,
  onClose,
  planId,
  planTitle,
  defaultOrder = 1,
}) => {
  const [createTopic, { isLoading }] = useCreateJapaneseTopicMutation();
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState(defaultOrder);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Topic title is required.");
      return;
    }

    try {
      await createTopic({
        plan: planId,
        title: title.trim(),
        order: Number(order) || 1,
      }).unwrap();
      toast.success("Topic added to learning plan!");
      setTitle("");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to add topic.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-linear-to-r from-blue-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Layers size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Add Learning Topic</h2>
              {planTitle && <p className="text-xs text-gray-500 truncate max-w-xs">{planTitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Topic Title / Module
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Daily Standup & Tech Reporting Vocabulary"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 bg-white font-medium"
              required
            />
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
              {isLoading ? "Adding..." : "Add Topic"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
