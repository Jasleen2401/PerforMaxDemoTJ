import React, { useState } from 'react';
import type { PipReviewRequest } from '../../features/pip/types';

interface ReviewModalProps {
    onClose: () => void;
    onSave: (data: Omit<PipReviewRequest, 'pipId'>) => Promise<void>;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ onClose, onSave }) => {
    const [data, setData] = useState({ 
        reviewDate: new Date().toISOString().split('T')[0], 
        progressSummary: '', 
        managerFeedback: '', 
        nextAction: '' 
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async () => {
        if (!data.managerFeedback || !data.nextAction) return;
        setIsSaving(true);
        try {
            await onSave(data);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in duration-200">
                <h3 className="text-2xl font-bold mb-6">Submit Progress Review</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Review Date</label>
                        <input 
                            type="date" 
                            value={data.reviewDate} 
                            className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition" 
                            onChange={e => setData({ ...data, reviewDate: e.target.value })} 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Progress Summary</label>
                        <textarea 
                            placeholder="Summary of employee's progress since last review..." 
                            className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition" 
                            rows={3}
                            onChange={e => setData({ ...data, progressSummary: e.target.value })} 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Manager Feedback</label>
                        <textarea 
                            placeholder="Provide constructive feedback..." 
                            className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition" 
                            rows={3}
                            onChange={e => setData({ ...data, managerFeedback: e.target.value })} 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Next Actions</label>
                        <textarea 
                            placeholder="What are the next steps for the employee?" 
                            className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition" 
                            rows={2}
                            onChange={e => setData({ ...data, nextAction: e.target.value })} 
                        />
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
                            {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Save Review'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewModal;
