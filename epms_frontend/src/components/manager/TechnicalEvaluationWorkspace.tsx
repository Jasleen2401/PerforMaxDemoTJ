import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Users, Layers, AlertCircle, RefreshCw } from 'lucide-react';
import { useGetMentorAssignedEvaluationsQuery } from '../../features/manager/managerApi';
import { CycleSelectorHeader } from './CycleSelectorHeader';
import { AssignedCandidateQueue } from './AssignedCandidateQueue';
import { TechnicalEvaluationSheet } from './TechnicalEvaluationSheet';

export const TechnicalEvaluationWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCycleId = searchParams.get('cycle_id') || undefined;

  const [selectedCycleId, setSelectedCycleId] = useState<string | undefined>(urlCycleId);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [isSheetDirty, setIsSheetDirty] = useState(false);

  const { data, isLoading, isError, error, refetch } = useGetMentorAssignedEvaluationsQuery(
    selectedCycleId ? { cycle_id: selectedCycleId } : undefined
  );

  // Sync selectedCycleId from data when single active cycle is resolved
  useEffect(() => {
    if (data?.selected_cycle?.id && !selectedCycleId) {
      setSelectedCycleId(data.selected_cycle.id);
    }
  }, [data, selectedCycleId]);

  // Auto-select first participant if none currently selected
  useEffect(() => {
    if (data?.assigned_evaluations && data.assigned_evaluations.length > 0) {
      if (!selectedParticipantId || !data.assigned_evaluations.some(c => c.participant_id === selectedParticipantId)) {
        setSelectedParticipantId(data.assigned_evaluations[0].participant_id);
      }
    } else {
      setSelectedParticipantId(null);
    }
  }, [data, selectedParticipantId]);

  const handleSelectCycle = (cycleId: string) => {
    if (isSheetDirty) {
      const confirmSwitch = window.confirm(
        'You have unsaved changes in your current evaluation. Switching cycles will discard unsaved progress. Continue?'
      );
      if (!confirmSwitch) return;
    }
    setSelectedCycleId(cycleId);
    setSelectedParticipantId(null);
    setIsSheetDirty(false);

    // Update query params
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('cycle_id', cycleId);
      return next;
    });
  };

  const handleSelectParticipant = (participantId: string) => {
    setSelectedParticipantId(participantId);
    setIsSheetDirty(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Context Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 shrink-0">
            <Sparkles size={22} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Technical Appraisal Evaluation Workspace
            </h2>
            <p className="text-xs text-slate-500">
              Score assigned interns and mentees against active cycle technical competencies with benchmark targets and evidence.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer self-start md:self-auto active:scale-95"
        >
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Cycle Selector Header */}
      <CycleSelectorHeader
        selectedCycle={data?.selected_cycle ?? null}
        eligibleCycles={data?.eligible_cycles ?? []}
        requiresSelection={data?.requires_cycle_selection ?? false}
        onSelectCycle={handleSelectCycle}
        isLoading={isLoading}
      />

      {/* Error State */}
      {isError && (
        <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-2">
          <AlertCircle size={28} className="mx-auto text-rose-500" />
          <h4 className="text-sm font-bold text-slate-900">Failed to Load Assigned Evaluations</h4>
          <p className="text-xs text-slate-500">
            {(error as any)?.data?.error || (error as any)?.data?.detail || 'Unable to retrieve assigned evaluations.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Workspace Layout (Candidate Queue + Evaluation Sheet) */}
      {!isLoading && !isError && data?.selected_cycle && (
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Left Column: Assigned Candidate Queue (Fixed width on desktop) */}
          <div className="w-full lg:w-84 xl:w-96 shrink-0">
            <AssignedCandidateQueue
              assignedEvaluations={data.assigned_evaluations}
              selectedParticipantId={selectedParticipantId}
              onSelectParticipant={handleSelectParticipant}
              isFormDirty={isSheetDirty}
            />
          </div>

          {/* Right Column: Technical Evaluation Sheet (Flexible width) */}
          <div className="flex-1 w-full min-w-0">
            {selectedParticipantId ? (
              <TechnicalEvaluationSheet
                key={selectedParticipantId}
                participantId={selectedParticipantId}
                cycleId={data.selected_cycle.id}
                onSaved={() => refetch()}
                onDirtyChange={setIsSheetDirty}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-2">
                <Users size={32} className="mx-auto text-slate-300" />
                <h4 className="font-bold text-sm text-slate-700">No Candidate Selected</h4>
                <p className="text-xs text-slate-400">
                  Select an assigned mentee from the queue to start their technical appraisal.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
