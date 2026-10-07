import React, { useState } from 'react';
import { X, Search, LayoutTemplate, CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useGetAllLibrariesQuery, useBulkAssignKpiMutation } from '../../services/kpiApi';
import { useActiveCycle } from '../../context/ActiveCycleContext';
import type { BulkAssignmentResponse } from '../../features/kpi/kpiTypes';

interface BulkAssignModalProps {
  selectedEmployeeIds: (number | string)[];
  onClose: () => void;
  onSuccess: () => void;
  effectiveCycleId?: number | null;
}

const BulkAssignModal: React.FC<BulkAssignModalProps> = ({ selectedEmployeeIds, onClose, onSuccess, effectiveCycleId }) => {
  const { activeCycleId, activeCycleName } = useActiveCycle();
  const { data: librariesResponse, isLoading: loadingLibraries } = useGetAllLibrariesQuery();
  const [bulkAssign, { isLoading: isAssigning }] = useBulkAssignKpiMutation();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLibraryId, setSelectedLibraryId] = useState<number | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<BulkAssignmentResponse | null>(null);

  const libraries = librariesResponse?.data || [];
  const filteredLibraries = libraries.filter(lib => 
    lib.isActive && (lib.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    lib.positionName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleConfirm = async () => {
    const targetCycleId = effectiveCycleId || activeCycleId;
    if (!selectedLibraryId || !targetCycleId) return;
    
    try {
      const response = await bulkAssign({
        employeeIds: selectedEmployeeIds,
        libraryId: selectedLibraryId,
        appraisalCycleId: targetCycleId,
        overwriteExisting: overwriteExisting
      }).unwrap();
      
      setAssignmentResult(response.data);
    } catch (err: any) {
      console.error('Bulk assignment failed:', err);
      alert('Failed to assign. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              {assignmentResult ? 'Assignment Report' : 'Bulk Goal Assignment'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              {assignmentResult 
                ? `Processed ${assignmentResult.totalProcessed} employees`
                : `Assigning to ${selectedEmployeeIds.length} selected employees`}
            </p>
          </div>
          <button onClick={assignmentResult ? onSuccess : onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        {assignmentResult ? (
          <div className="p-8 space-y-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Success</p>
                <p className="text-2xl font-black text-green-700">{assignmentResult.successfulCount}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1"><RefreshCw className="w-3 h-3"/> Skipped</p>
                <p className="text-2xl font-black text-amber-700">{assignmentResult.skippedCount}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Failed</p>
                <p className="text-2xl font-black text-red-700">{assignmentResult.failedCount}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Details</h3>
              <div className="space-y-2">
                {assignmentResult.results.map((res, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border text-sm flex justify-between items-center ${
                    res.status === 'SUCCESS' ? 'bg-green-50/50 border-green-100 text-green-900' :
                    res.status === 'SKIPPED' ? 'bg-amber-50/50 border-amber-100 text-amber-900' :
                    'bg-red-50/50 border-red-100 text-red-900'
                  }`}>
                    <div>
                      <span className="font-bold">{res.employeeName}</span> 
                      <span className="text-xs opacity-70 ml-2">({res.status})</span>
                    </div>
                    <span className="text-xs font-medium">{res.reason}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <button 
                onClick={onSuccess}
                className="px-8 py-3 bg-gray-900 text-white text-xs font-black rounded-xl hover:bg-black transition-all shadow-xl uppercase tracking-widest"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-8 flex flex-col flex-1 min-h-0 gap-4">
              {effectiveCycleId !== undefined && effectiveCycleId !== null && effectiveCycleId !== activeCycleId && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="block text-[11px] font-black text-amber-900 uppercase tracking-widest">Historical Cycle Notice</span>
                    <span className="block text-[11px] text-amber-700 mt-0.5 font-bold leading-normal">
                      You are viewing a historical cycle. Assigning will target the current active cycle <strong className="underline font-black">{activeCycleName}</strong> instead.
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-4 flex-shrink-0">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select KPI Template</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search templates by title or position..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingLibraries ? (
              <div className="col-span-2 py-10 flex justify-center italic text-gray-400">Loading templates...</div>
            ) : filteredLibraries.length === 0 ? (
              <div className="col-span-2 py-10 flex justify-center italic text-gray-400">No templates found</div>
            ) : (
              filteredLibraries.map(lib => (
                <div 
                  key={lib.id}
                  onClick={() => setSelectedLibraryId(lib.id)}
                  className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer group ${
                    selectedLibraryId === lib.id 
                    ? 'border-blue-600 bg-blue-50/30' 
                    : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2 py-0.5 bg-gray-100 text-[8px] font-black text-gray-500 rounded uppercase tracking-widest group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      {lib.positionName}
                    </span>
                    {selectedLibraryId === lib.id && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 leading-snug">{lib.title}</h4>
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <LayoutTemplate className="w-3 h-3" />
                    {lib.details?.length || 0} KPI Items
                  </div>
                </div>
              ))
            )}
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex-shrink-0">
            <input 
              type="checkbox" 
              id="overwriteExisting"
              className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500/20 cursor-pointer"
              checked={overwriteExisting}
              onChange={(e) => setOverwriteExisting(e.target.checked)}
            />
            <label htmlFor="overwriteExisting" className="flex-1 cursor-pointer">
              <span className="block text-[11px] font-black text-amber-900 uppercase tracking-widest">Overwrite Existing Goals</span>
              <span className="block text-[10px] font-bold text-amber-600 mt-0.5">If checked, existing draft goals for these employees will be replaced.</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!selectedLibraryId || isAssigning}
            className="px-8 py-3 bg-gray-900 text-white text-xs font-black rounded-xl hover:bg-black disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-all shadow-xl uppercase tracking-widest flex items-center gap-2"
          >
            {isAssigning && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Assignment
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default BulkAssignModal;
