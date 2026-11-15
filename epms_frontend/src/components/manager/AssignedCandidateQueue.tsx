import React, { useState, useMemo } from 'react';
import { Search, UserCheck, Clock, CheckCircle2, AlertTriangle, ChevronRight, ShieldAlert } from 'lucide-react';
import type { AssignedEvaluationItem } from '../../features/manager/managerApi';

interface AssignedCandidateQueueProps {
  assignedEvaluations: AssignedEvaluationItem[];
  selectedParticipantId: string | null;
  onSelectParticipant: (participantId: string) => void;
  isFormDirty?: boolean;
}

export const AssignedCandidateQueue: React.FC<AssignedCandidateQueueProps> = ({
  assignedEvaluations,
  selectedParticipantId,
  onSelectParticipant,
  isFormDirty = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED'>('ALL');

  const filteredCandidates = useMemo(() => {
    return assignedEvaluations.filter((cand) => {
      const matchesSearch =
        cand.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cand.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cand.department.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || cand.progress.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [assignedEvaluations, searchTerm, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: assignedEvaluations.length,
      notStarted: assignedEvaluations.filter((c) => c.progress.status === 'NOT_STARTED').length,
      inProgress: assignedEvaluations.filter((c) => c.progress.status === 'IN_PROGRESS').length,
      submitted: assignedEvaluations.filter((c) => c.progress.status === 'SUBMITTED').length,
    };
  }, [assignedEvaluations]);

  const handleCandidateClick = (participantId: string) => {
    if (participantId === selectedParticipantId) return;

    if (isFormDirty) {
      const confirmSwitch = window.confirm(
        'You have unsaved evaluation changes for this candidate. Are you sure you want to discard them and switch to another candidate?'
      );
      if (!confirmSwitch) return;
    }

    onSelectParticipant(participantId);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col h-full space-y-4">
      {/* Header & Count */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900">Assigned Candidates</h3>
          <p className="text-[11px] text-slate-500">Mentees assigned for technical appraisal</p>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold">
          {assignedEvaluations.length}
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, code, dept..."
          className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-300 transition-all"
        />
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl text-[10px] font-bold text-slate-600">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`py-1 rounded-lg text-center transition-all cursor-pointer ${
            statusFilter === 'ALL' ? 'bg-white text-purple-700 shadow-2xs font-extrabold' : 'hover:text-slate-900'
          }`}
        >
          All ({counts.all})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('NOT_STARTED')}
          className={`py-1 rounded-lg text-center transition-all cursor-pointer ${
            statusFilter === 'NOT_STARTED' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'hover:text-slate-900'
          }`}
        >
          Todo ({counts.notStarted})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`py-1 rounded-lg text-center transition-all cursor-pointer ${
            statusFilter === 'IN_PROGRESS' ? 'bg-white text-amber-700 shadow-2xs font-extrabold' : 'hover:text-slate-900'
          }`}
        >
          Draft ({counts.inProgress})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('SUBMITTED')}
          className={`py-1 rounded-lg text-center transition-all cursor-pointer ${
            statusFilter === 'SUBMITTED' ? 'bg-white text-emerald-700 shadow-2xs font-extrabold' : 'hover:text-slate-900'
          }`}
        >
          Done ({counts.submitted})
        </button>
      </div>

      {/* Candidates List */}
      <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-340px)] pr-1">
        {filteredCandidates.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            No candidates match the selected filters.
          </div>
        ) : (
          filteredCandidates.map((cand) => {
            const isSelected = cand.participant_id === selectedParticipantId;
            const status = cand.progress.status;

            return (
              <div
                key={cand.participant_id}
                onClick={() => handleCandidateClick(cand.participant_id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'bg-purple-50/70 border-purple-300 shadow-2xs'
                    : 'bg-white hover:bg-slate-50/80 border-slate-200/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-xs text-slate-900 truncate">{cand.full_name}</h4>
                      {cand.is_mandatory && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                          Mandatory
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {cand.employee_code} &bull; {cand.department || 'General'}
                    </p>
                  </div>

                  {/* Status Pill */}
                  <div className="shrink-0">
                    {status === 'SUBMITTED' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 flex items-center gap-1">
                        <CheckCircle2 size={10} />
                        Done
                      </span>
                    )}
                    {status === 'IN_PROGRESS' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100 flex items-center gap-1">
                        <Clock size={10} />
                        Draft
                      </span>
                    )}
                    {status === 'NOT_STARTED' && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Telemetry */}
                <div className="mt-2.5 pt-2 border-t border-slate-100/80 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-medium">Scored Competencies</span>
                    <span className="font-bold text-slate-700">
                      {cand.progress.scored_competencies} / {cand.progress.total_competencies}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        status === 'SUBMITTED'
                          ? 'bg-emerald-500'
                          : cand.progress.scored_competencies > 0
                          ? 'bg-purple-600'
                          : 'bg-transparent'
                      }`}
                      style={{
                        width:
                          cand.progress.total_competencies > 0
                            ? `${(cand.progress.scored_competencies / cand.progress.total_competencies) * 100}%`
                            : '0%',
                      }}
                    />
                  </div>

                  {cand.progress.has_configuration_error && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold pt-0.5">
                      <AlertTriangle size={11} />
                      <span>No competencies configured</span>
                    </div>
                  )}
                </div>

                <ChevronRight
                  size={14}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 transition-opacity ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                  }`}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
