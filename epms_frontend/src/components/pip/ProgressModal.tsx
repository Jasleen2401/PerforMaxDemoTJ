import React, { useState } from 'react';
import type { PipProgressRequest } from '../../features/pip/types';

interface ProgressModalProps {
    onClose: () => void;
    onSave: (data: Omit<PipProgressRequest, 'objectiveId'>) => Promise<void>;
    initialProgress?: number;
}

const ProgressModal: React.FC<ProgressModalProps> = ({ onClose, onSave, initialProgress = 0 }) => {
    const [data, setData] = useState({ progressNote: '', progressPercent: initialProgress });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async () => {
        if (!data.progressNote) return;
        setIsSaving(true);
        try {
            await onSave(data);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
                <h3 className="text-2xl font-bold mb-6">Log Progress</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Progress Note</label>
                        <textarea 
                            placeholder="Describe what you've achieved since the last update..." 
                            className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition" 
                            rows={4}
                            onChange={e => setData({ ...data, progressNote: e.target.value })} 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Completion Percentage ({data.progressPercent}%)</label>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={data.progressPercent}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                            onChange={e => setData({ ...data, progressPercent: parseInt(e.target.value) })} 
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button 
                            onClick={onClose} 
                            className="flex-1 px-4 py-2 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSubmit} 
                            disabled={isSaving}
                            className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 ${isSaving ? 'opacity-70' : ''}`}
                        >
                            {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Submit Progress'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProgressModal;
