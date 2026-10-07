import React, { useState, useEffect } from 'react';
import type { PipObjectiveRequest } from '../../features/pip/types';

interface ObjectiveModalProps {
    pipStartDate?: string;
    initialData?: {
        title: string;
        description: string;
        successCriteria: string;
        targetDate: string;
    };
    onClose: () => void;
    onSave: (data: Omit<PipObjectiveRequest, 'pipId'>) => Promise<void>;
}

const ObjectiveModal: React.FC<ObjectiveModalProps> = ({ pipStartDate, initialData, onClose, onSave }) => {
    const [data, setData] = useState({ 
        title: '', 
        description: '', 
        successCriteria: '', 
        targetDate: '' 
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialData) {
            setData(initialData);
        }
    }, [initialData]);

    const handleSubmit = async () => {
        if (!data.title) {
            alert("Objective Title is required");
            return;
        }
        if (!initialData && !data.targetDate) {
            alert("Target Completion Date is required");
            return;
        }
        setIsSaving(true);
        try {
            await onSave(data);
        } catch (err: any) {
            alert("Failed to save objective. Check permissions.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#2b3437]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#ffffff] rounded-2xl overflow-hidden ring-1 ring-[#abb3b7]/15 shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
                <div className="bg-[#e3e9ec] px-8 py-4 border-b border-[#005db5]/5">
                    <h3 className="text-[10px] font-black text-[#2b3437] uppercase tracking-[0.1rem]">
                        {initialData ? 'EDIT OBJECTIVE' : 'ADD NEW OBJECTIVE'}
                    </h3>
                </div>
                <div className="p-8 space-y-6">
                    <div>
                        <label className="text-[9px] font-black text-[#abb3b7] uppercase tracking-widest mb-2 block">OBJECTIVE TITLE</label>
                        <input 
                            value={data.title}
                            placeholder="e.g., Improve Code Quality" 
                            className="w-full bg-[#f1f4f6] rounded-xl px-4 py-3.5 text-[13px] text-[#2b3437] font-bold outline-none border-2 border-transparent focus:border-[#005db5]/10 transition-all" 
                            onChange={e => setData({ ...data, title: e.target.value })} 
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-[#abb3b7] uppercase tracking-widest mb-2 block">DESCRIPTION</label>
                        <textarea 
                            value={data.description}
                            placeholder="What needs to be achieved?" 
                            className="w-full bg-[#f1f4f6] rounded-xl px-4 py-3.5 text-[13px] text-[#2b3437] outline-none min-h-[80px] resize-none border-2 border-transparent focus:border-[#005db5]/10 transition-all" 
                            onChange={e => setData({ ...data, description: e.target.value })} 
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-[#abb3b7] uppercase tracking-widest mb-2 block">SUCCESS CRITERIA (KPI)</label>
                        <textarea 
                            value={data.successCriteria}
                            placeholder="How will we measure success?" 
                            className="w-full bg-[#f1f4f6] rounded-xl px-4 py-3.5 text-[13px] text-[#2b3437] outline-none min-h-[80px] resize-none border-2 border-transparent focus:border-[#005db5]/10 transition-all" 
                            onChange={e => setData({ ...data, successCriteria: e.target.value })} 
                        />
                    </div>
                    {!initialData && (
                        <div>
                            <label className="text-[9px] font-black text-[#abb3b7] uppercase tracking-widest mb-2 block">TARGET COMPLETION DATE</label>
                            <input 
                                type="date" 
                                min={pipStartDate?.split('T')[0]}
                                className="w-full bg-[#f1f4f6] rounded-xl px-4 py-3.5 text-[13px] text-[#2b3437] font-bold outline-none border-2 border-transparent focus:border-[#005db5]/10 transition-all" 
                                onChange={e => setData({ ...data, targetDate: e.target.value })} 
                            />
                        </div>
                    )}
                    <div className="flex gap-4 pt-4">
                        <button 
                            onClick={onClose} 
                            className="flex-1 px-4 py-3.5 bg-[#f1f4f6] text-[#586064] rounded-xl text-[10px] font-black uppercase tracking-[0.15rem] hover:bg-[#e3e9ec] transition-all"
                        >
                            CANCEL
                        </button>
                        <button 
                            onClick={handleSubmit} 
                            disabled={isSaving}
                            className={`flex-1 px-4 py-3.5 bg-[#005db5] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15rem] hover:bg-[#0052a0] transition-all shadow-sm flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isSaving ? 'SAVING...' : 'SAVE OBJECTIVE'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ObjectiveModal;
