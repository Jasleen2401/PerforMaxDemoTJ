import React, { useState } from 'react';
import { 
  X, 
  History, 
  Calendar, 
  CheckCircle2, 
  Archive,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Trash2
} from 'lucide-react';
import { useGetLibraryHistoryQuery, useToggleHistoryStatusMutation, useDeleteLibraryMutation } from '../../services/kpiApi';
import LibraryKpiTable from './LibraryKpiTable';
import { formatRelativeTime } from '../../utils/timeUtils';

interface KpiLibraryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  positionId: number;
  positionName: string;
}

const KpiLibraryHistoryModal: React.FC<KpiLibraryHistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  positionId,
  positionName 
}) => {
  const { data: historyResponse, isLoading } = useGetLibraryHistoryQuery(positionId, {
    skip: !isOpen
  });
  const [toggleHistoryStatus, { isLoading: isToggling }] = useToggleHistoryStatusMutation();
  const [deleteLibrary, { isLoading: isDeleting }] = useDeleteLibraryMutation();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleToggleStatus = async (id: number, currentActive: boolean) => {
    try {
      await toggleHistoryStatus({ id, active: !currentActive }).unwrap();
    } catch (error) {
      console.error('Failed to toggle library status:', error);
    }
  };

  const handleDeleteLibrary = async (id: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this KPI Library template version? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteLibrary(id).unwrap();
      if (expandedId === id) {
        setExpandedId(null);
      }
    } catch (error) {
      console.error('Failed to delete library:', error);
      alert('Failed to delete library. Please try again.');
    }
  };

  if (!isOpen) return null;

  const history = historyResponse?.data || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300 flex flex-col">
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Library History</h2>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-1">
                {positionName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200/50 rounded-xl transition-colors text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-gray-300">
                <History className="w-8 h-8" />
              </div>
              <p className="text-gray-500 font-bold">No history records found for this position.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((lib, index) => (
                <div 
                  key={lib.id}
                  className={`
                    border rounded-2xl transition-all duration-300 overflow-hidden
                    ${expandedId === lib.id ? 'border-blue-200 ring-4 ring-blue-50 shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white'}
                  `}
                >
                  {/* Version Header */}
                  <div 
                    onClick={() => setExpandedId(expandedId === lib.id ? null : lib.id)}
                    className="p-5 flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`
                        p-2.5 rounded-xl transition-colors
                        ${lib.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'}
                      `}>
                        {lib.isActive ? <CheckCircle2 className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-black text-gray-900">{lib.title}</h3>
                          {lib.isActive && (
                            <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded">
                              Current Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-[11px] font-bold text-gray-400">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatRelativeTime(lib.updatedAt) || 'Unknown Date'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            {lib.details?.length || 0} KPIs
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(lib.id || 0, lib.isActive || false);
                        }}
                        disabled={isToggling}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shadow-sm active:scale-95 disabled:opacity-50 ${
                          lib.isActive 
                            ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100' 
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                        }`}
                      >
                        {lib.isActive ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLibrary(lib.id || 0);
                        }}
                        disabled={isDeleting}
                        className="p-2 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center"
                        title="Delete Template"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>

                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mr-2">
                        {expandedId === lib.id ? 'Hide Details' : 'View Details'}
                      </p>
                      {expandedId === lib.id ? (
                        <ChevronUp className="w-5 h-5 text-blue-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-300 group-hover:text-gray-500" />
                      )}
                    </div>
                  </div>

                  {/* Version Details */}
                  {expandedId === lib.id && (
                    <div className="border-t border-gray-100 bg-gray-50/30 p-6 animate-in slide-in-from-top-2 duration-300">
                      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                        <LibraryKpiTable
                          details={lib.details || []}
                          isReadOnly={true}
                        />
                      </div>
                      <div className="mt-4 flex justify-end">
                         <p className="text-[10px] text-gray-400 italic">
                            * Historical records are read-only and preserved for audit purposes.
                         </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-black shadow-lg hover:bg-black transition-all active:scale-95"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};

export default KpiLibraryHistoryModal;
