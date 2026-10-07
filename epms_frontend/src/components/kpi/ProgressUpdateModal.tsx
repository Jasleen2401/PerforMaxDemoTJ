import React, { useState } from 'react';
import { calculateProgressPercent, calculateWeightedScore } from '../../utils/kpiCalculations';
import { useUpdateProgressMutation } from '../../services/kpiApi';
import type { GoalItemResponse, KpiGoalStatus } from '../../features/kpi/kpiTypes';

interface ProgressUpdateModalProps {
  item: GoalItemResponse;
  goalSetStatus?: KpiGoalStatus;
  onClose: () => void;
}

const ProgressUpdateModal: React.FC<ProgressUpdateModalProps> = ({ item, goalSetStatus, onClose }) => {
  const [updateProgress, { isLoading }] = useUpdateProgressMutation();
  const [actualValue, setActualValue] = useState<number | "">(item.currentProgress || 0);
  const [note, setNote] = useState('');
  const canSubmit = goalSetStatus === 'APPROVED';

  // Derived KPI preview values (zero-tolerance handled in utilities)
  const safeActual = actualValue === '' ? 0 : Number(actualValue);
  const previewScore = calculateProgressPercent(safeActual, item.targetValue);
  const previewWeighted = calculateWeightedScore(safeActual, item.targetValue, item.weightPercent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      alert('Progress can only be updated after the KPI goal set is approved.');
      onClose();
      return;
    }

    try {
      const finalActualValue = actualValue === '' ? 0 : actualValue;
      await updateProgress({
        goalItemId: item.id,
        actualValue: finalActualValue,
        progressPercent: calculateProgressPercent(finalActualValue, item.targetValue),
        evidenceNote: note,
      }).unwrap();
      onClose();
    } catch (err: any) {
      console.error('Failed to update progress:', err);
      alert('Failed to update progress.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-xl overflow-hidden transition-all">
        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900">Update Progress</h3>
            <p className="text-sm text-gray-500 mt-1">{item.title}</p>
          </div>

          <div className="p-4 space-y-3">
            <div className="rounded-xl border border-gray-200 bg-slate-50 p-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Actual Value {item.isCompliance ? '(Verification)' : `(${item.unit || 'units'})`}
              </label>
              {item.isCompliance ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActualValue(item.targetValue)}
                    className={`flex-1 py-2 rounded-lg border-2 font-bold transition-all ${
                      actualValue === item.targetValue
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-emerald-200 hover:bg-emerald-50/50'
                    }`}
                  >
                    ✓ PASS
                  </button>
                  <button
                    type="button"
                    onClick={() => setActualValue(0)}
                    className={`flex-1 py-2 rounded-lg border-2 font-bold transition-all ${
                      actualValue === 0
                        ? 'border-rose-500 bg-rose-50 text-rose-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-rose-200 hover:bg-rose-50/50'
                    }`}
                  >
                    ✕ FAIL
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    required
                    min={0}
                    max={item.targetValue}
                    value={actualValue === '' ? '' : actualValue}
                    onKeyDown={e => {
                      if (e.key === '-') {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      if (valStr === '') {
                        setActualValue('');
                      } else {
                        const val = parseFloat(valStr);
                        if (!isNaN(val)) {
                          setActualValue(Math.max(0, Math.min(val, item.targetValue)));
                        }
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 text-sm text-right"
                    style={{ textAlign: 'right' }}
                  />
                  <span className="text-sm font-bold text-gray-400">/ {item.targetValue}</span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-slate-50 p-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Evidence / Notes</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Achievement details..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-blue-700">Calculated Completion</span>
                <span className="text-blue-700">{previewScore}%</span>
              </div>
              <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-500"
                  style={{ width: `${previewScore}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 text-sm">
                <div className="rounded-lg border border-blue-100 bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wider text-blue-500 font-bold">Score</p>
                  <p className="text-lg font-black text-blue-700">{previewScore}%</p>
                </div>
                <div className="rounded-lg border border-blue-100 bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wider text-blue-500 font-bold">Weighted Score</p>
                  <p className="text-lg font-black text-blue-700">{previewWeighted.toFixed(2)}</p>
                </div>
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
              disabled={isLoading || !canSubmit}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Save Progress'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProgressUpdateModal;
