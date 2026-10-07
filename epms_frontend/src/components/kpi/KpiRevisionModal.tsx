import React, { useState } from 'react';
import { useReviseKpiMutation } from '../../services/kpiApi';
import type { GoalItemResponse } from '../../features/kpi/kpiTypes';

interface KpiRevisionModalProps {
  item: GoalItemResponse;
  onClose: () => void;
}

const KpiRevisionModal: React.FC<KpiRevisionModalProps> = ({ item, onClose }) => {
  const [reviseKpi, { isLoading }] = useReviseKpiMutation();

  const [formData, setFormData] = useState({
    unit: item.unit || '',
    targetValue: item.targetValue,
  });

  const [changeReason, setChangeReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeReason.trim()) {
      alert('Change reason is required for audit history.');
      return;
    }

    try {
      const updatedDetails = {
        ...formData,
        targetValue: (formData.targetValue as any) === '' ? 0 : formData.targetValue,
      };

      await reviseKpi({
        itemId: item.id,
        data: {
          changeReason,
          updatedDetails: updatedDetails as any,
        },
      }).unwrap();
      onClose();
    } catch (err: any) {
      console.error('Failed to revise KPI:', err);
      alert('Failed to revise KPI. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-xl overflow-hidden transition-all">
        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900">Revise KPI Goal</h3>
            <p className="text-sm text-gray-500 mt-1">Modifications will be logged in the revision history.</p>
          </div>

          <div className="p-4 space-y-3 max-h-[72vh] overflow-y-auto">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Goal Title</label>
                <div className="rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 text-sm text-gray-700">
                  {item.title}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <div className="rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 text-sm text-gray-700">
                    {item.categoryName || '—'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Weight (%)</label>
                  <div className="rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 text-sm text-gray-700 text-right" style={{ textAlign: 'right' }}>
                    {item.weightPercent ?? 0}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 bg-slate-50 p-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg bg-white px-2 py-2 focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div className="rounded-xl border border-gray-200 bg-slate-50 p-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Target Value</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={(formData.targetValue as any) === '' ? '' : formData.targetValue}
                    onKeyDown={e => {
                      if (e.key === '-') {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, targetValue: val === '' ? '' : Math.max(0, parseFloat(val)) } as any);
                    }}
                    className="w-full border border-gray-300 rounded-lg bg-white px-2 py-2 focus:ring-2 focus:ring-blue-500 text-sm text-right"
                    style={{ textAlign: 'right' }}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <label className="block text-sm font-bold text-red-600 mb-1">Reason for Revision *</label>
                <textarea
                  required
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  rows={3}
                  placeholder="Explain the reason for this change..."
                  className="w-full rounded-lg border border-red-200 bg-white px-2 py-2 focus:ring-2 focus:ring-red-500 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
            >
              {isLoading ? 'Applying...' : 'Apply Revision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KpiRevisionModal;
