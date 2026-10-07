import React from 'react';
import { useGetProgressByObjectiveQuery } from '../../services/pipApi';
import { useGetEmployeesQuery } from '../../features/employee/employeeapi';

interface ObjectiveProgressListProps {
    objectiveId: number;
    hideTitle?: boolean;
}

const ObjectiveProgressList: React.FC<ObjectiveProgressListProps> = ({ objectiveId, hideTitle }) => {
    const { data: logsResponse, isLoading: isLogsLoading } = useGetProgressByObjectiveQuery(objectiveId);
    const { data: employees } = useGetEmployeesQuery();
    
    const logs = logsResponse?.data || [];
    const isLoading = isLogsLoading;

    if (logs.length === 0) {
        return (
            <div className="py-4 text-center border-t border-gray-50 mt-2">
                <p className="text-[10px] text-gray-400 italic">No progress logs recorded for this objective.</p>
            </div>
        );
    }

    return (
        <div className="mt-6 space-y-4">
            {!hideTitle && <h5 className="text-[9px] font-black text-[#abb3b7] uppercase tracking-[0.15rem] mb-4">MILESTONE FEEDBACK</h5>}
            <div className="space-y-4">
                {logs.map((log) => (
                    <div key={log.logId} className="flex gap-4 group">
                        <div className="flex flex-col items-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#005db5] mt-1.5 ring-4 ring-blue-50/50"></div>
                            <div className="w-[1px] h-full bg-[#f1f4f6] group-last:hidden mt-1"></div>
                        </div>
                        <div className="flex-1 pb-4">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-[12px] font-black text-[#2b3437]">{log.progressPercent}%</span>
                                <span className="w-1 h-1 rounded-full bg-[#abb3b7]" />
                                <span className="text-[10px] font-bold text-[#abb3b7] uppercase tracking-wider">
                                    Logged by {employees?.find(e => e.id === log.updatedBy)?.staffName || 'Staff'}
                                </span>
                            </div>
                            <p className="text-[13px] text-[#586064] leading-relaxed font-medium">
                                {log.progressNote}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ObjectiveProgressList;
