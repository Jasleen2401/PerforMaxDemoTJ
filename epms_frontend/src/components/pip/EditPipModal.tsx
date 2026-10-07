import React, { useState, useEffect } from 'react';
import type { PipUpdateRequest } from '../../features/pip/types';
import type { EmployeeResponse } from '../../features/employee/employeeTypes';

interface EditPipModalProps {
    initialData: PipUpdateRequest;
    employees: EmployeeResponse[];
    targetDepartmentId?: number;
    onClose: () => void;
    onSave: (data: PipUpdateRequest) => Promise<void>;
}

const EditPipModal: React.FC<EditPipModalProps> = ({ initialData, employees, targetDepartmentId, onClose, onSave }) => {
    const [data, setData] = useState<PipUpdateRequest>(initialData);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    const managers = employees.filter(emp =>
        (emp.roles?.some(role => role === 'MANAGER' || role === 'HR')) &&
        (!targetDepartmentId || emp.currentDepartmentId === targetDepartmentId)
    );

    const handleSubmit = async () => {
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
                <h3 className="text-2xl font-bold mb-6">Edit PIP Details</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Manager</label>
                        <select
                            value={data.managerId}
                            className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition"
                            onChange={e => setData({ ...data, managerId: parseInt(e.target.value) })}
                        >
                            {managers.map(m => (
                                <option key={m.id} value={m.id}>{m.staffName}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Reason for Plan</label>
                        <textarea
                            value={data.reason}
                            placeholder="Why is this plan needed?"
                            className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition h-32"
                            onChange={e => setData({ ...data, reason: e.target.value })}
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
                            {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditPipModal;
