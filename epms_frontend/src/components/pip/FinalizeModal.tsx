import React, { useState } from 'react';
import { PipOutcome } from '../../features/pip/types';
import { AlertTriangle } from 'lucide-react';

interface FinalizeModalProps {
    currentEndDate: string;
    existingReviewDates?: string[];
    onClose: () => void;
    onSave: (data: { outcome: PipOutcome; comment: string; newEndDate?: string; scheduledReviewDates?: string[] }) => Promise<void>;
}

const FinalizeModal: React.FC<FinalizeModalProps> = ({ currentEndDate, existingReviewDates = [], onClose, onSave }) => {
    const [data, setData] = useState<{ outcome: PipOutcome; comment: string; newEndDate?: string; scheduledReviewDates?: string[] }>({ 
        outcome: PipOutcome.PASS, 
        comment: '',
        scheduledReviewDates: [...existingReviewDates]
    });
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<{ comment?: string; endDate?: string }>({});
    const [showConfirm, setShowConfirm] = useState(false);

    const validate = (): boolean => {
        const newErrors: { comment?: string; endDate?: string } = {};
        if (!data.comment.trim()) {
            newErrors.comment = "Please provide final comments or justification.";
        }
        if (data.outcome === PipOutcome.EXTEND && !data.newEndDate) {
            newErrors.endDate = "Please select a new end date for the extension.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        if (data.outcome !== PipOutcome.EXTEND && !showConfirm) {
            setShowConfirm(true);
            return;
        }

        setIsSaving(true);
        try {
            await onSave(data);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Confirmation view ──
    if (showConfirm) {
        return (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full flex flex-col animate-in fade-in zoom-in duration-200">
                    <div className="p-8 pb-0 flex-shrink-0 flex flex-col items-center text-center">
                        <div style={{
                            width: 48, height: 48, borderRadius: 14,
                            background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 16
                        }}>
                            <AlertTriangle size={22} style={{ color: '#D97706' }} />
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                            Confirm finalization
                        </h3>
                        <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>
                            Once the PIP is finalized, it <strong style={{ color: '#111827' }}>cannot be reopened</strong> or edited. This action is permanent.
                        </p>
                    </div>

                    <div style={{
                        margin: '20px 32px 0',
                        background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12,
                        padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10
                    }}>
                        <AlertTriangle size={14} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5, margin: 0 }}>
                            The outcome will be recorded as <strong>{data.outcome === PipOutcome.PASS ? 'PASS' : 'FAIL'}</strong> and all stakeholders will be notified.
                        </p>
                    </div>

                    <div className="p-8 pt-5 flex-shrink-0">
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                style={{
                                    flex: 1, padding: '10px 16px', background: '#F3F4F6',
                                    border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600,
                                    color: '#374151', cursor: 'pointer'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#E5E7EB'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#F3F4F6'; }}
                            >
                                Go back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSaving}
                                style={{
                                    flex: 1, padding: '10px 16px',
                                    background: data.outcome === PipOutcome.FAIL ? '#DC2626' : '#16A34A',
                                    border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600,
                                    color: '#FFFFFF', cursor: isSaving ? 'not-allowed' : 'pointer',
                                    opacity: isSaving ? 0.7 : 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                }}
                                onMouseEnter={e => {
                                    if (!isSaving) e.currentTarget.style.background = data.outcome === PipOutcome.FAIL ? '#B91C1C' : '#15803D';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = data.outcome === PipOutcome.FAIL ? '#DC2626' : '#16A34A';
                                }}
                            >
                                {isSaving
                                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    : 'Yes, finalize'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main form view ──
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                <div className="p-8 pb-0 flex-shrink-0">
                    <h3 className="text-2xl font-bold mb-6">Finalize PIP</h3>
                </div>
                
                <div className="flex-grow overflow-y-auto px-8 py-2 space-y-4 custom-scrollbar">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Final Outcome</label>
                        <select 
                            className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none bg-white" 
                            value={data.outcome}
                            onChange={e => { setData({ ...data, outcome: e.target.value as PipOutcome }); setErrors(prev => ({ ...prev, endDate: undefined })); }}
                        >
                            <option value={PipOutcome.PASS}>PASS - Performance Improved</option>
                            <option value={PipOutcome.EXTEND}>EXTEND - Needs More Time</option>
                            <option value={PipOutcome.FAIL}>FAIL - Unsatisfactory</option>
                        </select>
                    </div>

                    {data.outcome === PipOutcome.EXTEND && (
                        <div className="animate-in slide-in-from-top-2 duration-200 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">New End Date</label>
                                <input 
                                    type="date" 
                                    className={`w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 transition ${
                                        errors.endDate
                                            ? 'border-red-300 bg-red-50/30 focus:ring-red-500'
                                            : 'border-yellow-200 bg-yellow-50/30 focus:ring-yellow-500'
                                    }`}
                                    onChange={e => { setData({ ...data, newEndDate: e.target.value }); setErrors(prev => ({ ...prev, endDate: undefined })); }}
                                    min={currentEndDate}
                                />
                                {errors.endDate ? (
                                    <p className="text-[10px] text-red-600 mt-1 font-medium">{errors.endDate}</p>
                                ) : (
                                    <p className="text-[10px] text-yellow-600 mt-1 font-medium italic">Selecting EXTEND will allow the employee more time to meet objectives.</p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Scheduled Review Dates</label>
                                <div className="space-y-2">
                                    {data.scheduledReviewDates?.map((date, idx) => {
                                        const isPast = new Date(date) < new Date();
                                        return (
                                            <div key={idx} className="flex gap-2">
                                                <input 
                                                    type="date" 
                                                    className={`flex-1 px-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 ${isPast ? 'bg-gray-50 text-gray-400' : ''}`}
                                                    value={date}
                                                    disabled={isPast}
                                                    onChange={e => {
                                                        const newDates = [...(data.scheduledReviewDates || [])];
                                                        newDates[idx] = e.target.value;
                                                        setData({ ...data, scheduledReviewDates: newDates });
                                                    }}
                                                />
                                                {!isPast && (
                                                    <button 
                                                        onClick={() => {
                                                            const newDates = (data.scheduledReviewDates || []).filter((_, i) => i !== idx);
                                                            setData({ ...data, scheduledReviewDates: newDates });
                                                        }}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <button 
                                        type="button"
                                        onClick={() => setData({ ...data, scheduledReviewDates: [...(data.scheduledReviewDates || []), ''] })}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider flex items-center gap-1"
                                    >
                                        + Add Review Date
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Final Comments / Justification</label>
                        <textarea 
                            placeholder="Explain the reasoning behind this decision..." 
                            className={`w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 transition ${
                                errors.comment ? 'border-red-300 focus:ring-red-500' : 'focus:ring-blue-500'
                            }`}
                            rows={4}
                            value={data.comment}
                            onChange={e => { setData({ ...data, comment: e.target.value }); setErrors(prev => ({ ...prev, comment: undefined })); }}
                        />
                        {errors.comment && (
                            <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.comment}</p>
                        )}
                    </div>
                </div>
                
                <div className="p-8 pt-4 flex-shrink-0 border-t border-gray-50">
                    <div className="flex gap-4">
                        <button 
                            onClick={onClose} 
                            className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSubmit} 
                            disabled={isSaving}
                            className={`flex-1 px-4 py-2.5 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                                data.outcome === PipOutcome.FAIL ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-100' : 
                                data.outcome === PipOutcome.EXTEND ? 'bg-yellow-600 hover:bg-yellow-700 shadow-lg shadow-yellow-100' :
                                'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100'
                            } ${isSaving ? 'opacity-70' : ''}`}
                        >
                            {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Finalize'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinalizeModal;
